/**
 * AdventureGameShell — presentational shell for AdventureGame render tail.
 * Tests verify: renders root, propagates exit/pause handlers, spreads overlayProps.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import AdventureGameShell from '../AdventureGameShell';

vi.mock('../themed/GameplayBackground', () => ({
  default: () => <div data-testid="bg" />,
}));
vi.mock('../ui', () => ({
  GameLayout: ({ header, belowHeader, gridArea, sidebar, overlays }: { header: React.ReactNode; belowHeader?: React.ReactNode; gridArea: React.ReactNode; sidebar: React.ReactNode; overlays: React.ReactNode }) => (
    <div data-testid="layout">{header}{belowHeader}{gridArea}{sidebar}{overlays}</div>
  ),
  GameHeader: (p: Record<string, unknown>) => (
    <button data-testid="header" onClick={p.onExit as () => void}>header</button>
  ),
  GameSidebar: () => <div data-testid="sidebar" />,
  GameGridArea: () => <div data-testid="grid" />,
  GameInfoStrip: () => <div data-testid="info-strip" />,
  AdventureHuntClueBoxes: (p: { targetLength: number }) => (
    <div data-testid="clue-boxes" data-length={p.targetLength} />
  ),
  GameLiveRegion: () => <div data-testid="game-live-region" />,
  PrimaryObjectiveBanner: (p: { objectives?: unknown[] }) => (
    <div data-testid="primary-objective-banner" data-count={(p.objectives ?? []).length} />
  ),
}));
vi.mock('../AdventureGameOverlays', () => ({
  default: (p: { handlePauseToggle?: () => void }) => (
    <button data-testid="overlays" onClick={p.handlePauseToggle}>overlays</button>
  ),
}));
vi.mock('../AdventureTailOverlays', () => ({
  default: () => <div data-testid="tail" />,
}));
vi.mock('@/lib/adventure/levelConfig', () => ({
  getWorldConfig: () => ({ colorPrimary: '#000' }),
}));
vi.mock('@/lib/adventure/runeCatalog', () => ({ MAX_EQUIPPED_RUNES: 3 }));

const makeProps = (overrides: Partial<Parameters<typeof AdventureGameShell>[0]> = {}) => {
  const onExit = vi.fn();
  const handlePauseToggle = vi.fn();
  const base = {
    bossOrch: { isBossActive: false, showBossIntro: false, gridEffectTrigger: null, lockedTiles: [] },
    wordSubmit: { mechanicHitCount: 0, handleWordSubmit: vi.fn(), validationFeedback: { error: null, isValid: false, wasSubmitted: false }, lastAccepted: null, wordFeedback: null, mechanicBonus: null, dismissMechanicBonus: vi.fn() },
    gridInteraction: { handleTileSelect: vi.fn(), handleDragStart: vi.fn(), handleDragEnter: vi.fn(), handleDragEnd: vi.fn(), handlePauseToggle },
    modeState: { archetype: 'classic', modeDisplayKey: '', showMoveCounter: false, showLifeBar: false, showTargetWordUI: false, centerLetterRequired: false, centerLetter: null },
    init: { gold: 0, xpProgress: { progressPercent: 0 }, hintData: { level: 'none' }, upgradeEffects: { timeFreezeSeconds: 0, canDetonateWords: false, freeRetriesPerWorld: 0 }, adjustedLevelConfig: { timerSeconds: 120 } },
    gameState: { score: 0, comboCount: 0, wordsFound: [] },
    effects: { shakeRef: { current: null } },
    levelConfig: { world: 1, level: 1, gridSize: 4, themeDisplayKey: null, themedWordCount: 0, themedBonusMultiplier: 1, worldMechanic: null },
    chapterQuests: { quests: [], progress: {} },
    overlayProps: { handlePauseToggle } as never,
    timerStore: {} as never,
    isBossLevel: false,
    showLevelComplete: false,
    isPaused: false,
    isPlaying: true,
    entryPhase: 'playing',
    timeRemaining: 60,
    effectiveComboTimeout: 0,
    masteryAura: 'none',
    currentHP: null,
    maxHP: null,
    movesRemaining: 0,
    themedWordsFound: [],
    upgradeState: {},
    upgradeTriggered: null,
    lastWordWasThemed: false,
    showTutorial: false,
    showRetryAssist: false,
    consecutiveFailures: 0,
    showAutoHint: false,
    currentHint: null,
    nextHintCost: 0,
    hintGoldPending: false,
    freezeUsed: false,
    isFrozen: false,
    shufflesRemaining: 0,
    detonateActive: false,
    hasHintsAvailable: false,
    minWordLength: 3,
    currentWord: '',
    isValidating: false,
    tiles: [],
    selectedIndices: [],
    hintHighlightIndices: [],
    adjacentIndices: [],
    pathPoints: [],
    objectives: [],
    huntTargetWord: null,
    huntAttempts: [],
    huntFound: false,
    bestAttempt: null,
    forgeEquippedRunes: [],
    gridRef: { current: null },
    handleExitWithConfirm: onExit,
    handleCascadeComplete: vi.fn(),
    handleEntryPhaseComplete: vi.fn(),
    handleHintClick: vi.fn(),
    activateFreeze: vi.fn(),
    shuffleTiles: vi.fn(),
    setDetonateActive: vi.fn(),
    handleRetryFromAssist: vi.fn(),
    handleRetryWithBonus: vi.fn(),
    handleRetryWithHint: vi.fn(),
    onExit,
    setShowTutorial: vi.fn(),
    submitHuntGuess: vi.fn(),
    t: (k: string) => k,
  } as never;
  return { ...(base as object), ...overrides, _spies: { onExit, handlePauseToggle } } as never;
};

describe('AdventureGameShell', () => {
  it('renders root with role=main and data-testid', () => {
    const props = makeProps();
    render(<AdventureGameShell {...(props as never)} />);
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByTestId('adventure-game')).toBeInTheDocument();
  });

  it('renders header, grid, sidebar, overlays, and tail', () => {
    render(<AdventureGameShell {...(makeProps() as never)} />);
    expect(screen.getByTestId('header')).toBeInTheDocument();
    expect(screen.getByTestId('grid')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('overlays')).toBeInTheDocument();
    expect(screen.getByTestId('tail')).toBeInTheDocument();
  });

  it('wires handleExitWithConfirm into header onExit', () => {
    const props = makeProps() as unknown as { _spies: { onExit: ReturnType<typeof vi.fn> } };
    render(<AdventureGameShell {...(props as never)} />);
    fireEvent.click(screen.getByTestId('header'));
    expect(props._spies.onExit).toHaveBeenCalled();
  });

  it('forwards overlayProps to AdventureGameOverlays', () => {
    const props = makeProps() as unknown as { _spies: { handlePauseToggle: ReturnType<typeof vi.fn> } };
    render(<AdventureGameShell {...(props as never)} />);
    fireEvent.click(screen.getByTestId('overlays'));
    expect(props._spies.handlePauseToggle).toHaveBeenCalled();
  });

  it('renders hunt clue boxes in belowHeader slot when hunt mode + target loaded', () => {
    const props = {
      ...(makeProps() as object),
      modeState: { archetype: 'hunt', modeDisplayKey: 'adventure.mode.hunt', showMoveCounter: false, showLifeBar: true, showTargetWordUI: true, centerLetterRequired: false, centerLetter: null },
      huntTargetWord: 'APPLE',
      huntAttempts: [],
      huntFound: false,
    };
    render(<AdventureGameShell {...(props as never)} />);
    const box = screen.getByTestId('clue-boxes');
    expect(box).toBeInTheDocument();
    expect(box.getAttribute('data-length')).toBe('5');
  });

  it('does NOT render clue boxes when target word not yet loaded', () => {
    const props = {
      ...(makeProps() as object),
      modeState: { archetype: 'hunt', modeDisplayKey: 'adventure.mode.hunt', showMoveCounter: false, showLifeBar: true, showTargetWordUI: true, centerLetterRequired: false, centerLetter: null },
      huntTargetWord: null,
    };
    render(<AdventureGameShell {...(props as never)} />);
    expect(screen.queryByTestId('clue-boxes')).not.toBeInTheDocument();
  });

  it('applies mastery-aura CSS var on root', () => {
    const props = { ...(makeProps() as object), masteryAura: 'blue' };
    render(<AdventureGameShell {...(props as never)} />);
    const root = screen.getByTestId('adventure-game');
    expect(root.getAttribute('style')).toContain('--mastery-aura');
  });
});
