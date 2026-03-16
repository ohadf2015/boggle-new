/**
 * BlastGameLayout multiplayer rendering tests.
 * Verifies MP UI (timer, leaderboard, hidden SP controls).
 */
import React from 'react';
import { render, screen, act } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mocks (same pattern as BlastGameLayout.hint.test.tsx)
// ---------------------------------------------------------------------------

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...rest }: any) => <div {...rest}>{children}</div>,
    span: ({ children, ...rest }: any) => <span {...rest}>{children}</span>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
  useReducedMotion: () => false,
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en' }),
  useLanguageSafe: () => ({ t: (key: string) => key, language: 'en' }),
}));

jest.mock('@/lib/utils', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
}));

jest.mock('lucide-react', () => ({
  ArrowLeft: () => <span data-testid="arrow-left-icon" />,
  Bomb: () => <span data-testid="bomb-icon" />,
  HelpCircle: () => <span data-testid="help-icon" />,
  Lightbulb: () => <span data-testid="lightbulb-icon" />,
  Shuffle: () => <span data-testid="shuffle-icon" />,
  Star: () => <span data-testid="star-icon" />,
  X: () => <span data-testid="x-icon" />,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, className, ...rest }: any) => (
    <button onClick={onClick} disabled={disabled} className={className} {...rest}>
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/ConfirmationDialog', () => ({
  ConfirmationDialog: () => null,
}));

jest.mock('@/components/game/WordFormingArea', () => ({
  __esModule: true,
  default: () => <div data-testid="word-forming-area" />,
}));

jest.mock('@/components/game/ComboDisplay', () => ({
  __esModule: true,
  default: () => <div data-testid="combo-display" />,
}));

jest.mock('@/components/singleplayer/game/components/DynamicEnergyBackground', () => ({
  DynamicEnergyBackground: () => <div data-testid="energy-bg" />,
}));

jest.mock('../BlastGrid', () => ({
  BlastGrid: () => <div data-testid="blast-grid" />,
}));

jest.mock('../BlastProgressBar', () => ({
  BlastProgressBar: () => <div data-testid="blast-progress-bar" />,
}));

jest.mock('../BlastFoundWords', () => ({
  BlastFoundWords: () => <div data-testid="blast-found-words" />,
}));

jest.mock('../BlastHelpModal', () => ({
  BlastHelpModal: () => <div data-testid="blast-help-modal" />,
}));

jest.mock('../BlastCascadeWordBanner', () => ({
  BlastCascadeWordBanner: () => <div data-testid="blast-cascade-banner" />,
}));

jest.mock('@/components/grid/hapticFeedback', () => ({
  vibrateBlastBomb: jest.fn(),
  vibrateBlastLightning: jest.fn(),
  vibrateBlastPrism: jest.fn(),
  vibrateBlastCascade: jest.fn(),
}));

jest.mock('@/components/CircularTimer', () => ({
  __esModule: true,
  default: ({ remainingTime }: any) => (
    <div data-testid="circular-timer">{remainingTime}</div>
  ),
}));

jest.mock('@/components/game/CompactLeaderboard', () => ({
  CompactLeaderboard: ({ players, currentUsername }: any) => (
    <div data-testid="compact-leaderboard" data-players={JSON.stringify(players)} data-current={currentUsername} />
  ),
  CompactPlayer: {},
}));

jest.mock('@/components/game/LeadChangeBanner', () => ({
  LeadChangeBanner: ({ event }: any) => (
    event ? <div data-testid="lead-change-banner" data-type={event.type}>{event.newLeader}</div> : null
  ),
}));

