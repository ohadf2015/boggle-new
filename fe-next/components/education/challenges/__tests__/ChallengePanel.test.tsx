import React from 'react';
/**
 * ChallengePanel — full behavior tests (TDD)
 * Component now uses API routes instead of direct Supabase calls.
 */


const createWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
};

import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChallengePanel } from '../ChallengePanel';
import type { DailyChallengeRow, WeeklyQuestRow } from '@/lib/supabase/education/types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ============================================================
// Mocks
// ============================================================

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
  }),
}));

// GET challenges route through getWithAuth (Bearer wrapper); delegate to the
// global.fetch mock each test installs, preserving call args + counts.
vi.mock('@/utils/authFetch', () => ({
  getWithAuth: (...args: unknown[]) => (global.fetch as (...a: unknown[]) => unknown)(...args),
}));

vi.mock('@/components/ui/PageLoader', () => ({
  PageLoader: ({ text }: { text?: string }) => (
    <div data-testid="page-loader">{text}</div>
  ),
}));

vi.mock('../DailyChallengeCard', () => ({
  DailyChallengeCard: ({ challenge, onClaim }: { challenge: DailyChallengeRow; onClaim: (id: string) => void }) => (
    <div data-testid={`daily-card-${challenge.id}`}>
      <span>{challenge.title}</span>
      <button onClick={() => onClaim(challenge.id)}>claim-challenge</button>
    </div>
  ),
}));

vi.mock('../WeeklyChallengeCard', () => ({
  WeeklyChallengeCard: ({ quest, onClaim }: { quest: WeeklyQuestRow; onClaim: (id: string) => void }) => (
    <div data-testid={`weekly-card-${quest.id}`}>
      <span>{quest.title}</span>
      <button onClick={() => onClaim(quest.id)}>claim-quest</button>
    </div>
  ),
}));

// ============================================================
// fetch mock helpers
// ============================================================

function makeFetchResponse(body: object, ok = true) {
  return {
    ok,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response;
}

function setupFetch(daily: DailyChallengeRow[], weekly: WeeklyQuestRow[]) {
  (global.fetch as jest.Mock)
    .mockResolvedValueOnce(makeFetchResponse({ challenges: daily }))
    .mockResolvedValueOnce(makeFetchResponse({ quests: weekly }));
}

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
// Tests
// ============================================================

describe('ChallengePanel', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('loading state', () => {
    it('renders PageLoader while fetching data', () => {
      (global.fetch as jest.Mock).mockReturnValue(new Promise(() => {}));

      render(<ChallengePanel playerId="player-1" />, { wrapper: createWrapper() });

      expect(screen.getByTestId('page-loader')).toBeInTheDocument();
    });

    it('does not render challenge-panel while loading', () => {
      (global.fetch as jest.Mock).mockReturnValue(new Promise(() => {}));

      render(<ChallengePanel playerId="player-1" />, { wrapper: createWrapper() });

      expect(screen.queryByTestId('challenge-panel')).not.toBeInTheDocument();
    });
  });

  describe('loading challenges via API', () => {
    it('calls the daily challenges API endpoint', async () => {
      setupFetch([], []);

      render(<ChallengePanel playerId="player-1" />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/education/challenges/daily');
      });
    });

    it('calls the weekly challenges API endpoint', async () => {
      setupFetch([], []);

      render(<ChallengePanel playerId="player-1" />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/education/challenges/weekly');
      });
    });

    it('renders challenges returned from daily API', async () => {
      const challenges = [makeChallenge({ id: 'ch-a' }), makeChallenge({ id: 'ch-b' })];
      setupFetch(challenges, []);

      render(<ChallengePanel playerId="player-1" />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByTestId('daily-card-ch-a')).toBeInTheDocument();
        expect(screen.getByTestId('daily-card-ch-b')).toBeInTheDocument();
      });
    });

    it('renders quests returned from weekly API', async () => {
      const quests = [makeQuest({ id: 'wq-a' })];
      setupFetch([], quests);

      render(<ChallengePanel playerId="player-1" />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByTestId('weekly-card-wq-a')).toBeInTheDocument();
      });
    });

    it('shows noChallenges message when both collections are empty', async () => {
      setupFetch([], []);

      render(<ChallengePanel playerId="player-1" />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('challenges.noChallenges')).toBeInTheDocument();
      });
    });

    it('does NOT show noChallenges when challenges are present', async () => {
      setupFetch([makeChallenge()], []);

      render(<ChallengePanel playerId="player-1" />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.queryByText('challenges.noChallenges')).not.toBeInTheDocument();
      });
    });
  });

  describe('claiming rewards', () => {
    it('POSTs to daily API with challengeId when claiming a challenge', async () => {
      const challenge = makeChallenge({ id: 'ch-claim-1', completed: true });
      setupFetch([challenge], []);
      // Re-fetch after claim
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(makeFetchResponse({ data: { xpReward: 50 } }))
        .mockResolvedValueOnce(makeFetchResponse({ challenges: [{ ...challenge, claimed: true }] }))
        .mockResolvedValueOnce(makeFetchResponse({ quests: [] }));

      render(<ChallengePanel playerId="player-1" />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByTestId('daily-card-ch-claim-1')).toBeInTheDocument();
      });

      await act(async () => {
        await userEvent.click(screen.getByText('claim-challenge'));
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/education/challenges/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId: 'ch-claim-1' }),
      });
    });

    it('re-fetches challenges after claiming a challenge reward', async () => {
      const challenge = makeChallenge({ id: 'ch-refetch-1', completed: true });
      setupFetch([challenge], []);
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(makeFetchResponse({ data: { xpReward: 50 } }))
        .mockResolvedValueOnce(makeFetchResponse({ challenges: [{ ...challenge, claimed: true }] }))
        .mockResolvedValueOnce(makeFetchResponse({ quests: [] }));

      render(<ChallengePanel playerId="player-1" />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByTestId('daily-card-ch-refetch-1')).toBeInTheDocument();
      });

      await act(async () => {
        await userEvent.click(screen.getByText('claim-challenge'));
      });

      // 2 initial loads + 1 POST + 2 re-fetch loads = 5 calls
      expect(global.fetch).toHaveBeenCalledTimes(5);
    });

    it('POSTs to weekly API with questId when claiming a quest', async () => {
      const quest = makeQuest({ id: 'wq-claim-1', completed: true });
      setupFetch([], [quest]);
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(makeFetchResponse({ data: { xpReward: 300 } }))
        .mockResolvedValueOnce(makeFetchResponse({ challenges: [] }))
        .mockResolvedValueOnce(makeFetchResponse({ quests: [{ ...quest, claimed: true }] }));

      render(<ChallengePanel playerId="player-1" />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByTestId('weekly-card-wq-claim-1')).toBeInTheDocument();
      });

      await act(async () => {
        await userEvent.click(screen.getByText('claim-quest'));
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/education/challenges/weekly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questId: 'wq-claim-1' }),
      });
    });
  });

  describe('re-fetching on playerId change', () => {
    it('re-fetches when playerId prop changes', async () => {
      setupFetch([], []);
      // second render
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(makeFetchResponse({ challenges: [] }))
        .mockResolvedValueOnce(makeFetchResponse({ quests: [] }));

      const { rerender } = render(<ChallengePanel playerId="player-1" />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByTestId('challenge-panel')).toBeInTheDocument();
      });

      rerender(<ChallengePanel playerId="player-2" />, { wrapper: createWrapper() });

      await waitFor(() => {
        // 4 total fetch calls: 2 on mount + 2 on playerId change
        expect(global.fetch).toHaveBeenCalledTimes(4);
      });
    });
  });
});
