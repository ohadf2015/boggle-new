import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PyramidChallenge from '../PyramidChallenge';

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
vi.mock('@/utils/confettiUtils', () => ({ fireConfetti: vi.fn(), fireVictoryConfetti: vi.fn() }));
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

describe('PyramidChallenge — shared game start/complete', () => {
  beforeEach(() => { window.localStorage.clear(); vi.clearAllMocks(); });

  it('given a pyramid, when it opens, then one game_started fires as connections', () => {
    render(<PyramidChallenge />);
    expect(trackGameStart).toHaveBeenCalledTimes(1);
    expect(trackGameStart).toHaveBeenCalledWith('connections', expect.objectContaining({ variant: 'pyramid', daily: false }));
  });

  it('given the finale is solved, when the pyramid ends, then one completed game is logged as a win', () => {
    render(<PyramidChallenge />);
    reachFinale();
    typeWord('STONE');
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(trackGameEnd).toHaveBeenCalledTimes(1);
    const [mode, , solved, completed, , extras] = trackGameEnd.mock.calls[0];
    expect(mode).toBe('connections');
    expect(solved).toBe(4);
    expect(completed).toBe(true);
    expect(extras).toMatchObject({ variant: 'pyramid', isWinner: true });
  });
});
