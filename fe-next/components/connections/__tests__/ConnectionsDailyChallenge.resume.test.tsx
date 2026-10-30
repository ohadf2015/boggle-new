/** Reload, retry and language-switch resilience of the Word Bridge daily. */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ConnectionsDailyChallenge from '../ConnectionsDailyChallenge';
import { DAILY_ATTEMPTS_PER_PUZZLE, DAILY_PUZZLE_COUNT } from '@/lib/connections/daily';
import { dailyResultKey, loadDailyResult } from '@/lib/connections/dailyResultStore';

vi.mock('@/hooks/useDailyPlayedStatus', () => ({
  useDailyPlayedStatus: () => ({ today: { wordHunt: false, wordWheel: false, wordTower: false, connections: true }, streak: { current: 2, longest: 2 } }),
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (k: string) => k }),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, profile: null, isAdmin: false }),
}));
vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => true }));
vi.mock('@/hooks/useHapticFeedback', () => ({
  useHapticFeedback: () => ({ haptic: vi.fn(), customHaptic: vi.fn() }),
  GAME_HAPTICS: { validWord: 10, invalidWord: [1], comboLevelUp: [1] },
}));
vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({ playMatchFoundSound: vi.fn(), playErrorSound: vi.fn(), playVictorySound: vi.fn() }),
}));
const confetti = vi.hoisted(() => ({ fireVictoryConfetti: vi.fn(), fireConfetti: vi.fn() }));
vi.mock('@/utils/confettiUtils', () => confetti);
vi.mock('@/hooks/useRewardedFeatureUnlock', () => ({
  useRewardedFeatureUnlock: () => ({ canShowAd: false, status: 'idle', offer: vi.fn() }),
}));
vi.mock('@/components/ads/ResultsBannerSlot', () => ({ default: () => null }));
vi.mock('@/components/daily/results/NextQuestCta', () => ({
  NextQuestCta: () => <div data-testid="next-quest-cta" />,
}));
const submitDailyScore = vi.fn(async (..._a: unknown[]) => ({ status: 'failed', retryable: false }) as unknown);
const fetchDailyLeaderboard = vi.fn(async () => null);
vi.mock('@/lib/connections/dailyClient', async (orig) => {
  const actual = (await orig()) as object;
  return {
    ...actual,
    todayUTC: () => '2026-05-30',
    getGuestFingerprint: () => 'test-guest',
    advanceClientStreak: () => ({ streak: 1, lastDate: '2026-05-30' }),
    submitDailyScore: (...a: unknown[]) => submitDailyScore(...(a as [])),
    fetchDailyLeaderboard: (...a: unknown[]) => fetchDailyLeaderboard(...(a as [])),
  };
});

function guessWrong() {
  fireEvent.click(screen.getAllByRole('button', { name: 'Z' })[0]);
  fireEvent.click(screen.getByRole('button', { name: 'connections.submit' }));
}

function burnWholeRun() {
  for (let p = 0; p < DAILY_PUZZLE_COUNT; p++) {
    for (let i = 0; i < DAILY_ATTEMPTS_PER_PUZZLE; i++) guessWrong();
    fireEvent.click(screen.getByRole('button', { name: /connections\.next/ }));
  }
}


describe('ConnectionsDailyChallenge — reloads and failed saves', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  it('given strikes spent on bridge 1, when the page reloads, then the run resumes with those strikes spent', () => {
    const first = render(<ConnectionsDailyChallenge />);
    guessWrong();
    guessWrong();
    const before = screen.getByTestId('daily-progress').textContent;
    first.unmount();

    render(<ConnectionsDailyChallenge />);
    expect(screen.getByTestId('daily-progress').textContent).toBe(before);
    for (let i = 0; i < DAILY_ATTEMPTS_PER_PUZZLE - 2; i++) guessWrong();
    expect(screen.getByRole('button', { name: /connections\.next/ })).toBeTruthy();
  });

  it('given the page was only opened, then no run is saved, so a language switch still gets its own set', () => {
    render(<ConnectionsDailyChallenge />).unmount();
    expect(window.localStorage.getItem('connections-daily-run-2026-05-30')).toBeNull();
  });

  it('given an old result saved with rank 0 by the offline path, then no "#0" is shown', () => {
    window.localStorage.setItem(
      dailyResultKey('2026-05-30'),
      JSON.stringify({ kind: 'regular', score: 0, solvedCount: 0, outcomes: [], streak: 0, rank: 0 }),
    );
    render(<ConnectionsDailyChallenge />);
    expect(screen.getByTestId('daily-results-hero').textContent).not.toContain('#0');
  });

  it('given the save fails with a server error, then the results say so and retry sends it again', async () => {
    submitDailyScore.mockResolvedValue({ status: 'failed', retryable: true });
    render(<ConnectionsDailyChallenge />);
    burnWholeRun();
    const notice = await screen.findByTestId('score-save-failed');
    expect(loadDailyResult<{ pendingSubmit: unknown }>('2026-05-30', 'en')?.pendingSubmit).toBeTruthy();

    submitDailyScore.mockResolvedValue({
      status: 'saved',
      result: { success: true, streak: 1, score: 0, currentRank: 3, totalPlayers: 9 },
    });
    fireEvent.click(notice.querySelector('button')!);
    await waitFor(() => expect(screen.queryByTestId('score-save-failed')).toBeNull());
    expect(submitDailyScore).toHaveBeenCalledTimes(2);
    expect(loadDailyResult<{ pendingSubmit: unknown }>('2026-05-30', 'en')?.pendingSubmit).toBeNull();
  });

  it('given a result whose save never landed, when revisited, then it is sent again', async () => {
    window.localStorage.setItem(
      dailyResultKey('2026-05-30'),
      JSON.stringify({ kind: 'regular', score: 0, solvedCount: 0, outcomes: [], streak: 0, rank: null, pendingSubmit: { puzzleDate: '2026-05-30', score: 0 } }),
    );
    render(<ConnectionsDailyChallenge />);
    await waitFor(() => expect(submitDailyScore).toHaveBeenCalledTimes(1));
  });

  it('given a result finished in another language, then switching language does not reopen the day', () => {
    window.localStorage.setItem(
      dailyResultKey('2026-05-30'),
      JSON.stringify({ kind: 'regular', language: 'he', score: 0, solvedCount: 0, outcomes: [], streak: 0, rank: null }),
    );
    render(<ConnectionsDailyChallenge />);
    expect(screen.queryByTestId('daily-progress')).toBeNull();
    expect(screen.getByTestId('daily-results-hero')).toBeTruthy();
  });
});
