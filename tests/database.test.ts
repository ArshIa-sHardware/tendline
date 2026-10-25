import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { freshState } from '../src/lib/model';
const alice = '11111111-1111-4111-8111-111111111111',
  bob = '22222222-2222-4222-8222-222222222222';
let db: PGlite;
async function asUser(id: string) {
  await db.exec(
    `reset role; set role authenticated; select set_config('request.jwt.claim.sub', '${id}', false);`,
  );
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema public, auth to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
    insert into auth.users values ('${alice}'), ('${bob}');`);
  await db.exec(
    readFileSync(
      new URL('../supabase/migrations/202610250001_notebooks.sql', import.meta.url),
      'utf8',
    ),
  );
});
afterAll(async () => {
  await db.close();
});
describe.sequential('real PostgreSQL row-level policies (PGlite)', () => {
  it('lets an owner create and read one private notebook', async () => {
    await asUser(alice);
    const created = await db.query(
      'insert into public.notebooks(owner_id, content) values ($1,$2) returning *',
      [alice, freshState()],
    );
    expect(created.rows).toHaveLength(1);
    expect((await db.query('select * from notebooks')).rows).toHaveLength(1);
  });
  it('does not expose Alice’s notebook to Bob', async () => {
    await asUser(bob);
    expect((await db.query('select * from notebooks')).rows).toHaveLength(0);
  });
  it('prevents creating a notebook for someone else', async () => {
    await asUser(bob);
    await expect(
      db.query('insert into notebooks(owner_id, content) values ($1,$2)', [alice, freshState()]),
    ).rejects.toThrow(/row-level security/);
  });
  it('prevents cross-account updates and deletes even with a known owner id', async () => {
    await asUser(bob);
    expect(
      (
        await db.query('update notebooks set content=$1 where owner_id=$2 returning id', [
          freshState(),
          alice,
        ])
      ).rows,
    ).toHaveLength(0);
    expect(
      (await db.query('delete from notebooks where owner_id=$1 returning id', [alice])).rows,
    ).toHaveLength(0);
  });
  it('prohibits owner changes and client-supplied revisions', async () => {
    await asUser(alice);
    await expect(db.query('update notebooks set owner_id=$1', [bob])).rejects.toThrow(
      /permission denied/,
    );
    await expect(db.query('update notebooks set revision=42')).rejects.toThrow(/permission denied/);
  });
  it('increments revisions and rejects a stale compare-and-swap', async () => {
    await asUser(alice);
    const n = { ...freshState(), questions: 'Updated on device A' };
    const result = await db.query<{ revision: number }>(
      'update notebooks set content=$1 where revision=0 returning revision',
      [n],
    );
    expect(Number(result.rows[0].revision)).toBe(1);
    expect(
      (
        await db.query('update notebooks set content=$1 where revision=0 returning id', [
          freshState(),
        ])
      ).rows,
    ).toHaveLength(0);
  });
  it('rejects accidental example persistence and malformed cloud documents', async () => {
    await asUser(alice);
    await expect(
      db.query('update notebooks set content=$1', [{ ...freshState(), example: true }]),
    ).rejects.toThrow(/check constraint/);
    await expect(db.query('update notebooks set content=$1', [{}])).rejects.toThrow(
      /check constraint/,
    );
  });
  it('does not permit anonymous access', async () => {
    await db.exec('reset role; set role anon;');
    await expect(db.query('select * from notebooks')).rejects.toThrow(/permission denied/);
    await expect(
      db.query('insert into notebooks(owner_id, content) values ($1,$2)', [bob, freshState()]),
    ).rejects.toThrow(/permission denied/);
  });
  it('keeps a second owner’s notebook after the first deletes their own', async () => {
    await asUser(bob);
    await db.query('insert into notebooks(owner_id, content) values ($1,$2)', [bob, freshState()]);
    await asUser(alice);
    expect((await db.query('delete from notebooks returning id')).rows).toHaveLength(1);
    await asUser(bob);
    expect((await db.query('select * from notebooks')).rows).toHaveLength(1);
  });
});
