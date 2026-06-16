import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBlastDictionary } from '../useBlastDictionary';

// Control the offline in-memory dictionary the hook now consults before the
// network. `memHit.current` is what hasWordInMemoryCache returns.
const { memHit, prewarmMock } = vi.hoisted(() => ({
  memHit: { current: null as boolean | null },
  prewarmMock: vi.fn(async () => {}),
}));
vi.mock('@/hooks/useDictionaryCache', () => ({
  prewarmDictionary: prewarmMock,
  hasWordInMemoryCache: () => memHit.current,
}));

function setOnline(online: boolean): void {
  Object.defineProperty(navigator, 'onLine', { value: online, configurable: true });
}

describe('useBlastDictionary', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    memHit.current = null;
    prewarmMock.mockClear();
    setOnline(true);
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

  it('accepts a word from the offline in-memory dict without touching the network', async () => {
    memHit.current = true;
    const { result } = renderHook(() => useBlastDictionary('en'));
    let ok = false;
    await act(async () => {
      ok = await result.current.verify('hello');
    });
    expect(ok).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('when offline and the word is not cached, rejects without hitting the network', async () => {
    setOnline(false);
    memHit.current = null; // dict not warmed / word unknown
    const { result } = renderHook(() => useBlastDictionary('en'));
    let ok = true;
    await act(async () => {
      ok = await result.current.verify('zzqqx');
    });
    expect(ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does NOT cache a hard offline reject, so going back online re-checks the server', async () => {
    // Offline miss first…
    setOnline(false);
    memHit.current = null;
    const { result } = renderHook(() => useBlastDictionary('en'));
    await act(async () => {
      await result.current.verify('hello');
    });
    expect(fetchMock).not.toHaveBeenCalled();

    // …then back online: the server confirms it (community-validated word).
    setOnline(true);
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ isValid: true }) });
    let ok = false;
    await act(async () => {
      ok = await result.current.verify('hello');
    });
    expect(ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('prewarms the offline dictionary on mount so bonus words work on a later connection drop', () => {
    renderHook(() => useBlastDictionary('he'));
    expect(prewarmMock).toHaveBeenCalledWith('he');
  });

  describe('checkSync', () => {
    it('returns true synchronously for a word in the warmed offline dict', () => {
      memHit.current = true;
      const { result } = renderHook(() => useBlastDictionary('en'));
      expect(result.current.checkSync('hello')).toBe(true);
    });

    it('returns false when the dict is cold (null) or the word is missing', () => {
      memHit.current = null;
      const { result } = renderHook(() => useBlastDictionary('en'));
      expect(result.current.checkSync('hello')).toBe(false);
      memHit.current = false;
      expect(result.current.checkSync('zzqqx')).toBe(false);
    });

    it('returns false for empty input', () => {
      memHit.current = true;
      const { result } = renderHook(() => useBlastDictionary('en'));
      expect(result.current.checkSync('')).toBe(false);
    });
  });
});
