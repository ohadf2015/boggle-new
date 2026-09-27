/**
 * Every strike buzzes, not just the first.
 *
 * Player report 2026-08-12 (/he/daily): "second strike on word bridge doest not
 * vibrate like the first". The feedback fired on a status TRANSITION into
 * 'wrong', but a second wrong guess on the same bridge leaves the status at
 * 'wrong' — so strikes 2..n were silent.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ConnectionsDailyChallenge from '../ConnectionsDailyChallenge';
import { DAILY_ATTEMPTS_PER_PUZZLE } from '@/lib/connections/daily';

const spies = vi.hoisted(() => ({
  haptic: vi.fn(),
  customHaptic: vi.fn(),
  playErrorSound: vi.fn(),
  playMatchFoundSound: vi.fn(),
  playVictorySound: vi.fn(),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (k: string) => k }),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, profile: null, isAdmin: false }),
}));
vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => true }));
vi.mock('@/hooks/useHapticFeedback', () => ({
  useHapticFeedback: () => ({ haptic: spies.haptic, customHaptic: spies.customHaptic }),
  GAME_HAPTICS: { validWord: 10, invalidWord: [1], comboLevelUp: [1] },
}));
vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({
    playMatchFoundSound: spies.playMatchFoundSound,
    playErrorSound: spies.playErrorSound,
    playVictorySound: spies.playVictorySound,
  }),
}));
vi.mock('@/utils/confettiUtils', () => ({ fireVictoryConfetti: vi.fn() }));
vi.mock('@/hooks/useRewardedFeatureUnlock', () => ({
  useRewardedFeatureUnlock: () => ({ canShowAd: false, status: 'idle', offer: vi.fn() }),
}));
vi.mock('@/components/ads/ResultsBannerSlot', () => ({
  default: () => <div data-testid="results-banner" />,
}));
vi.mock('@/lib/connections/dailyClient', async (orig) => {
  const actual = (await orig()) as object;
  return {
    ...actual,
    todayUTC: () => '2026-05-30',
    getGuestFingerprint: () => 'test-guest',
    advanceClientStreak: () => ({ streak: 1, lastDate: '2026-05-30' }),
    submitDailyScore: vi.fn(async () => null),
    fetchDailyLeaderboard: vi.fn(async () => null),
  };
});

/** Submit one wrong guess through the on-screen keyboard + submit key. */
function guessWrong() {
  fireEvent.click(screen.getAllByRole('button', { name: 'Z' })[0]);
  fireEvent.click(screen.getByRole('button', { name: 'connections.submit' }));
}

describe('daily bridge strike feedback', () => {
  beforeEach(() => {
    window.localStorage.clear();
    Object.values(spies).forEach((s) => s.mockClear());
  });

  it('buzzes and plays the error sound on every strike, not only the first', () => {
    // Needs at least two strikes before the reveal to be a meaningful check.
    expect(DAILY_ATTEMPTS_PER_PUZZLE).toBeGreaterThan(2);
    render(<ConnectionsDailyChallenge />);

    guessWrong();
    expect(spies.haptic).toHaveBeenCalledTimes(1);
    expect(spies.playErrorSound).toHaveBeenCalledTimes(1);

    guessWrong();
    expect(spies.haptic).toHaveBeenCalledTimes(2);
    expect(spies.playErrorSound).toHaveBeenCalledTimes(2);
    expect(spies.haptic).toHaveBeenLastCalledWith('error');
  });
});
