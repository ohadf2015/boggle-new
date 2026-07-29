/**
 * DuelHistory Component Tests
 *
 * Tests for duel history display with stats panel
 */

import { render, screen, waitFor } from '@testing-library/react';
import { DuelHistory } from '../DuelHistory';
import {
  getDuelHistory,
  getDuelStats,
  type DuelHistoryEntry,
  type DuelStatsResult,
} from '@/lib/supabase/education/duels';

// ============================================
// MOCKS
// ============================================

vi.mock('@/lib/supabase/education/duels');
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, any>) => {
      const translations: Record<string, string> = {
        'duels.loading': 'Loading...',
        'duels.duelHistory': 'Duel History',
        'duels.wins': 'Wins',
        'duels.losses': 'Losses',
        'duels.draws': 'Draws',
        'duels.winStreak': 'Win Streak',
        'duels.winRate': 'Win Rate',
        'duels.recentDuels': 'Recent Duels',
        'duels.noDuelsYet': 'No duels played yet',
        'duels.challengeClassmate': 'Challenge a classmate!',
        'duels.you': 'You',
        'duels.vs': 'vs',
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

const mockStats: DuelStatsResult = {
  wins: 5,
  losses: 3,
  draws: 1,
  winStreak: 2,
  currentStreak: 2,
  opponentStats: new Map(),
};

const mockHistoryEntry: DuelHistoryEntry = {
  id: 'duel-1',
  classroom_id: 'class-1',
  challenger_id: 'student-1',
  opponent_id: 'student-2',
  lesson_id: 'lesson-1',
  duel_type: 'async',
  status: 'completed',
  board_state: null,
  challenger_score: 150,
  opponent_score: 120,
  winner_id: 'student-1',
  xp_awarded: true,
  created_at: '2026-02-13T10:00:00Z',
  started_at: '2026-02-13T10:05:00Z',
  completed_at: '2026-02-13T10:15:00Z',
  expires_at: null,
  challenger: {
    id: 'student-1',
    display_name: 'Alice',
    avatar_config: null,
  },
  opponent: {
    id: 'student-2',
    display_name: 'Bob',
    avatar_config: null,
  },
  isWin: true,
};

// ============================================
// TEST SUITE
// ============================================

describe('DuelHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Stats Panel', () => {
    it('should render stats panel with correct counts', async () => {
      mockGetDuelStats.mockResolvedValue({
        data: mockStats,
        error: null,
      });

      mockGetDuelHistory.mockResolvedValue({
        data: [],
        error: null,
      });

      render(<DuelHistory studentId="student-1" />);

      await waitFor(() => {
        expect(screen.getByText('Wins')).toBeInTheDocument();
      });

      expect(screen.getByText('5')).toBeInTheDocument(); // wins
      expect(screen.getByText('3')).toBeInTheDocument(); // losses
      expect(screen.getByText('1')).toBeInTheDocument(); // draws
    });

    it('should display win streak', async () => {
      mockGetDuelStats.mockResolvedValue({
        data: { ...mockStats, winStreak: 5 },
        error: null,
      });

      mockGetDuelHistory.mockResolvedValue({
        data: [],
        error: null,
      });

      render(<DuelHistory studentId="student-1" />);

      await waitFor(() => {
        expect(screen.getByText('Win Streak')).toBeInTheDocument();
      });

      // Find the win streak stat specifically (not other stats with "5")
      const winStreakSection = screen.getByText('Win Streak').closest('div');
      expect(winStreakSection).toHaveTextContent('5');
    });

    it('should calculate win rate percentage', async () => {
      mockGetDuelStats.mockResolvedValue({
        data: mockStats, // 5 wins out of 9 total = 55.6%
        error: null,
      });

      mockGetDuelHistory.mockResolvedValue({
        data: [],
        error: null,
      });

      render(<DuelHistory studentId="student-1" />);

      await waitFor(() => {
        expect(screen.getByText('Win Rate')).toBeInTheDocument();
      });

      // Win rate = wins / (wins + losses + draws) = 5 / 9 = 55.6%
      expect(screen.getByText(/55.6%|56%/)).toBeInTheDocument();
    });
  });

  describe('Duel History List', () => {
    it('should render duel history entries', async () => {
      mockGetDuelStats.mockResolvedValue({
        data: mockStats,
        error: null,
      });

      mockGetDuelHistory.mockResolvedValue({
        data: [mockHistoryEntry],
        error: null,
      });

      render(<DuelHistory studentId="student-1" />);

      await waitFor(() => {
        expect(screen.getByText('Recent Duels')).toBeInTheDocument();
      });

      // Check opponent name appears in the text
      expect(screen.getAllByText(/vs Bob/)[0]).toBeInTheDocument();

      // Check scores (student vs opponent)
      expect(screen.getByText(/You: 150/)).toBeInTheDocument();
    });

    it('should show win badge for won duel', async () => {
      mockGetDuelStats.mockResolvedValue({
        data: mockStats,
        error: null,
      });

      mockGetDuelHistory.mockResolvedValue({
        data: [mockHistoryEntry],
        error: null,
      });

      render(<DuelHistory studentId="student-1" />);

      await waitFor(() => {
        expect(screen.getByTestId('duel-entry-win')).toBeInTheDocument();
      });
    });

    it('should show loss badge for lost duel', async () => {
      const lossEntry: DuelHistoryEntry = {
        ...mockHistoryEntry,
        winner_id: 'student-2',
        isWin: false,
      };

      mockGetDuelStats.mockResolvedValue({
        data: mockStats,
        error: null,
      });

      mockGetDuelHistory.mockResolvedValue({
        data: [lossEntry],
        error: null,
      });

      render(<DuelHistory studentId="student-1" />);

      await waitFor(() => {
        expect(screen.getByTestId('duel-entry-loss')).toBeInTheDocument();
      });
    });

    it('should show draw badge for tied duel', async () => {
      const drawEntry: DuelHistoryEntry = {
        ...mockHistoryEntry,
        winner_id: null,
        challenger_score: 150,
        opponent_score: 150,
        isWin: false,
      };

      mockGetDuelStats.mockResolvedValue({
        data: mockStats,
        error: null,
      });

      mockGetDuelHistory.mockResolvedValue({
        data: [drawEntry],
        error: null,
      });

      render(<DuelHistory studentId="student-1" />);

      await waitFor(() => {
        expect(screen.getByTestId('duel-entry-draw')).toBeInTheDocument();
      });
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no duels', async () => {
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

      mockGetDuelHistory.mockResolvedValue({
        data: [],
        error: null,
      });

      render(<DuelHistory studentId="student-1" />);

      await waitFor(() => {
        expect(screen.getByText('No duels played yet')).toBeInTheDocument();
      });

      expect(screen.getByText('Challenge a classmate!')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should show loading state initially', () => {
      mockGetDuelStats.mockReturnValue(
        new Promise(() => {}) // Never resolves
      );

      mockGetDuelHistory.mockReturnValue(
        new Promise(() => {})
      );

      render(<DuelHistory studentId="student-1" />);

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });
});
