import { beforeEach, describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
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
vi.mock('@/utils/confettiUtils', () => ({ fireVictoryConfetti: vi.fn() }));
vi.mock('@/hooks/useRewardedFeatureUnlock', () => ({
  useRewardedFeatureUnlock: () => ({ canShowAd: false, status: 'idle', offer: vi.fn() }),
}));

const mockPyramid = {
  id: 'test-pyramid',
  metaAnswer: 'STONE',
  metaHint: 'Hard and rigid',
  base: [
    {
      id: 'p1',
      word1: 'ROLLING',
      word2: 'TABLET',
      bridge: 'STONE',
      difficulty: 'easy',
    },
    {
      id: 'p2',
      word1: 'RIVER',
      word2: 'FRUIT',
      bridge: 'STONE',
      difficulty: 'medium',
    },
    {
      id: 'p3',
      word1: 'PRECIOUS',
      word2: 'COLD',
      bridge: 'STONE',
      difficulty: 'hard',
    },
  ],
  difficulty: 'medium',
};

vi.mock('@/lib/connections/pyramid/daily', () => ({
  dailyPyramid: () => mockPyramid,
}));

function type(word: string) {
  for (const key of word) fireEvent.keyDown(window, { key });
  fireEvent.keyDown(window, { key: 'Enter' });
}

function setViewport(desktop: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: desktop,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

describe('PyramidChallenge — desktop shell', () => {
  beforeEach(() => setViewport(true));

  it('given a phone, then the pyramid stays above the riddle and is drawn once', () => {
    setViewport(false);
    render(<PyramidChallenge />);
    expect(screen.getAllByTestId('pyramid-apex')).toHaveLength(1);
    expect(within(screen.getByTestId('game-shell-left')).queryByTestId('pyramid-rail-map')).toBeNull();
  });

  it('given a run, then the riddle sits in the shared shell with the pyramid in the start rail', () => {
    render(<PyramidChallenge />);
    expect(screen.getByTestId('game-shell').getAttribute('data-game-shell')).toBe('word-chain');
    expect(within(screen.getByTestId('game-shell-stage')).getByText('ROLLING')).toBeTruthy();
    const left = within(screen.getByTestId('game-shell-left'));
    expect(left.getByTestId('pyramid-rail-map')).toBeTruthy();
    expect(screen.getAllByTestId('pyramid-apex')).toHaveLength(1);
    expect(left.getByTestId('shell-keys')).toBeTruthy();
  });

  it('given no bridge solved yet, then the end rail explains where answers go', () => {
    render(<PyramidChallenge />);
    const right = within(screen.getByTestId('game-shell-right'));
    expect(right.getByText('connections.pyramid.railEmptyTitle')).toBeTruthy();
  });

  it('given a solved bridge, then it lands in the end rail', () => {
    render(<PyramidChallenge />);
    type('STONE');
    const rows = within(screen.getByTestId('game-shell-right')).getAllByTestId(/^shell-word-row-/);
    expect(rows.map((r) => r.getAttribute('data-word'))).toEqual(['STONE']);
  });
});
