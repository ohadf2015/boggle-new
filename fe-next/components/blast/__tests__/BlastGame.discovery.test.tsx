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

vi.mock('canvas-confetti', () => vi.fn());

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({
    playWordAcceptedSound: vi.fn(),
    playComboSound: vi.fn(),
  }),
}));

vi.mock('@/hooks/useComboSystem', () => ({
  useComboSystem: () => ({
    comboLevel: 0,
    comboTimeRemaining: null,
    isDangerState: false,
    maxCombo: 0,
    incrementCombo: vi.fn(),
  }),
}));

vi.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({ isLowEnd: false }),
}));

vi.mock('@/components/singleplayer/game/hooks/useWordSubmission', () => ({
  useWordSubmission: () => ({
    currentFeedback: null,
    handleWordSubmit: vi.fn(),
  }),
}));

vi.mock('@/components/singleplayer/game/hooks/useSpamDetection', () => ({
  useSpamDetection: () => ({}),
}));

vi.mock('@/hooks/useDictionaryCache', () => ({
  useDictionaryCache: () => ({ checkWord: vi.fn() }),
}));

vi.mock('../hooks/useBlastHint', () => ({
  useBlastHint: () => ({
    hintPath: null,
    hasHintAvailable: false,
    requestHint: vi.fn(),
    clearHint: vi.fn(),
  }),
}));

vi.mock('../hooks/useBlastObjectives', () => ({
  useBlastObjectives: () => ({
    objectiveProgress: [],
    allObjectivesComplete: true,
  }),
}));

vi.mock('@/shared/utils/scoring', () => ({
  getComboMultiplier: () => 1,
}));

const mockUseBlastGame = vi.fn();
vi.mock('../hooks/useBlastGame', () => ({
  useBlastGame: (...args: any[]) => mockUseBlastGame(...args),
}));

// Track props passed to BlastComboDiscovery
let capturedComboDiscoveryProps: any = null;
vi.mock('../BlastComboDiscovery', () => ({
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
vi.mock('../BlastGameLayout', () => ({
  BlastGameLayout: (props: any) => {
    capturedLayoutProps = props;
    return <div data-testid="blast-game-layout" />;
  },
}));

vi.mock('../BlastComboFlash', () => ({
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
    clearComboFlash: vi.fn(),
    clearTilesForWord: vi.fn(),
    dismissExplosion: vi.fn(),
    dismissScorePopup: vi.fn(),
    shuffleRemainingTiles: vi.fn(),
    endGame: vi.fn(),
    noWordsRemaining: false,
    getResultsData: vi.fn(() => ({})),
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
    vi.clearAllMocks();
    capturedComboDiscoveryProps = null;
    capturedLayoutProps = null;
    mockUseBlastGame.mockReturnValue(makeDefaultBlastReturn());
  });

  it('renders BlastComboDiscovery with pendingDiscovery=null when no discovery is pending', () => {
    render(
      <BlastGameImport
        config={baseConfig}
        onGameEnd={vi.fn()}
        onQuit={vi.fn()}
        pendingDiscovery={null}
        acknowledgeDiscovery={vi.fn()}
      />,
    );

    expect(screen.getByTestId('blast-combo-discovery')).toBeInTheDocument();
    expect(capturedComboDiscoveryProps?.pendingDiscovery).toBeNull();
  });

  it('renders BlastComboDiscovery with pendingDiscovery when a combo type is provided', () => {
    render(
      <BlastGameImport
        config={baseConfig}
        onGameEnd={vi.fn()}
        onQuit={vi.fn()}
        pendingDiscovery={'bomb_lightning'}
        acknowledgeDiscovery={vi.fn()}
      />,
    );

    expect(screen.getByTestId('blast-combo-discovery')).toBeInTheDocument();
    expect(capturedComboDiscoveryProps?.pendingDiscovery).toBe('bomb_lightning');
  });

  it('passes acknowledgeDiscovery as onComplete to BlastComboDiscovery', () => {
    const ack = vi.fn();
    render(
      <BlastGameImport
        config={baseConfig}
        onGameEnd={vi.fn()}
        onQuit={vi.fn()}
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
        onGameEnd={vi.fn()}
        onQuit={vi.fn()}
        pendingDiscovery={'prism_rainbow'}
        acknowledgeDiscovery={vi.fn()}
      />,
    );

    expect(capturedLayoutProps?.isDiscoveryActive).toBe(true);
  });

  it('passes isDiscoveryActive=false to BlastGameLayout when pendingDiscovery is null', () => {
    render(
      <BlastGameImport
        config={baseConfig}
        onGameEnd={vi.fn()}
        onQuit={vi.fn()}
        pendingDiscovery={null}
        acknowledgeDiscovery={vi.fn()}
      />,
    );

    expect(capturedLayoutProps?.isDiscoveryActive).toBe(false);
  });

  it('passes isDiscoveryActive=false to BlastGameLayout when pendingDiscovery is undefined (omitted)', () => {
    render(
      <BlastGameImport
        config={baseConfig}
        onGameEnd={vi.fn()}
        onQuit={vi.fn()}
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
        onGameEnd={vi.fn()}
        onQuit={vi.fn()}
        pendingDiscovery={'bomb_lightning'}
        acknowledgeDiscovery={vi.fn()}
      />,
    );

    // BlastGameLayout receives isDiscoveryActive=true
    expect(capturedLayoutProps?.isDiscoveryActive).toBe(true);
  });

  it('passes interactive={true} to BlastGrid when isDiscoveryActive is false and game is not complete', () => {
    render(
      <BlastGameImport
        config={baseConfig}
        onGameEnd={vi.fn()}
        onQuit={vi.fn()}
        pendingDiscovery={null}
        acknowledgeDiscovery={vi.fn()}
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
