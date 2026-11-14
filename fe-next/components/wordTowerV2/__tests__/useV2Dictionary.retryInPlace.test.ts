/**
 * PostHog inbox 01a15a17: the Hebrew Word Tower "dictionary did not load"
 * button reloaded the whole page (20-25s blank per tap) and the app sent no
 * event on failure. Retry now re-runs the load in place, and a failure is tracked.
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const load = vi.hoisted(() => vi.fn());
const track = vi.hoisted(() => vi.fn());
vi.mock('@/lib/word-craft/dictionary', () => ({ loadWordCraftDictionary: load }));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: track }));

import { useV2Dictionary } from '../useV2Dictionary';

beforeEach(() => {
  load.mockReset();
  track.mockReset();
});

describe('useV2Dictionary retry', () => {
  it('reports a failed load, then recovers in place on retry', async () => {
    load.mockRejectedValueOnce(new Error('Dictionary for "he" is unavailable')).mockResolvedValueOnce(new Set(['שלום']));
    const { result } = renderHook(() => useV2Dictionary('he'));

    await waitFor(() => expect(result.current.dictError).toBe(true));
    expect(track).toHaveBeenCalledWith('wt2_dict_load_failed', expect.objectContaining({ locale: 'he', attempt: 1 }));

    act(() => result.current.retry());
    await waitFor(() => expect(result.current.dictReady).toBe(true));
    expect(result.current.dictError).toBe(false);
    expect(result.current.dictRef.current?.has('שלום')).toBe(true);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('counts attempts across retries', async () => {
    load.mockRejectedValue(new Error('down'));
    const { result } = renderHook(() => useV2Dictionary('he'));
    await waitFor(() => expect(result.current.dictError).toBe(true));
    act(() => result.current.retry());
    await waitFor(() => expect(track).toHaveBeenCalledTimes(2));
    expect(track).toHaveBeenLastCalledWith('wt2_dict_load_failed', expect.objectContaining({ attempt: 2 }));
  });
});
