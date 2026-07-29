/**
 * Tests for useLeagueRivals hook
 */

import { vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useLeagueRivals } from '../useLeagueRivals';

// Mock fetch
const mockFetch = vi.fn();

describe('useLeagueRivals', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
    vi.clearAllMocks();
  });

  it('should return loading state initially', () => {
    mockFetch.mockReturnValue(new Promise(() => {})); // never resolves
    const { result } = renderHook(() => useLeagueRivals('user-1'));
    expect(result.current.loading).toBe(true);
    expect(result.current.above).toBeNull();
    expect(result.current.below).toBeNull();
    expect(result.current.player).toBeNull();
  });

  it('should fetch and return rival data', async () => {
    const mockData = {
      above: { username: 'Alice', avatar: 'cat.png', score: 500, position: 4 },
      below: { username: 'Carol', avatar: 'dog.png', score: 300, position: 6 },
      player: { position: 5, score: 400 },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    const { result } = renderHook(() => useLeagueRivals('user-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.above).toEqual(mockData.above);
    expect(result.current.below).toEqual(mockData.below);
    expect(result.current.player).toEqual(mockData.player);
  });

  it('should not fetch when userId is null', () => {
    const { result } = renderHook(() => useLeagueRivals(null));
    expect(result.current.loading).toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should handle fetch error gracefully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const { result } = renderHook(() => useLeagueRivals('user-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.above).toBeNull();
    expect(result.current.below).toBeNull();
    expect(result.current.player).toBeNull();
  });

  it('should handle network error gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useLeagueRivals('user-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.above).toBeNull();
    expect(result.current.below).toBeNull();
  });
});
