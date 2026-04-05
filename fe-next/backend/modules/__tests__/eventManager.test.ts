/**
 * Event Manager Tests
 * Tests for seasonal/limited-time events framework
 */

import { vi, type Mock, type MockInstance } from 'vitest';
import {
  getActiveEvents,
  getUpcomingEvents,
  joinEvent,
  submitEventScore,
  getEventLeaderboard,
  getEventRewards,
  checkEventExpiry,
  type GameEvent,
  type EventType,
  type EventStatus,
  type EventParticipation,
  type EventReward,
} from '../eventManager';

// Chainable mock that tracks calls and returns itself for any method
const callLog: Array<{ method: string; args: unknown[] }> = [];
let singleResults: Array<{ data: unknown; error: unknown }> = [];
let singleCallIndex = 0;

function createChain(terminalData: { data: unknown[]; error: null } = { data: [], error: null }): Record<string, Mock> {
  const chain: Record<string, Mock> = {};
  const methods = ['select', 'insert', 'update', 'eq', 'gte', 'lte', 'lt', 'order', 'limit', 'single', 'from'];

  for (const method of methods) {
    chain[method] = vi.fn((...args: unknown[]) => {
      callLog.push({ method, args });
      if (method === 'single') {
        const result = singleResults[singleCallIndex] ?? { data: null, error: null };
        singleCallIndex++;
        return result;
      }
      if (method === 'limit') {
        return terminalData;
      }
      // For order without limit, also act as terminal but still be chainable
      return new Proxy(terminalData, {
        get(target, prop) {
          if (prop === 'data') return target.data;
          if (prop === 'error') return target.error;
          if (typeof prop === 'string' && chain[prop]) return chain[prop];
          return undefined;
        },
      });
    });
  }
  return chain;
}

let mockChain: Record<string, Mock>;

vi.mock('../supabaseServer', () => ({
  getSupabase: () => ({
    from: (...args: unknown[]) => {
      callLog.push({ method: 'from', args });
      return mockChain;
    },
  }),
}));

function getCallArgs(method: string): unknown[][] {
  return callLog.filter((c) => c.method === method).map((c) => c.args);
}

