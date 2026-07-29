import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { probeReachability, classifySlowFromRtt } from '../networkProbe';

describe('probeReachability', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('returns rtt and reachable=true on successful probe', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 204 }));
    vi.spyOn(performance, 'now').mockReturnValueOnce(0).mockReturnValueOnce(120);

    const result = await probeReachability();
    expect(result.reachable).toBe(true);
    expect(result.rttMs).toBe(120);
  });

  it('returns reachable=false on non-2xx response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('boom', { status: 500 }));
    const result = await probeReachability();
    expect(result.reachable).toBe(false);
    expect(result.rttMs).toBeNull();
  });

  it('returns reachable=false on fetch rejection (offline / DNS fail)', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('network'));
    const result = await probeReachability();
    expect(result.reachable).toBe(false);
    expect(result.rttMs).toBeNull();
  });

  it('honors AbortSignal timeout', async () => {
    // Mock fetch that hangs forever; AbortController should trigger reject
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
        }),
    );

    const resultPromise = probeReachability({ timeoutMs: 100 });
    await vi.advanceTimersByTimeAsync(150);
    const result = await resultPromise;
    expect(result.reachable).toBe(false);
  });
});

describe('classifySlowFromRtt', () => {
  it('treats rtt > 2000ms as slow', () => {
    expect(classifySlowFromRtt(2500)).toBe(true);
  });

  it('treats rtt <= 2000ms as fast', () => {
    expect(classifySlowFromRtt(1999)).toBe(false);
    expect(classifySlowFromRtt(800)).toBe(false);
    expect(classifySlowFromRtt(0)).toBe(false);
  });

  it('treats null rtt as not-slow (insufficient signal)', () => {
    expect(classifySlowFromRtt(null)).toBe(false);
  });
});
