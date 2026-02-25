/**
 * ChallengePanel — full behavior tests (TDD)
 */

import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChallengePanel } from '../ChallengePanel';
import type { DailyChallengeRow, WeeklyQuestRow } from '@/lib/supabase/education/types';

// ============================================================
// Mocks
// ============================================================

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
  }),
}));

const mockGetDailyChallenges = jest.fn();
const mockGetWeeklyQuests = jest.fn();
const mockAssignDailyChallenges = jest.fn();
const mockAssignWeeklyQuests = jest.fn();
const mockClaimChallengeReward = jest.fn();
const mockClaimQuestReward = jest.fn();

jest.mock('@/lib/supabase/education', () => ({
  getDailyChallenges: (...args: unknown[]) => mockGetDailyChallenges(...args),
  getWeeklyQuests: (...args: unknown[]) => mockGetWeeklyQuests(...args),
  assignDailyChallenges: (...args: unknown[]) => mockAssignDailyChallenges(...args),
  assignWeeklyQuests: (...args: unknown[]) => mockAssignWeeklyQuests(...args),
  claimChallengeReward: (...args: unknown[]) => mockClaimChallengeReward(...args),
  claimQuestReward: (...args: unknown[]) => mockClaimQuestReward(...args),
}));

jest.mock('@/components/ui/PageLoader', () => ({
  PageLoader: ({ text }: { text?: string }) => (
    <div data-testid="page-loader">{text}</div>
  ),
}));

jest.mock('../DailyChallengeCard', () => ({
  DailyChallengeCard: ({ challenge, onClaim }: { challenge: DailyChallengeRow; onClaim: (id: string) => void }) => (
    <div data-testid={`daily-card-${challenge.id}`}>
      <span>{challenge.title}</span>
      <button onClick={() => onClaim(challenge.id)}>claim-challenge</button>
    </div>
  ),
}));

jest.mock('../WeeklyChallengeCard', () => ({
  WeeklyChallengeCard: ({ quest, onClaim }: { quest: WeeklyQuestRow; onClaim: (id: string) => void }) => (
    <div data-testid={`weekly-card-${quest.id}`}>
      <span>{quest.title}</span>
      <button onClick={() => onClaim(quest.id)}>claim-quest</button>
    </div>
  ),
}));

// ============================================================
// Test data
// ============================================================

const makeChallenge = (overrides: Partial<DailyChallengeRow> = {}): DailyChallengeRow => ({
  id: 'ch-1',
  player_id: 'player-1',
  challenge_date: '2026-02-25',
  challenge_type: 'practice_sessions',
  challenge_tier: 'easy',
  title: 'challenges.daily.practiceSessions',
  description: 'challenges.daily.practiceSessionsDesc',
  target_value: 3,
  current_value: 0,
  xp_reward: 50,
  bonus_reward: { coins: 10 },
  completed: false,
  completed_at: null,
  claimed: false,
  claimed_at: null,
  created_at: '2026-02-25T00:00:00Z',
  ...overrides,
});

const makeQuest = (overrides: Partial<WeeklyQuestRow> = {}): WeeklyQuestRow => ({
  id: 'wq-1',
  player_id: 'player-1',
  week_start: '2026-02-24',
  quest_type: 'words_mastered',
  title: 'challenges.weekly.masterWords',
  description: 'challenges.weekly.masterWordsDesc',
  requirements: { target: 20 },
  current_progress: { count: 0 },
  xp_reward: 300,
  bonus_rewards: { coins: 50 },
  completed: false,
  completed_at: null,
  claimed: false,
  created_at: '2026-02-24T00:00:00Z',
  ...overrides,
});

// ============================================================
// Helpers
// ============================================================

function setup() {
  mockGetDailyChallenges.mockReset();
  mockGetWeeklyQuests.mockReset();
  mockAssignDailyChallenges.mockReset();
  mockAssignWeeklyQuests.mockReset();
  mockClaimChallengeReward.mockReset();
  mockClaimQuestReward.mockReset();
}

// ============================================================
// Tests
// ============================================================

