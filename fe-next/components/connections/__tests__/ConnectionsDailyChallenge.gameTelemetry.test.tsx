import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ConnectionsDailyChallenge from '../ConnectionsDailyChallenge';
import { DAILY_ATTEMPTS_PER_PUZZLE, DAILY_PUZZLE_COUNT } from '@/lib/connections/daily';

const trackGameStart = vi.fn();
const trackGameEnd = vi.fn();
vi.mock('@/utils/growthTracking', async (orig) => ({
  ...((await orig()) as object),
  trackGameStart: (...a: unknown[]) => trackGameStart(...a),
  trackGameEnd: (...a: unknown[]) => trackGameEnd(...a),
}));
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


describe('ConnectionsDailyChallenge — shared game start/complete', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  it('given a fresh daily, when it opens, then one game_started fires as connections', () => {
    render(<ConnectionsDailyChallenge />);
    expect(trackGameStart).toHaveBeenCalledTimes(1);
    expect(trackGameStart).toHaveBeenCalledWith('connections', expect.objectContaining({ daily: true, daily_restored: false }));
    expect(trackGameEnd).not.toHaveBeenCalled();
  });

  it('given a run left mid-way, when it reopens, then its start is marked restored', () => {
    const first = render(<ConnectionsDailyChallenge />);
    guessWrong();
    first.unmount();
    trackGameStart.mockClear();
    render(<ConnectionsDailyChallenge />);
    expect(trackGameStart).toHaveBeenCalledWith('connections', expect.objectContaining({ daily: true, daily_restored: true }));
  });

  it('given every bridge played out, when the run finishes, then one completed game is logged with the result', () => {
    render(<ConnectionsDailyChallenge />);
    burnWholeRun();
    expect(trackGameEnd).toHaveBeenCalledTimes(1);
    const [mode, , words, completed, , extras] = trackGameEnd.mock.calls[0];
    expect(mode).toBe('connections');
    expect(words).toBe(0);
    expect(completed).toBe(true);
    expect(extras).toMatchObject({ daily: true, isWinner: false, solved: 0, total: DAILY_PUZZLE_COUNT });
  });

  it('given today already finished, when the page opens on the results, then no start or end fires', () => {
    const first = render(<ConnectionsDailyChallenge />);
    burnWholeRun();
    first.unmount();
    vi.clearAllMocks();
    render(<ConnectionsDailyChallenge />);
    expect(trackGameStart).not.toHaveBeenCalled();
    expect(trackGameEnd).not.toHaveBeenCalled();
  });
});
