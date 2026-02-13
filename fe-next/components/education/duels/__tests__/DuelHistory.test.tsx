/**
 * DuelHistory Component Tests
 *
 * Tests for duel history list and stats panel
 */

import { render, screen, waitFor } from '@testing-library/react';
import { DuelHistory } from '../DuelHistory';
import { getDuelHistory, getDuelStats, type DuelHistoryEntry, type DuelStatsResult } from '@/lib/supabase/education/duels';

// ============================================
// MOCKS
// ============================================

jest.mock('@/lib/supabase/education/duels');
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, any>) => {
      const translations: Record<string, string> = {
        duelHistory: 'Duel History',
        wins: 'Wins',
        losses: 'Losses',
        draws: 'Draws',
        winStreak: 'Win Streak',
        winRate: 'Win Rate',
        recentDuels: 'Recent Duels',
        noDuelsYet: 'No duels played yet. Challenge a classmate!',
        challengeClassmate: 'Challenge a classmate',
        you: 'You',
        vs: 'vs',
        perOpponentStats: 'Per-Opponent Stats',
      };

      let result = translations[key] || key;
      if (params) {
        Object.keys(params).forEach((k) => {
          result = result.replace(`{${k}}`, String(params[k]));
        });
      }
      return result;
    },
    locale: 'en',
    dir: 'ltr',
  }),
}));

const mockGetDuelHistory = getDuelHistory as jest.MockedFunction<typeof getDuelHistory>;
const mockGetDuelStats = getDuelStats as jest.MockedFunction<typeof getDuelStats>;

// ============================================
// TEST DATA
// ============================================

const mockBoardState = [
  ['C', 'A', 'T', 'S'],
  ['D', 'O', 'G', 'S'],
  ['R', 'A', 'T', 'S'],
  ['B', 'I', 'R', 'D'],
];

const mockDuelHistory: DuelHistoryEntry[] = [
  {
    id: 'duel-1',
    classroom_id: 'class-1',
    challenger_id: 'student-1',
    opponent_id: 'student-2',
    lesson_id: 'lesson-1',
    duel_type: 'async',
    status: 'completed',
    board_state: mockBoardState,
    challenger_score: 150,
    opponent_score: 120,
    winner_id: 'student-1',
    xp_awarded: true,
    created_at: '2026-02-13T10:00:00Z',
    started_at: '2026-02-13T10:05:00Z',
    completed_at: '2026-02-13T10:10:00Z',
    expires_at: '2026-02-14T10:00:00Z',
    challenger: {
      id: 'student-1',
      display_name: 'Alice',
      avatar_url: null,
    },
    opponent: {
      id: 'student-2',
      display_name: 'Bob',
      avatar_url: null,
    },
    isWin: true,
  },
  {
    id: 'duel-2',
    classroom_id: 'class-1',
    challenger_id: 'student-2',
    opponent_id: 'student-1',
    lesson_id: 'lesson-1',
    duel_type: 'async',
    status: 'completed',
    board_state: mockBoardState,
    challenger_score: 180,
    opponent_score: 150,
    winner_id: 'student-2',
    xp_awarded: true,
    created_at: '2026-02-12T10:00:00Z',
    started_at: '2026-02-12T10:05:00Z',
    completed_at: '2026-02-12T10:10:00Z',
    expires_at: '2026-02-13T10:00:00Z',
    challenger: {
      id: 'student-2',
      display_name: 'Bob',
      avatar_url: null,
    },
    opponent: {
      id: 'student-1',
      display_name: 'Alice',
      avatar_url: null,
    },
    isWin: false,
  },
];

const mockStats: DuelStatsResult = {
  wins: 5,
  losses: 3,
  draws: 1,
  winStreak: 4,
  currentStreak: 2,
  opponentStats: new Map([
    ['student-2', { wins: 3, losses: 2 }],
    ['student-3', { wins: 2, losses: 1 }],
  ]),
};

// ============================================
// TEST SUITE
// ============================================

describe('DuelHistory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Stats Panel', () => {
    it('should render stats panel with win/loss/draw counts', async () => {
      mockGetDuelHistory.mockResolvedValue({
        data: mockDuelHistory,
        error: null,
      });

      mockGetDuelStats.mockResolvedValue({
        data: mockStats,
        error: null,
      });

      render(<DuelHistory studentId="student-1" />);

      await waitFor(() => {
        expect(screen.getByText('5')).toBeInTheDocument(); // Wins
        expect(screen.getByText('3')).toBeInTheDocument(); // Losses
        expect(screen.getByText('1')).toBeInTheDocument(); // Draws
      });
    });

    it('should display win streak when >= 3', async () => {
      mockGetDuelHistory.mockResolvedValue({
        data: mockDuelHistory,
        error: null,
      });

      mockGetDuelStats.mockResolvedValue({
        data: mockStats,
        error: null,
      });

      render(<DuelHistory studentId="student-1" />);

      await waitFor(() => {
        expect(screen.getByText('4')).toBeInTheDocument(); // Win streak
      });
    });

    it('should calculate and display win rate percentage', async () => {
      mockGetDuelHistory.mockResolvedValue({
        data: mockDuelHistory,
        error: null,
      });

      mockGetDuelStats.mockResolvedValue({
        data: mockStats,
        error: null,
      });

      render(<DuelHistory studentId="student-1" />);

      // Win rate = 5 / (5 + 3 + 1) = 5 / 9 = 55.6%
      await waitFor(() => {
        expect(screen.getByText(/55\.6%|56%/)).toBeInTheDocument();
      });
    });
  });

  describe('Duel History List', () => {
    it('should render duel history entries with win/loss badges', async () => {
      mockGetDuelHistory.mockResolvedValue({
        data: mockDuelHistory,
        error: null,
      });

      mockGetDuelStats.mockResolvedValue({
        data: mockStats,
        error: null,
      });

      render(<DuelHistory studentId="student-1" />);

      await waitFor(() => {
        // Check opponent names appear (Bob appears in both duels)
        const bobElements = screen.getAllByText('Bob');
        expect(bobElements.length).toBeGreaterThan(0);

        // Check "You" label appears (in score display)
        const youElements = screen.getAllByText('You');
        expect(youElements.length).toBeGreaterThan(0);
      });
    });

    it('should show empty state when no duels', async () => {
      mockGetDuelHistory.mockResolvedValue({
        data: [],
        error: null,
      });

      mockGetDuelStats.mockResolvedValue({
        data: {
          wins: 0,
          losses: 0,
          draws: 0,
          winStreak: 0,
          currentStreak: 0,
          opponentStats: new Map(),
        },
        error: null,
      });

      render(<DuelHistory studentId="student-1" />);

      await waitFor(() => {
        expect(screen.getByText(/No duels played yet/i)).toBeInTheDocument();
      });
    });
  });

  describe('API Calls', () => {
    it('should fetch duel history on mount', async () => {
      mockGetDuelHistory.mockResolvedValue({
        data: mockDuelHistory,
        error: null,
      });

      mockGetDuelStats.mockResolvedValue({
        data: mockStats,
        error: null,
      });

      render(<DuelHistory studentId="student-1" />);

      await waitFor(() => {
        expect(mockGetDuelHistory).toHaveBeenCalledWith('student-1', 20);
        expect(mockGetDuelStats).toHaveBeenCalledWith('student-1');
      });
    });
  });
});
