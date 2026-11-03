import { vi, describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const getWithAuth = vi.fn();
vi.mock('@/utils/authFetch', () => ({ getWithAuth: (url: string) => getWithAuth(url) }));

import { capped, useReteachSnapshot } from '../useReteachSnapshot';

const classes = [
  { id: 'a', name: 'A', member_count: 4 },
  { id: 'b', name: 'B', member_count: 2 },
];

const json = (status: number, body: unknown) => ({ ok: status < 300, status, json: async () => body });
const totals = { students: 4, words: 6, sessions: 8, attempts: 40, correct: 20, classAccuracy: 50 };

describe('useReteachSnapshot', () => {
  beforeEach(() => getWithAuth.mockReset());

  it('given every class read fails, when settled, then it reports an error, not an empty class', async () => {
    getWithAuth
      .mockImplementationOnce(() => Promise.reject(new TypeError('Failed to fetch')))
      .mockImplementationOnce(() => Promise.reject(new TypeError('Failed to fetch')));
    const { result } = renderHook(() => useReteachSnapshot(classes));
    await waitFor(() => expect(result.current.status).toBe('error'));
  });

  it('given one class answers with no misses, when settled, then there is nothing real to show yet', async () => {
    getWithAuth
      .mockResolvedValueOnce(json(500, { ok: false }))
      .mockResolvedValueOnce(json(200, { ok: true, report: { totals, hardestWords: [] } }));
    const { result } = renderHook(() => useReteachSnapshot(classes));
    await waitFor(() => expect(result.current).toEqual({ status: 'ready', snapshot: null }));
  });

  it('given a read that never answers, when the cap passes, then it settles empty', async () => {
    await expect(capped(new Promise(() => {}), 20)).resolves.toBeUndefined();
  });

  it('given a read that answers in time, when capped, then its value comes through', async () => {
    await expect(capped(Promise.resolve('ok'), 1000)).resolves.toBe('ok');
  });
});
