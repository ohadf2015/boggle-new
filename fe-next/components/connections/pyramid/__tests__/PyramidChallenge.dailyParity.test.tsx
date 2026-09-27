/**
 * PyramidChallenge — daily parity. Finishing a pyramid (won or lost) must count
 * as playing the Word Bridge daily quest: it writes the same played-today marker
 * the 5-riddle daily writes (so the hub quest card shows cleared) and advances
 * the same client day streak, and it shows the streak chip on the results card.
 *
 * This is what lets the daily alternate between the two flavors without the
 * pyramid days silently breaking quest progress.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PyramidChallenge from '../PyramidChallenge';

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

const mockPyramid = {
  id: 'parity-pyramid',
  metaAnswer: 'STONE',
  metaHint: 'Hard and rigid',
  base: [
    { id: 'p1', word1: 'ROLLING', word2: 'TABLET', bridge: 'STONE', difficulty: 'easy' },
    { id: 'p2', word1: 'RIVER', word2: 'FRUIT', bridge: 'STONE', difficulty: 'medium' },
    { id: 'p3', word1: 'PRECIOUS', word2: 'COLD', bridge: 'STONE', difficulty: 'hard' },
  ],
  difficulty: 'medium',
};

vi.mock('@/lib/connections/pyramid/daily', () => ({
  dailyPyramid: () => mockPyramid,
}));

const PLAYED_KEY = 'connections-daily-played';
const STREAK_KEY = 'connections-daily-streak';

function typeWord(word: string) {
  for (const ch of word) {
    fireEvent.keyDown(window, { key: ch.toLowerCase() });
  }
}

/** Solve a base stage: type the bridge, submit, press next. */
function solveBaseStage() {
  typeWord('STONE');
  fireEvent.keyDown(window, { key: 'Enter' });
  fireEvent.click(screen.getByText('connections.next'));
}

/** Reach the finale by solving all three base stages. */
function reachFinale() {
  solveBaseStage();
  solveBaseStage();
  solveBaseStage();
}

describe('PyramidChallenge daily parity', () => {
  beforeEach(() => window.localStorage.clear());

  it('marks the Word Bridge daily played and advances the client streak on a win', () => {
    render(<PyramidChallenge />);

    reachFinale();

    // Finale: same slot-typing hook.
    typeWord('STONE');
    fireEvent.keyDown(window, { key: 'Enter' });

    // Terminal card with the streak chip.
    const chip = screen.getByTestId('pyramid-streak-chip');
    expect(chip.textContent).toContain('1');

    // Same markers the 5-riddle daily writes.
    const today = new Date().toISOString().slice(0, 10);
    expect(window.localStorage.getItem(PLAYED_KEY)).toBe(today);
    const streak = JSON.parse(window.localStorage.getItem(STREAK_KEY) ?? 'null');
    expect(streak).toMatchObject({ streak: 1, lastDate: today });
  });

  it('marks played on a loss too (finale defeat still played the quest)', () => {
    render(<PyramidChallenge />);

    reachFinale();

    // Burn the finale budget: 4 wrong guesses (PYRAMID_ATTEMPTS_PER_STAGE = 4)
    // → outOfLives → accept the loss → terminal 'lost'.
    for (let i = 0; i < 4; i++) {
      typeWord('WRONG');
      fireEvent.keyDown(window, { key: 'Enter' });
    }
    fireEvent.click(screen.getByText('connections.pyramid.acceptLoss'));

    const today = new Date().toISOString().slice(0, 10);
    expect(window.localStorage.getItem(PLAYED_KEY)).toBe(today);
    // Parity with the 5-riddle daily: the client streak advances on completion
    // regardless of outcome, so the chip shows on a loss too.
    expect(screen.getByTestId('pyramid-streak-chip').textContent).toContain('1');
  });
});
