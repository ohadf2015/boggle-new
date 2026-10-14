/**
 * Word Bridge daily — already played today.
 *
 * Re-opening the daily after finishing (hub card, next-quest CTA, reload) used
 * to start the same five riddles over: the answer key had already been shown
 * and the server keeps the best score, so the replay was a free leaderboard
 * climb. The finished run must come back instead — results, no new submit, no
 * second fanfare.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ConnectionsDailyChallenge from '../ConnectionsDailyChallenge';
import { DAILY_ATTEMPTS_PER_PUZZLE, DAILY_PUZZLE_COUNT, dailyPuzzleSet } from '@/lib/connections/daily';
import { saveDailySnapshot, loadDailySnapshot } from '@/lib/connections/dailySnapshot';

const spies = vi.hoisted(() => ({
  reducedMotion: true,
  playVictorySound: vi.fn(),
  fireVictoryConfetti: vi.fn(),
  submitDailyScore: vi.fn(async () => ({ success: true, streak: 4, score: 0, currentRank: 9, totalPlayers: 30 })),
  fetchDailyLeaderboard: vi.fn(async () => ({
    success: true,
    puzzleDate: '2026-05-30',
    totalPlayers: 30,
    leaderboard: [],
    ownRank: 9,
  })),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (k: string) => k }),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, profile: null, isAdmin: false }),
}));
vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => spies.reducedMotion }));
vi.mock('@/hooks/useHapticFeedback', () => ({
  useHapticFeedback: () => ({ haptic: vi.fn(), customHaptic: vi.fn() }),
  GAME_HAPTICS: { validWord: 10, invalidWord: [1], comboLevelUp: [1] },
}));
vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({
    playMatchFoundSound: vi.fn(),
    playErrorSound: vi.fn(),
    playVictorySound: spies.playVictorySound,
  }),
}));
vi.mock('@/utils/confettiUtils', () => ({ fireVictoryConfetti: spies.fireVictoryConfetti }));
vi.mock('@/components/ads/ResultsBannerSlot', () => ({ default: () => null }));
vi.mock('@/components/daily/results/NextQuestCta', () => ({
  NextQuestCta: () => <div data-testid="next-quest-cta" />,
}));
vi.mock('@/lib/connections/dailyClient', async (orig) => {
  const actual = (await orig()) as object;
  return {
    ...actual,
    todayUTC: () => '2026-05-30',
    getGuestFingerprint: () => 'test-guest',
    advanceClientStreak: () => ({ streak: 1, lastDate: '2026-05-30' }),
    submitDailyScore: spies.submitDailyScore,
    fetchDailyLeaderboard: spies.fetchDailyLeaderboard,
  };
});

const OK = { reached: true, solved: true, wrongAttempts: 0, hintUsed: false };

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

describe('Word Bridge daily — already played today', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
    spies.reducedMotion = true;
  });

  it('given a finished run today, it shows that run instead of starting the riddles again', async () => {
    // Given today's run on this device
    saveDailySnapshot({
      kind: 'bridge',
      dateISO: '2026-05-30',
      language: 'en',
      score: 340,
      solvedCount: 4,
      total: 5,
      outcomes: [OK, OK, OK, OK, { ...OK, solved: false }],
      streak: 3,
      rank: 7,
    });

    // When the daily opens again
    render(<ConnectionsDailyChallenge />);

    // Then the results come back, flagged as already played…
    expect(await screen.findByTestId('daily-already-played')).toBeTruthy();
    expect(screen.getByTestId('score-circle').textContent).toContain('340');
    expect(screen.getByTestId('stat-chip-solved').textContent).toContain('4/5');
    expect(screen.getByTestId('next-quest-cta')).toBeTruthy();
    // …with no playable board, no re-submit and no second fanfare.
    expect(screen.queryByRole('button', { name: 'connections.submit' })).toBeNull();
    expect(spies.submitDailyScore).not.toHaveBeenCalled();
    expect(spies.playVictorySound).not.toHaveBeenCalled();
    expect(spies.fireVictoryConfetti).not.toHaveBeenCalled();
    // The board is refreshed so the rank is today's, not the one at finish time.
    await waitFor(() => expect(spies.fetchDailyLeaderboard).toHaveBeenCalledTimes(1));
  });

  it('given a snapshot from yesterday, today is a fresh run', () => {
    saveDailySnapshot({
      kind: 'bridge',
      dateISO: '2026-05-29',
      language: 'en',
      score: 340,
      solvedCount: 4,
      total: 5,
      outcomes: [OK, OK, OK, OK, OK],
      streak: 3,
      rank: 7,
    });
    render(<ConnectionsDailyChallenge />);
    expect(screen.getByRole('button', { name: 'connections.submit' })).toBeTruthy();
    expect(screen.queryByTestId('daily-already-played')).toBeNull();
  });

  it('given a run that just finished, it is stored with the server streak/rank and survives a reload', async () => {
    // Given a run played to the end
    const first = render(<ConnectionsDailyChallenge />);
    burnWholeRun();
    await waitFor(() => expect(spies.submitDailyScore).toHaveBeenCalledTimes(1));
    // Then it is stored for today, with the numbers the server returned
    await waitFor(() =>
      expect(loadDailySnapshot('2026-05-30')).toMatchObject({
        kind: 'bridge',
        solvedCount: 0,
        total: DAILY_PUZZLE_COUNT,
        streak: 4,
        rank: 9,
      }),
    );
    // The fresh finish is not flagged as a revisit.
    expect(screen.queryByTestId('daily-already-played')).toBeNull();
    first.unmount();

    // When the page is opened again
    render(<ConnectionsDailyChallenge />);
    // Then it is the stored results, not a new board
    expect(await screen.findByTestId('daily-already-played')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'connections.submit' })).toBeNull();
    expect(spies.submitDailyScore).toHaveBeenCalledTimes(1);
  });

  it('celebrates a finished run once, not twice (run + results both used to play it)', async () => {
    // Given full motion and a run with one solved bridge
    spies.reducedMotion = false;
    render(<ConnectionsDailyChallenge />);
    const first = dailyPuzzleSet('2026-05-30', 'en')[0];
    for (const ch of first.bridge) fireEvent.keyDown(window, { key: ch.toLowerCase() });
    fireEvent.keyDown(window, { key: 'Enter' });
    fireEvent.click(screen.getByRole('button', { name: /connections\.next/ }));
    for (let p = 1; p < DAILY_PUZZLE_COUNT; p++) {
      for (let i = 0; i < DAILY_ATTEMPTS_PER_PUZZLE; i++) guessWrong();
      fireEvent.click(screen.getByRole('button', { name: /connections\.next/ }));
    }
    // When the results land
    await screen.findByTestId('score-circle');
    // Then the victory sound plays exactly once
    expect(spies.playVictorySound).toHaveBeenCalledTimes(1);
  });
});
