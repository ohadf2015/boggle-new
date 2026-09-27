/**
 * Tests for Game Session Logger Module
 * Verifies guest and authenticated game session logging
 */

import { vi, type Mock, type MockInstance } from 'vitest';
import {
  logGameSession,
  updateGameSession,
  getGameSessions,
  getGameSessionStats,
  _resetSupabaseForTesting,
  type GameSessionData,
  type GameSessionUpdateData,
  type GameSessionFilters,
} from '../gameSessionLogger';

// Mock Supabase
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({ data: { id: 'mock-session-id' }, error: null })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({ error: null })),
      })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({ data: [], error: null })),
          })),
        })),
        order: vi.fn(() => ({ data: [], error: null })),
      })),
    })),
  })),
}));

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';

describe('Game Session Logger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetSupabaseForTesting();
  });

  describe('logGameSession', () => {
    it('should log guest game session with guestSessionId', async () => {
      const sessionData: GameSessionData = {
        guestSessionId: 'guest-123',
        mode: 'singleplayer',
        language: 'en',
        score: 100,
        wordsFound: [
          { word: 'test', timestamp: Date.now(), points: 10, length: 4 },
        ],
        durationSeconds: 120,
        completed: true,
        startedAt: new Date(),
      };

      const sessionId = await logGameSession(sessionData);

      expect(sessionId).toBe('mock-session-id');
    });

    it('should log authenticated user game session', async () => {
      const sessionData: GameSessionData = {
        userId: 'user-123',
        mode: 'multiplayer',
        language: 'he',
        score: 150,
        wordsFound: [],
        durationSeconds: 180,
        completed: true,
        roomCode: 'ABC123',
        playerCount: 4,
        finalRank: 1,
        startedAt: new Date(),
      };

      const sessionId = await logGameSession(sessionData);

      expect(sessionId).toBe('mock-session-id');
    });

    it('should return null when neither userId nor guestSessionId provided (check_player_id constraint)', async () => {
      const sessionData: GameSessionData = {
        mode: 'singleplayer',
        language: 'en',
        startedAt: new Date(),
      };

      const sessionId = await logGameSession(sessionData);

      expect(sessionId).toBeNull();
    });

    it('should prefer userId and clear guestSessionId when both are set (XOR constraint)', async () => {
      const { createClient } = await import('@supabase/supabase-js');
      const mockInsert = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({ data: { id: 'mock-session-id' }, error: null })),
        })),
      }));
      (createClient as Mock).mockReturnValueOnce({
        from: vi.fn(() => ({ insert: mockInsert })),
      });

      const sessionData: GameSessionData = {
        userId: 'user-abc',
        guestSessionId: 'guest-xyz',
        mode: 'multiplayer',
        language: 'en',
        startedAt: new Date(),
      };

      const sessionId = await logGameSession(sessionData);

      expect(sessionId).toBe('mock-session-id');
      const insertedRow = (mockInsert.mock.calls as unknown[][])[0]![0] as Record<string, unknown>;
      expect(insertedRow.user_id).toBe('user-abc');
      expect(insertedRow.guest_session_id).toBeNull();
    });

    it('should log daily challenge session for guest', async () => {
      const sessionData: GameSessionData = {
        guestSessionId: 'guest-456',
        mode: 'daily_challenge',
        language: 'en',
        score: 75,
        dailyPuzzleNumber: 42,
        targetWord: 'HELLO',
        targetFound: true,
        attemptsUsed: 3,
        lifeRemaining: 2,
        tokensEarned: 10,
        startedAt: new Date(),
      };

      const sessionId = await logGameSession(sessionData);

      expect(sessionId).toBe('mock-session-id');
    });
  });

  describe('updateGameSession', () => {
    it('should update session with completion data', async () => {
      const updates: GameSessionUpdateData = {
        score: 200,
        completed: true,
        durationSeconds: 240,
        completedAt: new Date(),
      };

      const success = await updateGameSession('session-123', updates);

      expect(success).toBe(true);
    });

    it('should update daily challenge progress', async () => {
      const updates: GameSessionUpdateData = {
        targetFound: true,
        attemptsUsed: 5,
        lifeRemaining: 1,
        tokensEarned: 15,
      };

      const success = await updateGameSession('session-456', updates);

      expect(success).toBe(true);
    });
  });

  describe('getGameSessions', () => {
    it('should fetch sessions for guest by guestSessionId', async () => {
      const filters: GameSessionFilters = {
        guestSessionId: 'guest-789',
        limit: 10,
      };

      const sessions = await getGameSessions(filters);

      expect(Array.isArray(sessions)).toBe(true);
    });

    it('should fetch sessions for authenticated user', async () => {
      const filters: GameSessionFilters = {
        userId: 'user-456',
        mode: 'multiplayer',
        limit: 20,
      };

      const sessions = await getGameSessions(filters);

      expect(Array.isArray(sessions)).toBe(true);
    });

    it('should filter by date range', async () => {
      const filters: GameSessionFilters = {
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-01-31'),
      };

      const sessions = await getGameSessions(filters);

      expect(Array.isArray(sessions)).toBe(true);
    });
  });

  describe('getGameSessionStats', () => {
    it('should return default stats when no sessions', async () => {
      const stats = await getGameSessionStats();

      expect(stats).toEqual({
        totalSessions: 0,
        totalPlayers: 0,
        averageScore: 0,
        averageDuration: 0,
        completionRate: 0,
        modeBreakdown: {},
        languageBreakdown: {},
      });
    });
  });
});
