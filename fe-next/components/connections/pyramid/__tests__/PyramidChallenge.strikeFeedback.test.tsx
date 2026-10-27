/**
 * Every pyramid strike buzzes, not only the first. A second wrong guess on the
 * same stage leaves the status on 'wrong', so feedback keyed on the status
 * transition went silent (the daily 5-riddle run had the same bug, 2026-08-12).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PyramidChallenge from '../PyramidChallenge';

const spies = vi.hoisted(() => ({ haptic: vi.fn(), playErrorSound: vi.fn() }));

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
  useHapticFeedback: () => ({ haptic: spies.haptic, customHaptic: vi.fn() }),
  GAME_HAPTICS: { validWord: 10, invalidWord: [1], comboLevelUp: [1] },
}));
vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({
    playMatchFoundSound: vi.fn(),
    playErrorSound: spies.playErrorSound,
    playVictorySound: vi.fn(),
  }),
}));
vi.mock('@/utils/confettiUtils', () => ({ fireVictoryConfetti: vi.fn(), fireLevelUpConfetti: vi.fn() }));
vi.mock('@/hooks/useRewardedFeatureUnlock', () => ({
  useRewardedFeatureUnlock: () => ({ canShowAd: false, status: 'idle', offer: vi.fn() }),
}));

const pyramid = {
  id: 'strike-pyramid',
  metaAnswer: 'STONE',
  metaHint: 'Hard',
  base: [
    { id: 'p1', word1: 'ROLLING', word2: 'TABLET', bridge: 'STONE', difficulty: 'easy' },
    { id: 'p2', word1: 'RIVER', word2: 'FRUIT', bridge: 'BED', difficulty: 'medium' },
    { id: 'p3', word1: 'PRECIOUS', word2: 'COLD', bridge: 'METAL', difficulty: 'hard' },
  ],
  difficulty: 'medium',
};
vi.mock('@/lib/connections/pyramid/daily', () => ({ dailyPyramid: () => pyramid }));

function guessWrong() {
  fireEvent.click(screen.getAllByRole('button', { name: 'Z' })[0]);
  fireEvent.click(screen.getByRole('button', { name: 'connections.submit' }));
}

describe('pyramid strike feedback', () => {
  beforeEach(() => {
    window.localStorage.clear();
    spies.haptic.mockClear();
    spies.playErrorSound.mockClear();
  });

  it('buzzes and plays the error sound on every strike', () => {
    render(<PyramidChallenge />);
    guessWrong();
    expect(spies.haptic).toHaveBeenCalledTimes(1);
    expect(spies.playErrorSound).toHaveBeenCalledTimes(1);
    guessWrong();
    expect(spies.haptic).toHaveBeenCalledTimes(2);
    expect(spies.playErrorSound).toHaveBeenCalledTimes(2);
  });
});