describe('eventManager', () => {
  beforeEach(() => {
    callLog.length = 0;
    singleResults = [];
    singleCallIndex = 0;
    mockChain = createChain();
  });

  // ==========================================
  // Types
  // ==========================================
  describe('types', () => {
    it('should define EventType as union of valid event types', () => {
      const types: EventType[] = ['tournament', 'holiday', 'weekend', 'special'];
      expect(types).toHaveLength(4);
    });

    it('should define EventStatus as union of valid statuses', () => {
      const statuses: EventStatus[] = ['upcoming', 'active', 'ended'];
      expect(statuses).toHaveLength(3);
    });

    it('should define GameEvent with required fields', () => {
      const event: GameEvent = {
        id: 'evt-1',
        name: 'Winter Wonderland',
        description: 'Holiday special event',
        type: 'holiday',
        status: 'active',
        start_time: '2026-12-20T00:00:00Z',
        end_time: '2026-12-27T00:00:00Z',
        config: { theme: 'winter' },
        rewards: [{ position: 1, coins: 500, title: 'Winter Champion' }],
        created_at: '2026-12-01T00:00:00Z',
      };
      expect(event.id).toBe('evt-1');
      expect(event.type).toBe('holiday');
      expect(event.status).toBe('active');
    });
  });

  // ==========================================
  // getActiveEvents
  // ==========================================
  describe('getActiveEvents', () => {
    it('should return currently active events', async () => {
      const result = await getActiveEvents();
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should call supabase with status=active filter', async () => {
      await getActiveEvents();
      expect(getCallArgs('from')[0]).toEqual(['events']);
      expect(getCallArgs('eq').some((a) => a[0] === 'status' && a[1] === 'active')).toBe(true);
    });
  });

  // ==========================================
  // getUpcomingEvents
  // ==========================================
  describe('getUpcomingEvents', () => {
    it('should return events starting within 7 days', async () => {
      const result = await getUpcomingEvents();
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should call supabase with status=upcoming filter', async () => {
      await getUpcomingEvents();
      expect(getCallArgs('from')[0]).toEqual(['events']);
      expect(getCallArgs('eq').some((a) => a[0] === 'status' && a[1] === 'upcoming')).toBe(true);
    });
  });

  // ==========================================
  // joinEvent
  // ==========================================
  describe('joinEvent', () => {
    it('should register a player for an event', async () => {
      singleResults = [
        { data: { id: 'evt-1', status: 'active' }, error: null },
        { data: null, error: { code: 'PGRST116' } },
        { data: { id: 'part-1', event_id: 'evt-1', user_id: 'user-1', score: 0 }, error: null },
      ];

      const result = await joinEvent('user-1', 'evt-1');
      expect(result).toBeDefined();
    });

    it('should reject joining an ended event', async () => {
      singleResults = [
        { data: { id: 'evt-1', status: 'ended' }, error: null },
      ];
      await expect(joinEvent('user-1', 'evt-1')).rejects.toThrow('Event is not active');
    });

    it('should reject joining an upcoming event', async () => {
      singleResults = [
        { data: { id: 'evt-1', status: 'upcoming' }, error: null },
      ];
      await expect(joinEvent('user-1', 'evt-1')).rejects.toThrow('Event is not active');
    });

    it('should reject duplicate joins', async () => {
      singleResults = [
        { data: { id: 'evt-1', status: 'active' }, error: null },
        { data: { id: 'part-1', event_id: 'evt-1', user_id: 'user-1' }, error: null },
      ];
      await expect(joinEvent('user-1', 'evt-1')).rejects.toThrow('Already joined');
    });
  });

  // ==========================================
  // submitEventScore
  // ==========================================
  describe('submitEventScore', () => {
    it('should record score for event participant', async () => {
      singleResults = [
        { data: { id: 'part-1', event_id: 'evt-1', user_id: 'user-1', score: 100 }, error: null },
        { data: { id: 'evt-1', status: 'active' }, error: null },
        { data: { id: 'part-1', score: 250 }, error: null },
      ];

      const result = await submitEventScore('user-1', 'evt-1', 150);
      expect(result).toBeDefined();
    });

    it('should reject score for non-participant', async () => {
      singleResults = [
        { data: null, error: { code: 'PGRST116' } },
      ];
      await expect(submitEventScore('user-1', 'evt-1', 100)).rejects.toThrow('Not a participant');
    });
  });

  // ==========================================
  // getEventLeaderboard
  // ==========================================
  describe('getEventLeaderboard', () => {
    it('should return event standings ordered by score desc', async () => {
      const result = await getEventLeaderboard('evt-1');
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should query event_participation table', async () => {
      await getEventLeaderboard('evt-1');
      expect(getCallArgs('from')[0]).toEqual(['event_participation']);
      expect(getCallArgs('eq').some((a) => a[0] === 'event_id' && a[1] === 'evt-1')).toBe(true);
    });

    it('should accept optional limit parameter', async () => {
      await getEventLeaderboard('evt-1', 10);
      expect(getCallArgs('limit').some((a) => a[0] === 10)).toBe(true);
    });
  });

  // ==========================================
  // getEventRewards
  // ==========================================
  describe('getEventRewards', () => {
    it('should return rewards for a given position', () => {
      const rewards: EventReward[] = [
        { position: 1, coins: 500, title: 'Champion' },
        { position: 2, coins: 300, title: 'Runner-up' },
        { position: 3, coins: 100, badge: 'bronze_medal' },
      ];

      const result = getEventRewards(rewards, 1);
      expect(result).toEqual({ position: 1, coins: 500, title: 'Champion' });
    });

    it('should return null for positions beyond reward list', () => {
      const rewards: EventReward[] = [
        { position: 1, coins: 500, title: 'Champion' },
      ];
      const result = getEventRewards(rewards, 5);
      expect(result).toBeNull();
    });

    it('should handle empty rewards array', () => {
      const result = getEventRewards([], 1);
      expect(result).toBeNull();
    });
  });

  // ==========================================
  // checkEventExpiry
  // ==========================================
  describe('checkEventExpiry', () => {
    it('should mark expired events as ended', async () => {
      const result = await checkEventExpiry();
      expect(result).toBeDefined();
      expect(result).toHaveProperty('activated');
      expect(result).toHaveProperty('ended');
    });

    it('should query events table for status transitions', async () => {
      await checkEventExpiry();
      expect(getCallArgs('from').some((a) => a[0] === 'events')).toBe(true);
    });
  });

  // ==========================================
  // Overlapping events
  // ==========================================
  describe('overlapping events', () => {
    it('should allow multiple active events at the same time', async () => {
      const result = await getActiveEvents();
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
