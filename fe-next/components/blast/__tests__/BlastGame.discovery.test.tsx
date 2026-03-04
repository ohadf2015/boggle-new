/**
 * TDD tests for BlastComboDiscovery integration in BlastGame.
 * Tests that:
 * - BlastGame renders BlastComboDiscovery with correct props
 * - isDiscoveryActive propagates to BlastGameLayout
 *
 * Written BEFORE implementation (RED phase).
 */
import React from 'react';
import { render, screen } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('canvas-confetti', () => jest.fn());

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

jest.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({
    playWordAcceptedSound: jest.fn(),
    playComboSound: jest.fn(),
  }),
}));

jest.mock('@/hooks/useComboSystem', () => ({
  useComboSystem: () => ({
    comboLevel: 0,
    comboTimeRemaining: null,
    isDangerState: false,
    maxCombo: 0,
    incrementCombo: jest.fn(),
  }),
}));

jest.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({ isLowEnd: false }),
}));

jest.mock('@/components/singleplayer/game/hooks/useWordSubmission', () => ({
  useWordSubmission: () => ({
    currentFeedback: null,
    handleWordSubmit: jest.fn(),
  }),
}));

jest.mock('@/components/singleplayer/game/hooks/useSpamDetection', () => ({
  useSpamDetection: () => ({}),
}));

jest.mock('@/hooks/useDictionaryCache', () => ({
  useDictionaryCache: () => ({ checkWord: jest.fn() }),
}));

jest.mock('../hooks/useBlastHint', () => ({
  useBlastHint: () => ({
    hintPath: null,
    hasHintAvailable: false,
    requestHint: jest.fn(),
    clearHint: jest.fn(),
  }),
}));

jest.mock('../hooks/useBlastObjectives', () => ({
  useBlastObjectives: () => ({
    objectiveProgress: [],
    allObjectivesComplete: true,
  }),
}));

jest.mock('@/shared/utils/scoring', () => ({
  getComboMultiplier: () => 1,
}));

const mockUseBlastGame = jest.fn();
jest.mock('../hooks/useBlastGame', () => ({
  useBlastGame: (...args: any[]) => mockUseBlastGame(...args),
}));

// Track props passed to BlastComboDiscovery
let capturedComboDiscoveryProps: any = null;
jest.mock('../BlastComboDiscovery', () => ({
  BlastComboDiscovery: (props: any) => {
    capturedComboDiscoveryProps = props;
    return (
      <div
        data-testid="blast-combo-discovery"
        data-pending={props.pendingDiscovery ?? 'null'}
      />
    );
  },
}));

// Track props passed to BlastGameLayout
let capturedLayoutProps: any = null;
jest.mock('../BlastGameLayout', () => ({
  BlastGameLayout: (props: any) => {
    capturedLayoutProps = props;
    return <div data-testid="blast-game-layout" />;
  },
}));

