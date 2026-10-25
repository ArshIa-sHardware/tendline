import { z } from 'zod';
import { supabase } from './supabase';
import { freshState, notebookSchema, type Notebook } from './model';
export const recordSchema = z.object({
  id: z.string().uuid(),
  owner_id: z.string().uuid(),
  revision: z.number().int().nonnegative(),
  content: notebookSchema,
  updated_at: z.string(),
});
export type NotebookRecord = z.infer<typeof recordSchema>;
export class ConflictError extends Error {
  constructor() {
    super(
      'This notebook changed on another device. Download your pending notes, then load the latest cloud copy.',
    );
  }
}
const client = () => {
  if (!supabase) throw new Error('Connect your Supabase project first.');
  return supabase;
};
export async function loadNotebook(owner: string): Promise<NotebookRecord> {
  const { data, error } = await client()
    .from('notebooks')
    .select('*')
    .eq('owner_id', owner)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (data) return recordSchema.parse(data);
  const created = await client()
    .from('notebooks')
    .insert({ owner_id: owner, content: freshState() })
    .select()
    .single();
  // Another tab may have created this account's notebook at the same moment.
  if (created.error?.code === '23505') return loadNotebook(owner);
  if (created.error) throw new Error(created.error.message);
  return recordSchema.parse(created.data);
}
export async function saveNotebook(
  record: NotebookRecord,
  content: Notebook,
): Promise<NotebookRecord> {
  const clean = notebookSchema.parse({ ...content, example: false });
  const { data, error } = await client()
    .from('notebooks')
    .update({ content: clean })
    .eq('id', record.id)
    .eq('owner_id', record.owner_id)
    .eq('revision', record.revision)
    .select()
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new ConflictError();
  return recordSchema.parse(data);
}
const cacheKey = (owner: string) => `bedside-cloud-v4:${owner}`;
const preferenceKey = (owner: string) => `bedside-offline-enabled:${owner}`;
export const offlineEnabled = (owner: string) => {
  try {
    return localStorage.getItem(preferenceKey(owner)) === 'yes';
  } catch {
    return false;
  }
};
export function setOfflineEnabled(owner: string, enabled: boolean) {
  if (enabled) localStorage.setItem(preferenceKey(owner), 'yes');
  else {
    localStorage.removeItem(preferenceKey(owner));
    localStorage.removeItem(cacheKey(owner));
  }
}
export function cacheRecord(record: NotebookRecord, pending: boolean): boolean {
  if (!offlineEnabled(record.owner_id)) return false;
  try {
    localStorage.setItem(cacheKey(record.owner_id), JSON.stringify({ record, pending }));
    return true;
  } catch {
    return false;
  }
}
export function readCache(owner: string): { record: NotebookRecord; pending: boolean } | null {
  try {
    if (!offlineEnabled(owner)) return null;
    const parsed = z
      .object({ record: recordSchema, pending: z.boolean() })
      .parse(JSON.parse(localStorage.getItem(cacheKey(owner)) || 'null'));
    return parsed.record.owner_id === owner ? parsed : null;
  } catch {
    return null;
  }
}
export function clearCache(owner: string) {
  localStorage.removeItem(cacheKey(owner));
  localStorage.removeItem(preferenceKey(owner));
}
