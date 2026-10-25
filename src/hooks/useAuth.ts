import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [recovery, setRecovery] = useState(
    new URLSearchParams(location.search).get('reset') === '1' ||
      new URLSearchParams(location.hash.slice(1)).get('type') === 'recovery',
  );
  const [error, setError] = useState(
    new URLSearchParams(location.hash.slice(1)).get('error_description') || '',
  );
  useEffect(() => {
    if (!supabase) return;
    let active = true,
      eventReceived = false;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, next) => {
      if (!active) return;
      eventReceived = true;
      setSession(next);
      setLoading(false);
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
    });
    void supabase.auth
      .getSession()
      .then(({ data, error: authError }) => {
        if (!active) return;
        if (authError) setError(authError.message);
        if (!eventReceived) {
          setSession(data.session);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setError('Could not restore your session. Please sign in again.');
          setLoading(false);
        }
      });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);
  function finishRecovery() {
    setRecovery(false);
    history.replaceState({}, '', '/');
  }
  return { session, loading, recovery, error, finishRecovery };
}