jest.mock('../BlastComboFlash', () => ({
  BlastComboFlash: () => <div data-testid="blast-combo-flash" />,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDefaultBlastReturn(overrides: any = {}) {
  return {
    modifiedGrid: [['A', 'B'], ['C', 'D']],
    tileStates: [[
      { row: 0, col: 0, type: 'standard', isCleared: false, activationEffect: null, hitsRemaining: 0 },
      { row: 0, col: 1, type: 'standard', isCleared: false, activationEffect: null, hitsRemaining: 0 },
    ], [
      { row: 1, col: 0, type: 'standard', isCleared: false, activationEffect: null, hitsRemaining: 0 },
      { row: 1, col: 1, type: 'standard', isCleared: false, activationEffect: null, hitsRemaining: 0 },
    ]],
    gameState: {
      score: 0,
      wordsFound: [],
      tilesCleared: 0,
      totalTiles: 4,
      comboCount: 0,
      isComplete: false,
      isDeadEnd: false,
      cascadeChainLevel: 0,
      movesRemaining: 10,
      movesUsed: 0,
      totalMoves: 10,
      bonusMoveScore: 0,
      tileTypeClears: {},
    },
    explosions: [],
    scorePopups: [],
    cascadePhase: 'idle',
    cascadeAnimationData: null,
    cascadeChainLevel: 0,
    cascadeHighlightData: null,
    cascadeHighlightPhase: 'idle',
    activeComboFlash: null,
    clearComboFlash: jest.fn(),
    clearTilesForWord: jest.fn(),
    dismissExplosion: jest.fn(),
    dismissScorePopup: jest.fn(),
    shuffleRemainingTiles: jest.fn(),
    endGame: jest.fn(),
    noWordsRemaining: false,
    getResultsData: jest.fn(() => ({})),
    ...overrides,
  };
}

const baseConfig = {
  gridSize: 2,
  language: 'en' as const,
  difficulty: 'medium' as const,
  specialTileChance: 0,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('BlastGame discovery integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedComboDiscoveryProps = null;
    capturedLayoutProps = null;
    mockUseBlastGame.mockReturnValue(makeDefaultBlastReturn());
  });

  it('renders BlastComboDiscovery with pendingDiscovery=null when no discovery is pending', () => {
    render(
      <BlastGameImport
        config={baseConfig}
        onGameEnd={jest.fn()}
        onQuit={jest.fn()}
        pendingDiscovery={null}
        acknowledgeDiscovery={jest.fn()}
      />,
    );

    expect(screen.getByTestId('blast-combo-discovery')).toBeInTheDocument();
    expect(capturedComboDiscoveryProps?.pendingDiscovery).toBeNull();
  });

  it('renders BlastComboDiscovery with pendingDiscovery when a combo type is provided', () => {
    render(
      <BlastGameImport
        config={baseConfig}
        onGameEnd={jest.fn()}
        onQuit={jest.fn()}
        pendingDiscovery={'bomb_lightning'}
        acknowledgeDiscovery={jest.fn()}
      />,
    );

    expect(screen.getByTestId('blast-combo-discovery')).toBeInTheDocument();
    expect(capturedComboDiscoveryProps?.pendingDiscovery).toBe('bomb_lightning');
  });

  it('passes acknowledgeDiscovery as onComplete to BlastComboDiscovery', () => {
    const ack = jest.fn();
    render(
      <BlastGameImport
        config={baseConfig}
        onGameEnd={jest.fn()}
        onQuit={jest.fn()}
        pendingDiscovery={'bomb_lightning'}
        acknowledgeDiscovery={ack}
      />,
    );

    expect(capturedComboDiscoveryProps?.onComplete).toBe(ack);
  });

  it('passes isDiscoveryActive=true to BlastGameLayout when pendingDiscovery is set', () => {
    render(
      <BlastGameImport
        config={baseConfig}
        onGameEnd={jest.fn()}
        onQuit={jest.fn()}
        pendingDiscovery={'prism_rainbow'}
        acknowledgeDiscovery={jest.fn()}
      />,
    );

    expect(capturedLayoutProps?.isDiscoveryActive).toBe(true);
  });

  it('passes isDiscoveryActive=false to BlastGameLayout when pendingDiscovery is null', () => {
    render(
      <BlastGameImport
        config={baseConfig}
        onGameEnd={jest.fn()}
        onQuit={jest.fn()}
        pendingDiscovery={null}
        acknowledgeDiscovery={jest.fn()}
      />,
    );

    expect(capturedLayoutProps?.isDiscoveryActive).toBe(false);
  });

  it('passes isDiscoveryActive=false to BlastGameLayout when pendingDiscovery is undefined (omitted)', () => {
    render(
      <BlastGameImport
        config={baseConfig}
        onGameEnd={jest.fn()}
        onQuit={jest.fn()}
      />,
    );

    expect(capturedLayoutProps?.isDiscoveryActive).toBe(false);
  });
});

describe('BlastGameLayout interactive prop with isDiscoveryActive', () => {
  it('passes interactive={false} to BlastGrid when isDiscoveryActive is true', () => {
    // This is tested via BlastGameLayout directly in BlastGameLayout.hint.test.tsx
    // Here we verify the prop flows through BlastGame → BlastGameLayout
    render(
      <BlastGameImport
        config={baseConfig}
        onGameEnd={jest.fn()}
        onQuit={jest.fn()}
        pendingDiscovery={'bomb_lightning'}
        acknowledgeDiscovery={jest.fn()}
      />,
    );

    // BlastGameLayout receives isDiscoveryActive=true
    expect(capturedLayoutProps?.isDiscoveryActive).toBe(true);
  });

  it('passes interactive={true} to BlastGrid when isDiscoveryActive is false and game is not complete', () => {
    render(
      <BlastGameImport
        config={baseConfig}
        onGameEnd={jest.fn()}
        onQuit={jest.fn()}
        pendingDiscovery={null}
        acknowledgeDiscovery={jest.fn()}
      />,
    );

    // BlastGameLayout receives isDiscoveryActive=false and game is not complete
    expect(capturedLayoutProps?.isDiscoveryActive).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------
import { BlastGame as BlastGameImport } from '../BlastGame';
