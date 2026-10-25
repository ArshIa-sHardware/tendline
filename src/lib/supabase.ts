import { createClient } from '@supabase/supabase-js';
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY) as string | undefined;
// Never accept a secret/service-role key, even through a misconfigured VITE variable.
function publicKey(value: string) {
  if (value.startsWith('sb_publishable_')) return true;
  try {
    return JSON.parse(atob(value.split('.')[1])).role === 'anon';
  } catch {
    return false;
  }
}
export const configured = Boolean(url && /^https?:\/\//.test(url) && key && publicKey(key));
export const supabase = configured
  ? createClient(url!, key!, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'implicit',
      },
    })
  : null;
export const authRedirect = (reset = false) =>
  `${window.location.origin}/${reset ? '?reset=1' : ''}`;
