import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ConnectionsDailyChallenge from '../ConnectionsDailyChallenge';

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
vi.mock('@/utils/confettiUtils', () => ({ fireVictoryConfetti: vi.fn() }));
vi.mock('@/hooks/useRewardedFeatureUnlock', () => ({
  useRewardedFeatureUnlock: () => ({ canShowAd: false, status: 'idle', offer: vi.fn() }),
}));
const submitDailyScore = vi.fn(async () => null);
const fetchDailyLeaderboard = vi.fn(async () => null);
vi.mock('@/lib/connections/dailyClient', async (orig) => {
  const actual = (await orig()) as object;
  return {
    ...actual,
    todayUTC: () => '2026-05-30',
    getGuestFingerprint: () => 'test-guest',
    advanceClientStreak: () => ({ streak: 1, lastDate: '2026-05-30' }),
    submitDailyScore: (...a: unknown[]) => submitDailyScore(...a),
    fetchDailyLeaderboard: (...a: unknown[]) => fetchDailyLeaderboard(...a),
  };
});

describe('ConnectionsDailyChallenge', () => {
  it('loads the daily set and shows progress + the on-screen keyboard', () => {
    render(<ConnectionsDailyChallenge />);
    // progress through the 5-puzzle daily set
    expect(screen.getByTestId('daily-progress').textContent).toContain('1');
    expect(screen.getByTestId('daily-progress').textContent).toContain('5');
    // on-screen keyboard submit key (PuzzleCard reused)
    expect(screen.getByRole('button', { name: 'connections.submit' })).toBeTruthy();
  });
});