describe('ChallengePanel', () => {
  beforeEach(setup);

  describe('loading state', () => {
    it('renders PageLoader while fetching data', () => {
      // Never resolves → stuck in loading
      mockGetDailyChallenges.mockReturnValue(new Promise(() => {}));
      mockGetWeeklyQuests.mockReturnValue(new Promise(() => {}));

      render(<ChallengePanel playerId="player-1" />);

      expect(screen.getByTestId('page-loader')).toBeInTheDocument();
    });

    it('does not render challenge-panel while loading', () => {
      mockGetDailyChallenges.mockReturnValue(new Promise(() => {}));
      mockGetWeeklyQuests.mockReturnValue(new Promise(() => {}));

      render(<ChallengePanel playerId="player-1" />);

      expect(screen.queryByTestId('challenge-panel')).not.toBeInTheDocument();
    });
  });

  describe('auto-assignment of daily challenges', () => {
    it('calls assignDailyChallenges when fetch returns empty array', async () => {
      mockGetDailyChallenges.mockResolvedValue({ data: [], error: null });
      mockGetWeeklyQuests.mockResolvedValue({ data: [], error: null });
      mockAssignDailyChallenges.mockResolvedValue({ data: [], error: null });
      mockAssignWeeklyQuests.mockResolvedValue({ data: [], error: null });

      render(<ChallengePanel playerId="player-1" />);

      await waitFor(() => {
        expect(mockAssignDailyChallenges).toHaveBeenCalledWith('player-1');
      });
    });

    it('does NOT call assignDailyChallenges when challenges already exist', async () => {
      const challenge = makeChallenge();
      mockGetDailyChallenges.mockResolvedValue({ data: [challenge], error: null });
      mockGetWeeklyQuests.mockResolvedValue({ data: [], error: null });
      mockAssignWeeklyQuests.mockResolvedValue({ data: [], error: null });

      render(<ChallengePanel playerId="player-1" />);

      await waitFor(() => {
        expect(screen.getByTestId('challenge-panel')).toBeInTheDocument();
      });

      expect(mockAssignDailyChallenges).not.toHaveBeenCalled();
    });

    it('renders assigned challenges returned by assignDailyChallenges', async () => {
      const assigned = [makeChallenge({ id: 'assigned-1' })];
      mockGetDailyChallenges.mockResolvedValue({ data: [], error: null });
      mockGetWeeklyQuests.mockResolvedValue({ data: [], error: null });
      mockAssignDailyChallenges.mockResolvedValue({ data: assigned, error: null });
      mockAssignWeeklyQuests.mockResolvedValue({ data: [], error: null });

      render(<ChallengePanel playerId="player-1" />);

      await waitFor(() => {
        expect(screen.getByTestId('daily-card-assigned-1')).toBeInTheDocument();
      });
    });
  });

  describe('auto-assignment of weekly quests', () => {
    it('calls assignWeeklyQuests when fetch returns empty array', async () => {
      mockGetDailyChallenges.mockResolvedValue({ data: [], error: null });
      mockGetWeeklyQuests.mockResolvedValue({ data: [], error: null });
      mockAssignDailyChallenges.mockResolvedValue({ data: [], error: null });
      mockAssignWeeklyQuests.mockResolvedValue({ data: [], error: null });

      render(<ChallengePanel playerId="player-1" />);

      await waitFor(() => {
        expect(mockAssignWeeklyQuests).toHaveBeenCalledWith('player-1');
      });
    });

    it('does NOT call assignWeeklyQuests when quests already exist', async () => {
      const quest = makeQuest();
      mockGetDailyChallenges.mockResolvedValue({ data: [], error: null });
      mockGetWeeklyQuests.mockResolvedValue({ data: [quest], error: null });
      mockAssignDailyChallenges.mockResolvedValue({ data: [], error: null });

      render(<ChallengePanel playerId="player-1" />);

      await waitFor(() => {
        expect(screen.getByTestId('challenge-panel')).toBeInTheDocument();
      });

      expect(mockAssignWeeklyQuests).not.toHaveBeenCalled();
    });

    it('renders assigned quests returned by assignWeeklyQuests', async () => {
      const assigned = [makeQuest({ id: 'wq-assigned-1' })];
      mockGetDailyChallenges.mockResolvedValue({ data: [], error: null });
      mockGetWeeklyQuests.mockResolvedValue({ data: [], error: null });
      mockAssignDailyChallenges.mockResolvedValue({ data: [], error: null });
      mockAssignWeeklyQuests.mockResolvedValue({ data: assigned, error: null });

      render(<ChallengePanel playerId="player-1" />);

      await waitFor(() => {
        expect(screen.getByTestId('weekly-card-wq-assigned-1')).toBeInTheDocument();
      });
    });
  });

  describe('rendering content', () => {
    it('renders daily challenge cards when challenges exist', async () => {
      const challenges = [makeChallenge({ id: 'ch-a' }), makeChallenge({ id: 'ch-b', challenge_tier: 'medium' })];
      mockGetDailyChallenges.mockResolvedValue({ data: challenges, error: null });
      mockGetWeeklyQuests.mockResolvedValue({ data: [], error: null });
      mockAssignWeeklyQuests.mockResolvedValue({ data: [], error: null });

      render(<ChallengePanel playerId="player-1" />);

      await waitFor(() => {
        expect(screen.getByTestId('daily-card-ch-a')).toBeInTheDocument();
        expect(screen.getByTestId('daily-card-ch-b')).toBeInTheDocument();
      });
    });

    it('renders weekly quest cards when quests exist', async () => {
      const quests = [makeQuest({ id: 'wq-a' })];
      mockGetDailyChallenges.mockResolvedValue({ data: [], error: null });
      mockGetWeeklyQuests.mockResolvedValue({ data: quests, error: null });
      mockAssignDailyChallenges.mockResolvedValue({ data: [], error: null });

      render(<ChallengePanel playerId="player-1" />);

      await waitFor(() => {
        expect(screen.getByTestId('weekly-card-wq-a')).toBeInTheDocument();
      });
    });

    it('shows noChallenges message when both collections are empty', async () => {
      mockGetDailyChallenges.mockResolvedValue({ data: [], error: null });
      mockGetWeeklyQuests.mockResolvedValue({ data: [], error: null });
      mockAssignDailyChallenges.mockResolvedValue({ data: [], error: null });
      mockAssignWeeklyQuests.mockResolvedValue({ data: [], error: null });

      render(<ChallengePanel playerId="player-1" />);

      await waitFor(() => {
        expect(screen.getByText('challenges.noChallenges')).toBeInTheDocument();
      });
    });

    it('does NOT show noChallenges when challenges are present', async () => {
      mockGetDailyChallenges.mockResolvedValue({ data: [makeChallenge()], error: null });
      mockGetWeeklyQuests.mockResolvedValue({ data: [], error: null });
      mockAssignWeeklyQuests.mockResolvedValue({ data: [], error: null });

      render(<ChallengePanel playerId="player-1" />);

      await waitFor(() => {
        expect(screen.queryByText('challenges.noChallenges')).not.toBeInTheDocument();
      });
    });
  });

  describe('claiming rewards', () => {
    it('calls claimChallengeReward with challengeId and playerId', async () => {
      const challenge = makeChallenge({ id: 'ch-claim-1', completed: true });
      mockGetDailyChallenges.mockResolvedValue({ data: [challenge], error: null });
      mockGetWeeklyQuests.mockResolvedValue({ data: [], error: null });
      mockAssignWeeklyQuests.mockResolvedValue({ data: [], error: null });
      mockClaimChallengeReward.mockResolvedValue({ data: { xpReward: 50 }, error: null });
      // Re-fetch after claim
      mockGetDailyChallenges.mockResolvedValueOnce({ data: [challenge], error: null })
        .mockResolvedValue({ data: [{ ...challenge, claimed: true }], error: null });

      render(<ChallengePanel playerId="player-1" />);

      await waitFor(() => {
        expect(screen.getByTestId('daily-card-ch-claim-1')).toBeInTheDocument();
      });

      await act(async () => {
        await userEvent.click(screen.getByText('claim-challenge'));
      });

      expect(mockClaimChallengeReward).toHaveBeenCalledWith('ch-claim-1', 'player-1');
    });

    it('re-fetches challenges after claiming a challenge reward', async () => {
      const challenge = makeChallenge({ id: 'ch-refetch-1', completed: true });
      mockGetDailyChallenges
        .mockResolvedValueOnce({ data: [challenge], error: null })
        .mockResolvedValue({ data: [{ ...challenge, claimed: true }], error: null });
      mockGetWeeklyQuests.mockResolvedValue({ data: [], error: null });
      mockAssignWeeklyQuests.mockResolvedValue({ data: [], error: null });
      mockClaimChallengeReward.mockResolvedValue({ data: { xpReward: 50 }, error: null });

      render(<ChallengePanel playerId="player-1" />);

      await waitFor(() => {
        expect(screen.getByTestId('daily-card-ch-refetch-1')).toBeInTheDocument();
      });

      await act(async () => {
        await userEvent.click(screen.getByText('claim-challenge'));
      });

      // getDailyChallenges called once on mount + once after claim
      expect(mockGetDailyChallenges).toHaveBeenCalledTimes(2);
    });

    it('calls claimQuestReward with questId and playerId', async () => {
      const quest = makeQuest({ id: 'wq-claim-1', completed: true });
      mockGetDailyChallenges.mockResolvedValue({ data: [], error: null });
      mockGetWeeklyQuests.mockResolvedValue({ data: [quest], error: null });
      mockAssignDailyChallenges.mockResolvedValue({ data: [], error: null });
      mockClaimQuestReward.mockResolvedValue({ data: { xpReward: 300 }, error: null });
      mockGetWeeklyQuests
        .mockResolvedValueOnce({ data: [quest], error: null })
        .mockResolvedValue({ data: [{ ...quest, claimed: true }], error: null });

      render(<ChallengePanel playerId="player-1" />);

      await waitFor(() => {
        expect(screen.getByTestId('weekly-card-wq-claim-1')).toBeInTheDocument();
      });

      await act(async () => {
        await userEvent.click(screen.getByText('claim-quest'));
      });

      expect(mockClaimQuestReward).toHaveBeenCalledWith('wq-claim-1', 'player-1');
    });
  });

  describe('re-fetching on playerId change', () => {
    it('re-fetches when playerId prop changes', async () => {
      mockGetDailyChallenges.mockResolvedValue({ data: [], error: null });
      mockGetWeeklyQuests.mockResolvedValue({ data: [], error: null });
      mockAssignDailyChallenges.mockResolvedValue({ data: [], error: null });
      mockAssignWeeklyQuests.mockResolvedValue({ data: [], error: null });

      const { rerender } = render(<ChallengePanel playerId="player-1" />);

      await waitFor(() => {
        expect(screen.getByTestId('challenge-panel')).toBeInTheDocument();
      });

      rerender(<ChallengePanel playerId="player-2" />);

      await waitFor(() => {
        expect(mockGetDailyChallenges).toHaveBeenCalledWith('player-2');
      });
    });
  });
});
