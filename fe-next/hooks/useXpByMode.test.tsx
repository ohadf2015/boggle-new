import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useXpByMode } from './useXpByMode';

describe('useXpByMode', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns [] before any fetch and when no playerId is given', () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const { result } = renderHook(() => useXpByMode(undefined));
    expect(result.current).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('fetches the player-profile endpoint and returns its xpByMode', async () => {
    const slices = [{ mode: 'blast', xp: 1000, share: 1 }];
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ xpByMode: slices }) })),
    );
    const { result } = renderHook(() => useXpByMode('player-1'));
    await waitFor(() => expect(result.current).toEqual(slices));
    expect(fetch).toHaveBeenCalledWith('/api/player-profile/player-1');
  });

  it('returns [] when the response has no xpByMode', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) })),
    );
    const { result } = renderHook(() => useXpByMode('player-1'));
    // give the effect a tick; stays []
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(result.current).toEqual([]);
  });

  it('stays [] when the request fails (never throws)', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('network'))));
    const { result } = renderHook(() => useXpByMode('player-1'));
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(result.current).toEqual([]);
  });
});
