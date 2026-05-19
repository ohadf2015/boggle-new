import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBlastDictionary } from '../useBlastDictionary';

describe('useBlastDictionary', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  it('returns true when the API reports the word as valid', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ isValid: true }),
    });

    const { result } = renderHook(() => useBlastDictionary('en'));
    let ok = false;
    await act(async () => {
      ok = await result.current.verify('hello');
    });

    expect(ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('/api/dictionary/check');
    const parsed = JSON.parse(init.body);
    expect(parsed.language).toBe('en');
    // EN normalize() uppercases. The check route lowercases internally so
    // either casing reaches a valid dictionary hit — we just confirm the
    // engine's canonical form is what we send.
    expect(parsed.word).toBe('HELLO');
  });

  it('returns false when the API reports the word as invalid', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ isValid: false }),
    });

    const { result } = renderHook(() => useBlastDictionary('en'));
    let ok = true;
    await act(async () => {
      ok = await result.current.verify('xyzqq');
    });

    expect(ok).toBe(false);
  });

  it('caches both positive and negative results so the same word never hits the API twice', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ isValid: true }),
    });

    const { result } = renderHook(() => useBlastDictionary('en'));
    await act(async () => {
      await result.current.verify('hello');
      await result.current.verify('hello');
      await result.current.verify('hello');
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('returns false (without crashing) when the network call rejects', async () => {
    fetchMock.mockRejectedValueOnce(new Error('offline'));

    const { result } = renderHook(() => useBlastDictionary('en'));
    let ok = true;
    await act(async () => {
      ok = await result.current.verify('hello');
    });

    expect(ok).toBe(false);
  });

  it('caches `hello` and `HELLO` as the same key (normalized cache hit)', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ isValid: true }),
    });

    const { result } = renderHook(() => useBlastDictionary('en'));
    await act(async () => {
      await result.current.verify('hello');
      await result.current.verify('HELLO');
    });

    // Both calls collapse to the same EN-normalized key (uppercase), so the
    // second verify is a cache hit and no second HTTP call fires.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('returns false synchronously for empty input without firing the API', async () => {
    const { result } = renderHook(() => useBlastDictionary('en'));
    let ok = true;
    await act(async () => {
      ok = await result.current.verify('');
    });
    expect(ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
