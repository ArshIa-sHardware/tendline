import { useCallback, useEffect, useRef, useState } from 'react';
import { exampleState } from '../lib/example';
import type { Notebook } from '../lib/model';
import {
  cacheRecord,
  ConflictError,
  loadNotebook,
  offlineEnabled,
  readCache,
  saveNotebook,
  setOfflineEnabled,
  type NotebookRecord,
} from '../lib/repository';
export function useNotebook(owner: string | null) {
  const [record, setRecord] = useState<NotebookRecord | null>(null);
  const [demo, setDemo] = useState<Notebook>(() => exampleState());
  const [loading, setLoading] = useState(Boolean(owner));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [cached, setCached] = useState(false);
  const [offline, setOffline] = useState(() => (owner ? offlineEnabled(owner) : false));
  const [online, setOnline] = useState(navigator.onLine);
  const latest = useRef(record);
  latest.current = record;
  const pendingRef = useRef(pending);
  pendingRef.current = pending;
  const lock = useRef(false);
  const alive = useRef(true);
  const [conflict, setConflict] = useState(false);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const accept = useCallback((next: NotebookRecord, dirty: boolean) => {
    if (!alive.current) return;
    latest.current = next;
    pendingRef.current = dirty;
    setRecord(next);
    setPending(dirty);
    setCached(cacheRecord(next, dirty));
  }, []);
  const reload = useCallback(async () => {
    if (!owner || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      const next = await loadNotebook(owner);
      accept(next, false);
      setConflict(false);
    } catch (e) {
      if (alive.current) setError(e instanceof Error ? e.message : 'Could not load the notebook.');
    } finally {
      lock.current = false;
      if (alive.current) {
        setBusy(false);
        setLoading(false);
      }
    }
  }, [owner, accept]);
  useEffect(() => {
    if (!owner) return;
    const local = readCache(owner);
    if (local) {
      accept(local.record, local.pending);
      setLoading(false);
    }
    if (local?.pending) {
      setError('This device has changes waiting to sync.');
      return;
    }
    void reload();
  }, [owner, accept, reload]);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  const commit = useCallback(
    async (content: Notebook): Promise<boolean> => {
      if (!owner) {
        setDemo(content);
        return true;
      }
      if (!latest.current || lock.current || conflict) return false;
      lock.current = true;
      setBusy(true);
      setError('');
      const next = { ...latest.current, content };
      try {
        // Queue before the request so a connection failure never masquerades as a cloud save.
        accept(next, true);
        if (!navigator.onLine) {
          setError('Offline. Changes are waiting to sync.');
          return true;
        }
        const saved = await saveNotebook(next, content);
        accept(saved, false);
        return true;
      } catch (e) {
        if (alive.current) {
          setError(e instanceof Error ? e.message : 'Could not save.');
          setConflict(e instanceof ConflictError);
        }
        return true; // The proposed content is retained, with an explicit pending/error state.
      } finally {
        lock.current = false;
        if (alive.current) setBusy(false);
      }
    },
    [owner, accept, conflict],
  );
  const sync = useCallback(async () => {
    if (latest.current && pendingRef.current) await commit(latest.current.content);
    else await reload();
  }, [commit, reload]);
  useEffect(() => {
    const guard = (e: BeforeUnloadEvent) => {
      if (pendingRef.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, []);
  function toggleOffline(enabled: boolean) {
    if (!owner) return;
    try {
      setOfflineEnabled(owner, enabled);
      setOffline(enabled);
      setCached(record ? cacheRecord(record, pending) : false);
    } catch {
      setError(
        'Device storage is unavailable. Changes can only be kept while this page stays open.',
      );
    }
  }
  return {
    notebook: owner ? record?.content : demo,
    loading,
    busy,
    error,
    pending,
    cached,
    offline,
    online,
    conflict,
    commit,
    reload,
    sync,
    toggleOffline,
  };
}
