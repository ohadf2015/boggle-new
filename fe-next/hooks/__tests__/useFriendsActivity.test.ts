/**
 * useFriendsActivity Hook Tests
 *
 * Tests for the hook that fetches recent friend activity
 * for the landing page social FOMO feed.
 */

import { vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

// Mock AuthContext
const { mockUseAuth } = vi.hoisted(() => {
  const mockUseAuth = vi.fn();
  return { mockUseAuth };
});
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: (...args: unknown[]) => mockUseAuth(...args),
}));

// Mock supabase
const { mockFrom, mockRpc } = vi.hoisted(() => {
  const mockFrom = vi.fn();
  const mockRpc = vi.fn();
  return { mockFrom, mockRpc };
});
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

import { useFriendsActivity } from '../useFriendsActivity';

// Helper: chainable Supabase query mock
function createSelectChain(data: unknown[] | null, error: unknown = null) {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data, error }),
        }),
      }),
      or: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data, error }),
          }),
        }),
      }),
    }),
  };
}

const mockFriendRows = [
  { user_id: 'u1', friend_id: 'u2' },
  { user_id: 'u3', friend_id: 'u1' },
];

const mockSessionRows = [
  {
    user_id: 'u2',
    mode: 'daily_challenge',
    score: 420,
    words_found: 12,
    created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    daily_puzzle_number: 42,
    profiles: { username: 'WordWiz', display_name: 'Word Wiz', avatar_image: null, avatar_config: null },
  },
  {
    user_id: 'u3',
    mode: 'blast',
    score: 300,
    words_found: 25,
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    daily_puzzle_number: null,
    profiles: { username: 'BlastKing', display_name: null, avatar_image: 'food_pizza', avatar_config: null },
  },
];

describe('useFriendsActivity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { id: 'u1' }, isAuthenticated: true });
  });

  // GIVEN unauthenticated user
  // WHEN hook renders
  // THEN returns empty events, no loading
  it('should return empty events for unauthenticated users', () => {
    mockUseAuth.mockReturnValue({ user: null, isAuthenticated: false });

    const { result } = renderHook(() => useFriendsActivity());

    expect(result.current.events).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  // GIVEN authenticated user with friends who have activity
  // WHEN hook renders and data loads
  // THEN returns formatted events
  it('should fetch and return friend activity events', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'friends') return createSelectChain(mockFriendRows);
      if (table === 'game_sessions') {
        // Must handle both the friend sessions (.in()) and myBestScores (.eq()) queries
        const mockSelect = vi.fn().mockReturnValue({
          in: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: mockSessionRows, error: null }),
            }),
          }),
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [{ mode: 'daily_challenge', score: 300 }], error: null }),
          }),
        });
        return { select: mockSelect };
      }
      return createSelectChain(null);
    });

    const { result } = renderHook(() => useFriendsActivity());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.events.length).toBe(2);
    expect(result.current.events[0].friendName).toBe('Word Wiz');
    expect(result.current.events[0].mode).toBe('daily_challenge');
    expect(result.current.events[1].friendName).toBe('BlastKing');
  });

  // GIVEN authenticated user with no friends
  // WHEN hook renders
  // THEN returns empty events
  it('should return empty events when user has no friends', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'friends') return createSelectChain([]);
      return createSelectChain(null);
    });

    const { result } = renderHook(() => useFriendsActivity());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.events).toEqual([]);
  });

  // GIVEN supabase returns error
  // WHEN hook renders
  // THEN returns empty events gracefully
  it('should handle supabase errors gracefully', async () => {
    mockFrom.mockImplementation(() =>
      createSelectChain(null, { message: 'Network error' })
    );

    const { result } = renderHook(() => useFriendsActivity());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.events).toEqual([]);
  });

  // GIVEN daily challenge event
  // WHEN formatAction called
  // THEN action key is 'scored' with correct value
  it('should format daily challenge events with score and daily number', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'friends') return createSelectChain(mockFriendRows);
      if (table === 'game_sessions') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: [mockSessionRows[0]],
                  error: null,
                }),
              }),
            }),
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        };
      }
      return createSelectChain(null);
    });

    const { result } = renderHook(() => useFriendsActivity());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.events[0].actionKey).toBe('friendsActivity.scored');
    expect(result.current.events[0].actionParams).toEqual({ score: 420, number: 42 });
  });

  // GIVEN blast mode event
  // WHEN formatAction called
  // THEN action key is 'blastWords' with word count
  it('should format blast events with word count', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'friends') return createSelectChain(mockFriendRows);
      if (table === 'game_sessions') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: [mockSessionRows[1]],
                  error: null,
                }),
              }),
            }),
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        };
      }
      return createSelectChain(null);
    });

    const { result } = renderHook(() => useFriendsActivity());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.events[0].actionKey).toBe('friendsActivity.blastWords');
    expect(result.current.events[0].actionParams).toEqual({ count: 25 });
  });
});
