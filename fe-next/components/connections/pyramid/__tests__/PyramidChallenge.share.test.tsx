import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import PyramidChallenge from '../PyramidChallenge';

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

describe('PyramidChallenge end-screen share', () => {
  const setNav = (share: unknown, writeText: unknown) => {
    Object.defineProperty(navigator, 'share', { value: share, configurable: true, writable: true });
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
  };
  beforeEach(() => window.localStorage.clear());
  afterEach(() => setNav(undefined, undefined));

  function winAndOpenEnd() {
    render(<PyramidChallenge />);
    reachFinale();
    typeWord('STONE');
    fireEvent.keyDown(window, { key: 'Enter' });
  }

  it('Given the share sheet is dismissed, Then nothing is copied and no copied label shows', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const share = vi.fn().mockRejectedValue(new DOMException('x', 'AbortError'));
    setNav(share, writeText);
    winAndOpenEnd();
    await act(async () => {
      fireEvent.click(screen.getByText('connections.daily.share'));
    });
    expect(share).toHaveBeenCalledOnce();
    expect(writeText).not.toHaveBeenCalled();
    expect(screen.queryByText('connections.daily.copied')).toBeNull();
  });

  it('Given no native share, Then the recap is copied and the copied label shows', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setNav(undefined, writeText);
    winAndOpenEnd();
    await act(async () => {
      fireEvent.click(screen.getByText('connections.daily.share'));
    });
    expect(writeText).toHaveBeenCalledOnce();
    expect(screen.getByText('connections.daily.copied')).toBeInTheDocument();
  });
});
