// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useNotebook } from '../src/hooks/useNotebook';
import { freshState } from '../src/lib/model';
import { ConflictError } from '../src/lib/repository';
const repository = vi.hoisted(() => ({
  loadNotebook: vi.fn(),
  saveNotebook: vi.fn(),
  cacheRecord: vi.fn(),
  readCache: vi.fn(),
  offlineEnabled: vi.fn(),
  setOfflineEnabled: vi.fn(),
}));
vi.mock('../src/lib/repository', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  ...repository,
}));
const owner = '11111111-1111-4111-8111-111111111111';
const original = () => ({
  id: '33333333-3333-4333-8333-333333333333',
  owner_id: owner,
  content: freshState(),
  revision: 0,
  updated_at: '2026-10-25T12:00:00Z',
});
beforeEach(() => {
  vi.restoreAllMocks();
  Object.values(repository).forEach((fn) => fn.mockReset());
  repository.loadNotebook.mockResolvedValue(original());
  repository.readCache.mockReturnValue(null);
  repository.offlineEnabled.mockReturnValue(false);
  repository.cacheRecord.mockReturnValue(false);
  repository.saveNotebook.mockImplementation(async (r, content) => ({
    ...r,
    content,
    revision: r.revision + 1,
  }));
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
});
afterEach(cleanup);
describe('notebook persistence lifecycle', () => {
  it('saves a versioned snapshot and clears pending only on success', async () => {
    const { result } = renderHook(() => useNotebook(owner));
    await waitFor(() => expect(result.current.notebook).toBeTruthy());
    await act(async () => {
      await result.current.commit({ ...freshState(), questions: 'Question' });
    });
    expect(repository.saveNotebook.mock.calls[0][0].revision).toBe(0);
    expect(result.current.pending).toBe(false);
    expect(result.current.notebook?.questions).toBe('Question');
  });
  it('keeps failed cloud writes in memory and never reports them saved', async () => {
    repository.saveNotebook.mockRejectedValue(new Error('Network unavailable'));
    const { result } = renderHook(() => useNotebook(owner));
    await waitFor(() => expect(result.current.notebook).toBeTruthy());
    await act(async () => {
      await result.current.commit({ ...freshState(), questions: 'Keep me' });
    });
    expect(result.current.pending).toBe(true);
    expect(result.current.cached).toBe(false);
    expect(result.current.notebook?.questions).toBe('Keep me');
    expect(result.current.error).toBe('Network unavailable');
  });
  it('queues offline writes on a trusted device and syncs the same revision later', async () => {
    repository.cacheRecord.mockReturnValue(true);
    repository.offlineEnabled.mockReturnValue(true);
    const { result } = renderHook(() => useNotebook(owner));
    await waitFor(() => expect(result.current.notebook).toBeTruthy());
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    await act(async () => {
      await result.current.commit({ ...freshState(), questions: 'Offline question' });
    });
    expect(repository.saveNotebook).not.toHaveBeenCalled();
    expect(result.current.pending).toBe(true);
    expect(result.current.cached).toBe(true);
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    await act(async () => {
      await result.current.sync();
    });
    expect(repository.saveNotebook.mock.calls[0][0].revision).toBe(0);
    expect(result.current.pending).toBe(false);
  });
  it('retains pending edits after a conflict until explicit reload', async () => {
    repository.saveNotebook.mockRejectedValue(new ConflictError());
    const { result } = renderHook(() => useNotebook(owner));
    await waitFor(() => expect(result.current.notebook).toBeTruthy());
    await act(async () => {
      await result.current.commit({ ...freshState(), questions: 'Local edit' });
    });
    expect(result.current.conflict).toBe(true);
    expect(result.current.notebook?.questions).toBe('Local edit');
    await act(async () => {
      await result.current.reload();
    });
    expect(result.current.conflict).toBe(false);
    expect(result.current.notebook?.questions).toBe('');
  });
  it('restores a pending cache without replacing it with the cloud copy', async () => {
    repository.readCache.mockReturnValue({
      record: { ...original(), content: { ...freshState(), questions: 'Pending edit' } },
      pending: true,
    });
    const { result } = renderHook(() => useNotebook(owner));
    await waitFor(() => expect(result.current.notebook?.questions).toBe('Pending edit'));
    expect(repository.loadNotebook).not.toHaveBeenCalled();
    expect(result.current.pending).toBe(true);
  });
  it('never writes example state to device or cloud storage', async () => {
    const { result } = renderHook(() => useNotebook(null));
    await act(async () => {
      await result.current.commit({ ...result.current.notebook!, questions: 'Demo edit' });
    });
    expect(repository.saveNotebook).not.toHaveBeenCalled();
    expect(repository.cacheRecord).not.toHaveBeenCalled();
  });
  it('does not cache a late response after the account view unmounts', async () => {
    let resolve!: (value: ReturnType<typeof original>) => void;
    repository.loadNotebook.mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );
    const { unmount } = renderHook(() => useNotebook(owner));
    unmount();
    await act(async () => {
      resolve(original());
    });
    expect(repository.cacheRecord).not.toHaveBeenCalled();
  });
});