jest.mock('@/hooks/useLeadChangeDetection', () => ({
  useLeadChangeDetection: jest.fn(() => null),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { BlastGameLayout } from '../BlastGameLayout';
import type { BlastGameState, BlastTileState } from '../types';
import { useLeadChangeDetection } from '@/hooks/useLeadChangeDetection';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const t = (key: string) => key;

const makeGrid = (size = 4): string[][] =>
  Array.from({ length: size }, () => Array.from({ length: size }, () => 'A'));

const makeTile = (row: number, col: number): BlastTileState => ({
  row,
  col,
  type: 'standard',
  isCleared: false,
  activationEffect: null,
  hitsRemaining: 0,
});

const makeTileStates = (size = 4): BlastTileState[][] =>
  Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (_, c) => makeTile(r, c)),
  );

const defaultGameState: BlastGameState = {
  score: 0,
  wordsFound: [],
  tilesCleared: 0,
  totalTiles: 16,
  comboCount: 0,
  isComplete: false,
  isDeadEnd: false,
  cascadeChainLevel: 0,
  movesRemaining: 10,
  movesUsed: 0,
  totalMoves: 10,
  bonusMoveScore: 0,
  tileTypeClears: {} as BlastGameState['tileTypeClears'],
};

const baseProps = {
  grid: makeGrid(),
  tileStates: makeTileStates(),
  gridSize: 4,
  language: 'en' as const,
  explosions: [] as any[],
  scorePopups: [] as any[],
  cascadePhase: 'idle' as const,
  cascadeAnimationData: null,
  cascadeChainLevel: 0,
  cascadeHighlightData: null,
  cascadeHighlightPhase: 'idle' as const,
  gameState: defaultGameState,
  noWordsRemaining: false,
  waveNumber: 1,
  cumulativeScore: 0,
  scoreThreshold: undefined,
  comboLevel: 0,
  comboTimeRemaining: null,
  comboDanger: false,
  formedWord: '',
  currentFeedback: null,
  onWordSubmit: jest.fn(),
  onPathSubmit: jest.fn(),
  onWordChange: jest.fn(),
  onExplosionComplete: jest.fn(),
  onScorePopupComplete: jest.fn(),
  onShuffle: jest.fn(),
  onQuitRequest: jest.fn(),
  onConfirmQuit: jest.fn(),
  onEndGame: jest.fn(),
  showQuitConfirm: false,
  setShowQuitConfirm: jest.fn(),
  showEndGameConfirm: false,
  setShowEndGameConfirm: jest.fn(),
  t,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('BlastGameLayout multiplayer mode', () => {
  it('renders CircularTimer when isMultiplayer and remainingTime is provided', () => {
    render(
      <BlastGameLayout
        {...baseProps}
        isMultiplayer={true}
        remainingTime={45}
        totalTime={120}
      />,
    );
    expect(screen.getByTestId('circular-timer')).toBeInTheDocument();
    expect(screen.getByTestId('circular-timer')).toHaveTextContent('45');
  });

  it('does not render CircularTimer in singleplayer mode', () => {
    render(
      <BlastGameLayout
        {...baseProps}
        isMultiplayer={false}
        remainingTime={45}
      />,
    );
    expect(screen.queryByTestId('circular-timer')).not.toBeInTheDocument();
  });

  it('does not render CircularTimer when remainingTime is null', () => {
    render(
      <BlastGameLayout
        {...baseProps}
        isMultiplayer={true}
        remainingTime={null}
      />,
    );
    expect(screen.queryByTestId('circular-timer')).not.toBeInTheDocument();
  });

  it('does not render CompactLeaderboard in multiplayer (uses lead-change banners instead)', () => {
    const leaderboard = [
      { username: 'alice', score: 100 },
      { username: 'bob', score: 80 },
    ];

    render(
      <BlastGameLayout
        {...baseProps}
        isMultiplayer={true}
        leaderboard={leaderboard}
        username="alice"
      />,
    );
    expect(screen.queryByTestId('compact-leaderboard')).not.toBeInTheDocument();
  });

  it('does not render CompactLeaderboard in singleplayer mode', () => {
    render(
      <BlastGameLayout
        {...baseProps}
        isMultiplayer={false}
        leaderboard={[{ username: 'alice', score: 100 }]}
        username="alice"
      />,
    );
    expect(screen.queryByTestId('compact-leaderboard')).not.toBeInTheDocument();
  });

  it('hides "End Game" button in header when isMultiplayer', () => {
    render(
      <BlastGameLayout {...baseProps} isMultiplayer={true} />,
    );
    expect(screen.queryByText('blast.giveUp')).not.toBeInTheDocument();
  });

  it('shows "End Game" button in header when singleplayer', () => {
    render(
      <BlastGameLayout {...baseProps} isMultiplayer={false} />,
    );
    expect(screen.getByText('blast.giveUp')).toBeInTheDocument();
  });

  it('hides wave badge in multiplayer mode', () => {
    render(
      <BlastGameLayout {...baseProps} isMultiplayer={true} waveNumber={3} />,
    );
    expect(screen.queryByText(/Wave/)).not.toBeInTheDocument();
  });

  it('shows wave badge in singleplayer mode when waveNumber > 1', () => {
    render(
      <BlastGameLayout {...baseProps} isMultiplayer={false} waveNumber={3} />,
    );
    expect(screen.getByText('blast.waveBadge')).toBeInTheDocument();
  });

  it('shows "Leave" instead of "QUIT" in multiplayer header', () => {
    render(
      <BlastGameLayout {...baseProps} isMultiplayer={true} />,
    );
    expect(screen.getByText('common.leave')).toBeInTheDocument();
    expect(screen.queryByText('common.quit')).not.toBeInTheDocument();
  });

  it('shows "QUIT" in singleplayer header', () => {
    render(
      <BlastGameLayout {...baseProps} isMultiplayer={false} />,
    );
    expect(screen.getByText('common.quit')).toBeInTheDocument();
  });

  it('hides hint button in dead-end panel when isMultiplayer', () => {
    render(
      <BlastGameLayout
        {...baseProps}
        isMultiplayer={true}
        noWordsRemaining={true}
        hasHintAvailable={true}
        hintPath={null}
      />,
    );
    expect(screen.queryByText('blast.hint')).not.toBeInTheDocument();
  });

  it('hides "End Game" button in dead-end panel when isMultiplayer', () => {
    render(
      <BlastGameLayout
        {...baseProps}
        isMultiplayer={true}
        noWordsRemaining={true}
      />,
    );
    expect(screen.queryByText('blast.giveUp')).not.toBeInTheDocument();
  });

  it('keeps shuffle button visible in multiplayer dead-end panel', () => {
    render(
      <BlastGameLayout
        {...baseProps}
        isMultiplayer={true}
        noWordsRemaining={true}
      />,
    );
    expect(screen.getByText('blast.shuffle')).toBeInTheDocument();
  });

  it('shows lightweight non-blocking toast in multiplayer mode (not full overlay)', () => {
    const completeState = { ...defaultGameState, isComplete: true };
    const { container } = render(
      <BlastGameLayout
        {...baseProps}
        isMultiplayer={true}
        gameState={completeState}
      />,
    );
    // MP blast shows a lightweight auto-dismiss toast (not the full SP blocking overlay)
    expect(screen.queryByText('blast.complete')).toBeInTheDocument();
    // But no blocking backdrop
    const backdropElements = container.querySelectorAll('.backdrop-blur-sm');
    expect(backdropElements.length).toBe(0);
  });

  it('MP does NOT show blocking backdrop on board complete', () => {
    const completeState = { ...defaultGameState, isComplete: true };
    const { container } = render(
      <BlastGameLayout
        {...baseProps}
        isMultiplayer={true}
        gameState={completeState}
      />,
    );
    const backdropElements = container.querySelectorAll('.backdrop-blur-sm');
    expect(backdropElements.length).toBe(0);
  });

  it('shows board-complete overlay in singleplayer mode when complete', () => {
    const completeState = { ...defaultGameState, isComplete: true };
    render(
      <BlastGameLayout
        {...baseProps}
        isMultiplayer={false}
        gameState={completeState}
      />,
    );
    // The "Board Cleared!" text SHOULD appear in SP
    expect(screen.getByText('blast.complete')).toBeInTheDocument();
  });

  it('SP board-complete overlay HAS blocking backdrop', () => {
    const completeState = { ...defaultGameState, isComplete: true };
    const { container } = render(
      <BlastGameLayout
        {...baseProps}
        isMultiplayer={false}
        gameState={completeState}
      />,
    );
    // SP overlay has the blocking backdrop-blur-sm class
    const backdropElements = container.querySelectorAll('.backdrop-blur-sm');
    expect(backdropElements.length).toBeGreaterThan(0);
  });

  it('does NOT render CompactLeaderboard in multiplayer mode', () => {
    const leaderboard = [
      { username: 'alice', score: 100 },
      { username: 'bob', score: 80 },
    ];

    render(
      <BlastGameLayout
        {...baseProps}
        isMultiplayer={true}
        leaderboard={leaderboard}
        username="alice"
      />,
    );
    expect(screen.queryByTestId('compact-leaderboard')).not.toBeInTheDocument();
  });

  it('renders LeadChangeBanner when useLeadChangeDetection fires in multiplayer', () => {
    (useLeadChangeDetection as jest.Mock).mockReturnValue({
      type: 'took-lead',
      newLeader: 'alice',
    });

    render(
      <BlastGameLayout
        {...baseProps}
        isMultiplayer={true}
        leaderboard={[
          { username: 'alice', score: 100 },
          { username: 'bob', score: 80 },
        ]}
        username="alice"
      />,
    );
    expect(screen.getByTestId('lead-change-banner')).toBeInTheDocument();
    expect(screen.getByTestId('lead-change-banner')).toHaveAttribute('data-type', 'took-lead');
  });

  it('does not render LeadChangeBanner when no lead change event', () => {
    (useLeadChangeDetection as jest.Mock).mockReturnValue(null);

    render(
      <BlastGameLayout
        {...baseProps}
        isMultiplayer={true}
        leaderboard={[
          { username: 'alice', score: 100 },
          { username: 'bob', score: 80 },
        ]}
        username="alice"
      />,
    );
    expect(screen.queryByTestId('lead-change-banner')).not.toBeInTheDocument();
  });

  it('does not render LeadChangeBanner in singleplayer mode', () => {
    (useLeadChangeDetection as jest.Mock).mockReturnValue({
      type: 'took-lead',
      newLeader: 'alice',
    });

    render(
      <BlastGameLayout
        {...baseProps}
        isMultiplayer={false}
      />,
    );
    expect(screen.queryByTestId('lead-change-banner')).not.toBeInTheDocument();
  });
});
