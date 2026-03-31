/**
 * Wiring test: OpponentWordFeed mounted in classic MP game view
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ profile: { total_games: 5 } }),
}));

vi.mock('@/hooks/gameState/store', () => ({
  useGameMode: () => 'classic',
  useBlastTileOverlay: () => null,
  useWordHuntTargetLength: () => 0,
  useWordHuntMyLife: () => 100,
  useWordHuntTargetAttempts: () => [],
  useWordHuntTargetFound: () => false,
  useWordHuntPlayerLives: () => ({}),
  useWordHuntEliminatedPlayers: () => [],
}));

vi.mock('@/components/blast/hooks/useBlastMultiplayerBridge', () => ({
  useBlastMultiplayerBridge: () => ({ config: {}, initialTileStates: {}, blastSeed: 0 }),
}));

// Mock InGameScreen to avoid pulling in the entire game tree
vi.mock('@/components/game/InGameScreen', () => ({
  __esModule: true,
  default: () => <div data-testid="in-game-screen" />,
}));

// Mock OpponentWordFeed to verify it's rendered
vi.mock('@/components/multiplayer/OpponentWordFeed', () => ({
  OpponentWordFeed: (props: any) => <div data-testid="opponent-word-feed" />,
}));

// Mock the hook
vi.mock('@/hooks/useOpponentWordFeed', () => ({
  useOpponentWordFeed: () => ({ feedItems: [] }),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));

vi.mock('@/components/ErrorBoundaries', () => ({
  FeatureErrorBoundary: ({ children }: any) => <>{children}</>,
}));

import MultiplayerInGameView from '../MultiplayerInGameView';

describe('MultiplayerInGameView wiring', () => {
  const defaultProps = {
    isHost: false,
    username: 'alice',
    gameCode: 'TEST',
    t: (k: string) => k,
    dir: 'ltr' as const,
    socket: { emit: vi.fn(), on: vi.fn(), off: vi.fn() } as any,
    letterGrid: [['A', 'B'], ['C', 'D']],
    shufflingGrid: null,
    gameActive: true,
    showStartAnimation: false,
    remainingTime: 60,
    gameLanguage: 'en' as const,
    minWordLength: 3,
    comboLevel: 0,
    comboLevelRef: { current: 0 },
    foundWords: [],
    leaderboard: [{ username: 'alice', score: 100 }],
    onWordSubmit: vi.fn(),
  };

  it('renders OpponentWordFeed in classic mode', () => {
    render(<MultiplayerInGameView {...defaultProps} />);
    expect(screen.getByTestId('opponent-word-feed')).toBeInTheDocument();
  });
});
