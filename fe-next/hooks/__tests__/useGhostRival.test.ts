/**
 * useGhostRival Hook Tests
 * Tests weekly ghost rival data fetching and state management
 */

import { vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useGhostRival } from '../useGhostRival';
import { useAuth } from '@/contexts/AuthContext';

// Mock dependencies
vi.mock('@/contexts/AuthContext');

const mockFetch = vi.fn();

describe('useGhostRival', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
    vi.clearAllMocks();
  });

  it('should return loading=false and null rival for unauthenticated users', async () => {
    // GIVEN - No authenticated user
    (useAuth as any).mockReturnValue({ user: null });

    // WHEN
    const { result } = renderHook(() => useGhostRival());

    // THEN
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.rival).toBeNull();
    expect(result.current.gap).toBe(0);
  });

  it('should fetch and return rival data for authenticated users', async () => {
    // GIVEN
    (useAuth as any).mockReturnValue({ user: { id: 'user-1' } });
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        rival: { id: 'rival-1', username: 'GhostPlayer', avatar: '', score: 150 },
        player: { score: 200 },
        weekEnd: '2026-03-29',
      }),
    });

    // WHEN
    const { result } = renderHook(() => useGhostRival());

    // THEN
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.rival).toEqual({
      id: 'rival-1',
      username: 'GhostPlayer',
      avatar: '',
      score: 150,
    });
    expect(result.current.player.score).toBe(200);
    expect(result.current.gap).toBe(50);
    expect(result.current.isAhead).toBe(true);
  });

  it('should calculate gap correctly when behind', async () => {
    // GIVEN
    (useAuth as any).mockReturnValue({ user: { id: 'user-1' } });
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        rival: { id: 'rival-1', username: 'Leader', avatar: '', score: 300 },
        player: { score: 100 },
        weekEnd: '2026-03-29',
      }),
    });

    // WHEN
    const { result } = renderHook(() => useGhostRival());

    // THEN
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.gap).toBe(200);
    expect(result.current.isAhead).toBe(false);
  });

  it('should handle fetch errors gracefully', async () => {
    // GIVEN
    (useAuth as any).mockReturnValue({ user: { id: 'user-1' } });
    mockFetch.mockResolvedValue({ ok: false });

    // WHEN
    const { result } = renderHook(() => useGhostRival());

    // THEN
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.error).toBe('Failed to fetch ghost rival');
    expect(result.current.rival).toBeNull();
  });

  it('should call fetch with correct URL', async () => {
    // GIVEN
    (useAuth as any).mockReturnValue({ user: { id: 'user-123' } });
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ rival: null, player: { score: 0 } }),
    });

    // WHEN
    renderHook(() => useGhostRival());

    // THEN
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/ghost-rival?userId=user-123'
      );
    });
  });
});
