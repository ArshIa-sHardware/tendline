-- One notebook per account. Care-partner perspectives are entries, not permissions.
-- Apply once using the Supabase SQL editor or `supabase db push`.
begin;
create table public.notebooks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references auth.users(id) on delete cascade,
  content jsonb not null,
  revision bigint not null default 0 check (revision >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notebook_content_shape check (
    jsonb_typeof(content) = 'object'
    and content @> '{"v":1,"example":false}'::jsonb
    and jsonb_typeof(content->'entries') = 'array'
    and jsonb_typeof(content->'names') = 'object'
    and jsonb_typeof(content->'show') = 'object'
    and content ?& array['v', 'example', 'entries', 'names', 'show']
    and octet_length(content::text) <= 12582912
  )
);

alter table public.notebooks enable row level security;
alter table public.notebooks force row level security;
revoke all on public.notebooks from public, anon, authenticated;
grant select, delete on public.notebooks to authenticated;
grant insert (owner_id, content) on public.notebooks to authenticated;
grant update (content) on public.notebooks to authenticated;

create policy "Owners read their notebook" on public.notebooks for select to authenticated
  using ((select auth.uid()) = owner_id);
create policy "Owners create their notebook" on public.notebooks for insert to authenticated
  with check ((select auth.uid()) = owner_id);
create policy "Owners update their notebook" on public.notebooks for update to authenticated
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "Owners delete their notebook" on public.notebooks for delete to authenticated
  using ((select auth.uid()) = owner_id);

-- Version and timestamps cannot be assigned by clients. A stale revision in the
-- client's UPDATE predicate produces zero rows instead of overwriting new data.
create function public.bump_notebook_revision() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.owner_id is distinct from old.owner_id or new.id is distinct from old.id then
    raise exception 'Notebook ownership is immutable';
  end if;
  new.revision := old.revision + 1;
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function public.bump_notebook_revision() from public, anon, authenticated;
create trigger notebook_revision before update on public.notebooks
for each row execute function public.bump_notebook_revision();
commit;
