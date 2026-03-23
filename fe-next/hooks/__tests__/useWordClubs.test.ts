/**
 * useWordClubs Hook Tests
 *
 * Tests word club CRUD: fetch, create, join, leave, select.
 */

import { renderHook, act, waitFor } from '@testing-library/react';

// --- Mocks ---

const mockUser = { id: 'test-user-id' };
const mockUseAuth = jest.fn(() => ({ user: mockUser }));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

const mockFrom = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

import { useWordClubs } from '../useWordClubs';

// --- Helpers ---

function makeClubRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'club-1',
    name: 'Word Warriors',
    description: 'A club for word lovers',
    owner_id: 'test-user-id',
    max_members: 50,
    invite_code: 'ABC123',
    is_public: false,
    weekly_xp_total: 500,
    member_count: 5,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeMemberRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'mem-1',
    club_id: 'club-1',
    user_id: 'test-user-id',
    display_name: 'Alice',
    avatar_config: null,
    weekly_xp: 100,
    total_xp: 1000,
    games_this_week: 10,
    best_word_this_week: 'QUARTZ',
    role: 'owner',
    joined_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

/**
 * Sets up mock chain for the initial fetchClubs call:
 * 1. word_club_members.select('club_id').eq('user_id', ...) -> memberRows
 * 2. word_clubs.select('*').in('id', [...]) -> clubRows
 * 3. word_club_members.select('*').eq('club_id', ...).order(...) -> memberRows (for fetchMembers)
 */
function setupFetchClubs(clubRows: Record<string, unknown>[], memberDetailRows: Record<string, unknown>[] = []) {
  const memberIds = clubRows.map((c) => ({ club_id: c.id }));

  let callCount = 0;
  mockFrom.mockImplementation((table: string) => {
    if (table === 'word_club_members' && callCount === 0) {
      callCount++;
      // First call: get club IDs for user
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: memberIds, error: null }),
        }),
      };
    }
    if (table === 'word_clubs') {
      // Second call: get club details
      return {
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockResolvedValue({ data: clubRows, error: null }),
        }),
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      };
    }
    if (table === 'word_club_members') {
      // Third call: fetch members for currentClub
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({ data: memberDetailRows, error: null }),
          }),
        }),
        insert: jest.fn().mockResolvedValue({ error: null }),
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null }),
          }),
        }),
      };
    }
    return {
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: [], error: null }),
      }),
    };
  });
}

function setupFetchEmpty() {
  mockFrom.mockImplementation(() => ({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ data: [], error: null }),
    }),
  }));
}

// --- Tests ---

describe('useWordClubs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: mockUser });
  });

  describe('Given no authenticated user', () => {
    it('should return empty clubs and stop loading', async () => {
      mockUseAuth.mockReturnValue({ user: null as any });
      setupFetchEmpty();

      const { result } = renderHook(() => useWordClubs());

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.myClubs).toEqual([]);
      expect(result.current.currentClub).toBeNull();
    });
  });

  describe('Given an authenticated user', () => {
    it('should fetch clubs on mount', async () => {
      const club = makeClubRow();
      const member = makeMemberRow();
      setupFetchClubs([club], [member]);

      const { result } = renderHook(() => useWordClubs());

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.myClubs).toHaveLength(1);
      expect(result.current.myClubs[0].name).toBe('Word Warriors');
      expect(result.current.currentClub).not.toBeNull();
      expect(result.current.currentClub?.id).toBe('club-1');
    });

    it('should handle empty club list', async () => {
      mockFrom.mockImplementation(() => ({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }));

      const { result } = renderHook(() => useWordClubs());

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.myClubs).toEqual([]);
    });
  });

  describe('createClub', () => {
    it('should insert club and add to state', async () => {
      setupFetchEmpty();

      const { result } = renderHook(() => useWordClubs());
      await waitFor(() => expect(result.current.loading).toBe(false));

      // Setup create mock
      const newClubRow = makeClubRow({ id: 'club-new', name: 'New Club' });
      mockFrom.mockImplementation((table: string) => {
        if (table === 'word_clubs') {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: newClubRow, error: null }),
              }),
            }),
          };
        }
        // word_club_members insert for owner
        return {
          insert: jest.fn().mockResolvedValue({ error: null }),
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        };
      });

      let created: unknown;
      await act(async () => {
        created = await result.current.createClub({ name: 'New Club' });
      });

      expect(created).not.toBeNull();
      expect(result.current.myClubs).toHaveLength(1);
      expect(result.current.myClubs[0].name).toBe('New Club');
      expect(result.current.currentClub?.id).toBe('club-new');
    });

    it('should return null when no user', async () => {
      mockUseAuth.mockReturnValue({ user: null as any });
      setupFetchEmpty();

      const { result } = renderHook(() => useWordClubs());
      await waitFor(() => expect(result.current.loading).toBe(false));

      let created: unknown;
      await act(async () => {
        created = await result.current.createClub({ name: 'X' });
      });

      expect(created).toBeNull();
    });
  });

  describe('joinClub', () => {
    it('should join a club by invite code', async () => {
      setupFetchEmpty();

      const { result } = renderHook(() => useWordClubs());
      await waitFor(() => expect(result.current.loading).toBe(false));

      const targetClub = makeClubRow({ id: 'club-join', invite_code: 'XYZ789' });
      mockFrom.mockImplementation((table: string) => {
        if (table === 'word_clubs') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: targetClub, error: null }),
              }),
            }),
          };
        }
        return {
          insert: jest.fn().mockResolvedValue({ error: null }),
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        };
      });

      let success: boolean = false;
      await act(async () => {
        success = await result.current.joinClub('xyz789');
      });

      expect(success).toBe(true);
      expect(result.current.myClubs).toHaveLength(1);
    });

    it('should return false when no user', async () => {
      mockUseAuth.mockReturnValue({ user: null as any });
      setupFetchEmpty();

      const { result } = renderHook(() => useWordClubs());
      await waitFor(() => expect(result.current.loading).toBe(false));

      let success: boolean = true;
      await act(async () => {
        success = await result.current.joinClub('ABC');
      });

      expect(success).toBe(false);
    });
  });

  describe('leaveClub', () => {
    it('should remove club membership from state', async () => {
      const club = makeClubRow();
      setupFetchClubs([club], []);

      const { result } = renderHook(() => useWordClubs());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.myClubs).toHaveLength(1);

      // Setup leave mock
      mockFrom.mockImplementation(() => ({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null }),
          }),
        }),
      }));

      let success: boolean = false;
      await act(async () => {
        success = await result.current.leaveClub('club-1');
      });

      expect(success).toBe(true);
      expect(result.current.myClubs).toHaveLength(0);
      expect(result.current.currentClub).toBeNull();
    });
  });

  describe('selectClub', () => {
    it('should change currentClub to the selected club', async () => {
      const club1 = makeClubRow({ id: 'club-1', name: 'Club One' });
      const club2 = makeClubRow({ id: 'club-2', name: 'Club Two' });
      setupFetchClubs([club1, club2], []);

      const { result } = renderHook(() => useWordClubs());
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.currentClub?.id).toBe('club-1');

      act(() => {
        result.current.selectClub('club-2');
      });

      expect(result.current.currentClub?.id).toBe('club-2');
      expect(result.current.currentClub?.name).toBe('Club Two');
    });

    it('should set currentClub to null for unknown id', async () => {
      const club = makeClubRow();
      setupFetchClubs([club], []);

      const { result } = renderHook(() => useWordClubs());
      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => {
        result.current.selectClub('nonexistent');
      });

      expect(result.current.currentClub).toBeNull();
    });
  });
});
