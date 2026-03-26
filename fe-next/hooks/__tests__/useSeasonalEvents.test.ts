/**
 * useSeasonalEvents Hook Tests
 *
 * Tests event fetching, joining, and reward claiming.
 */

import { vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// --- Mocks ---

const mockUser = { id: 'test-user-id' };
const mockUseAuth = vi.fn(() => ({ user: mockUser }));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

const { mockFrom } = vi.hoisted(() => {
  const mockFrom = vi.fn();
  return { mockFrom };
});
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

import { useSeasonalEvents } from '../useSeasonalEvents';

// --- Helpers ---

function makeEventRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'evt-1',
    name: 'Spring Festival',
    description: 'A spring word festival',
    type: 'seasonal',
    status: 'active',
    start_time: '2026-03-01T00:00:00Z',
    end_time: '2026-04-01T00:00:00Z',
    config: JSON.stringify({ bonus_xp: 2 }),
    rewards: JSON.stringify([{ type: 'gold', amount: 500 }]),
    ...overrides,
  };
}

function makeParticipationRow(overrides: Record<string, unknown> = {}) {
  return {
    event_id: 'evt-1',
    user_id: 'test-user-id',
    score: 150,
    rank: 5,
    rewards_claimed: false,
    joined_at: '2026-03-10T00:00:00Z',
    ...overrides,
  };
}

function setupFetchEvents(
  eventRows: Record<string, unknown>[],
  participationRows: Record<string, unknown>[] = [],
) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'events') {
      return {
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: eventRows, error: null }),
          }),
        }),
      };
    }
    if (table === 'event_participation') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: participationRows, error: null }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }),
      };
    }
    return {};
  });
}

// --- Tests ---

describe('useSeasonalEvents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: mockUser });
  });

  describe('Given no authenticated user', () => {
    it('should still fetch events but have empty participation', async () => {
      mockUseAuth.mockReturnValue({ user: null as any });
      const activeEvent = makeEventRow();
      setupFetchEvents([activeEvent]);

      const { result } = renderHook(() => useSeasonalEvents());

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.activeEvents).toHaveLength(1);
      expect(result.current.myParticipation).toEqual([]);
    });
  });

  describe('Given active and upcoming events', () => {
    it('should separate events by status', async () => {
      const active = makeEventRow({ id: 'evt-1', status: 'active' });
      const upcoming = makeEventRow({ id: 'evt-2', status: 'upcoming', name: 'Summer Clash' });
      setupFetchEvents([active, upcoming]);

      const { result } = renderHook(() => useSeasonalEvents());

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.activeEvents).toHaveLength(1);
      expect(result.current.activeEvents[0].name).toBe('Spring Festival');
      expect(result.current.upcomingEvents).toHaveLength(1);
      expect(result.current.upcomingEvents[0].name).toBe('Summer Clash');
    });

    it('should parse rewards and config from JSON strings', async () => {
      const evt = makeEventRow({
        rewards: JSON.stringify([{ type: 'gold', amount: 500 }, { type: 'xp', amount: 1000 }]),
        config: JSON.stringify({ bonus_xp: 2, theme: 'spring' }),
      });
      setupFetchEvents([evt]);

      const { result } = renderHook(() => useSeasonalEvents());

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.activeEvents[0].rewards).toHaveLength(2);
      expect(result.current.activeEvents[0].config).toEqual({ bonus_xp: 2, theme: 'spring' });
    });
  });

  describe('Given fetch errors', () => {
    it('should return empty events on error', async () => {
      mockFrom.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: null, error: { message: 'fail' } }),
          }),
        }),
      }));

      const { result } = renderHook(() => useSeasonalEvents());

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.activeEvents).toEqual([]);
      expect(result.current.upcomingEvents).toEqual([]);
    });
  });

  describe('joinEvent', () => {
    it('should insert participation and update state', async () => {
      const evt = makeEventRow();
      const newParticipation = makeParticipationRow({ score: 0, rank: null, rewards_claimed: false });
      setupFetchEvents([evt]);

      const { result } = renderHook(() => useSeasonalEvents());
      await waitFor(() => expect(result.current.loading).toBe(false));

      // Setup join mock
      mockFrom.mockImplementation((table: string) => {
        if (table === 'event_participation') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: newParticipation, error: null }),
              }),
            }),
          };
        }
        return {};
      });

      let success = false;
      await act(async () => {
        success = await result.current.joinEvent('evt-1');
      });

      expect(success).toBe(true);
      expect(result.current.myParticipation).toHaveLength(1);
      expect(result.current.myParticipation[0].eventId).toBe('evt-1');
    });

    it('should return false when already participating', async () => {
      const evt = makeEventRow();
      const participation = makeParticipationRow();
      setupFetchEvents([evt], [participation]);

      const { result } = renderHook(() => useSeasonalEvents());
      await waitFor(() => expect(result.current.loading).toBe(false));

      let success = true;
      await act(async () => {
        success = await result.current.joinEvent('evt-1');
      });

      expect(success).toBe(false);
    });

    it('should return false when no user', async () => {
      mockUseAuth.mockReturnValue({ user: null as any });
      setupFetchEvents([makeEventRow()]);

      const { result } = renderHook(() => useSeasonalEvents());
      await waitFor(() => expect(result.current.loading).toBe(false));

      let success = true;
      await act(async () => {
        success = await result.current.joinEvent('evt-1');
      });

      expect(success).toBe(false);
    });
  });

  describe('claimRewards', () => {
    it('should update participation to rewards_claimed', async () => {
      const evt = makeEventRow();
      const participation = makeParticipationRow({ rewards_claimed: false });
      setupFetchEvents([evt], [participation]);

      const { result } = renderHook(() => useSeasonalEvents());
      await waitFor(() => expect(result.current.loading).toBe(false));

      // Setup claim mock
      mockFrom.mockImplementation((table: string) => {
        if (table === 'event_participation') {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
              }),
            }),
          };
        }
        return {};
      });

      let success = false;
      await act(async () => {
        success = await result.current.claimRewards('evt-1');
      });

      expect(success).toBe(true);
      expect(result.current.myParticipation[0].rewardsClaimed).toBe(true);
    });

    it('should return false when rewards already claimed', async () => {
      const evt = makeEventRow();
      const participation = makeParticipationRow({ rewards_claimed: true });
      setupFetchEvents([evt], [participation]);

      const { result } = renderHook(() => useSeasonalEvents());
      await waitFor(() => expect(result.current.loading).toBe(false));

      let success = true;
      await act(async () => {
        success = await result.current.claimRewards('evt-1');
      });

      expect(success).toBe(false);
    });

    it('should return false when not participating in event', async () => {
      setupFetchEvents([makeEventRow()]);

      const { result } = renderHook(() => useSeasonalEvents());
      await waitFor(() => expect(result.current.loading).toBe(false));

      let success = true;
      await act(async () => {
        success = await result.current.claimRewards('evt-1');
      });

      expect(success).toBe(false);
    });
  });
});
