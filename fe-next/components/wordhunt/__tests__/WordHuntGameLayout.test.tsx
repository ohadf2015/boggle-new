/**
 * Tests for WordHuntGameLayout
 * Portrait layout composing SP survival + MP components (no timer display)
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock all child components to isolate layout testing
vi.mock('../WordHuntMPHeader', () => ({
  WordHuntMPHeader: (props: Record<string, unknown>) => <div data-testid="mp-header" data-score={props.score} />,
}));

vi.mock('../WordHuntMPLeaderboard', () => ({
  WordHuntMPLeaderboard: () => <div data-testid="mp-leaderboard" />,
}));

vi.mock('@/components/daily/survival/SurvivalClueBoxes', () => ({
  SurvivalClueBoxes: React.forwardRef(function MockSurvivalClueBoxes(props: Record<string, unknown>, ref: React.Ref<HTMLDivElement>) {
    return <div ref={ref} data-testid="survival-clue-boxes" data-overlay={String(props.showFeedbackOverlay)} />;
  }),
}));

vi.mock('@/components/daily/survival/SurvivalLifeBar', () => ({
  SurvivalLifeBar: (props: Record<string, unknown>) => <div data-testid="survival-life-bar" data-life={props.lifePoints} />,
}));

vi.mock('@/components/daily/survival/SurvivalGridSection', () => ({
  SurvivalGridSection: (props: Record<string, unknown>) => (
    <div data-testid="survival-grid-section" data-game-over={String(props.isGameOver)} />
  ),
}));

vi.mock('../WordHuntGameOverOverlay', () => ({
  WordHuntGameOverOverlay: (props: Record<string, unknown>) => (
    <div data-testid="game-over-overlay" data-reason={props.reason || 'none'} />
  ),
}));

import { WordHuntGameLayout } from '../WordHuntGameLayout';

describe('WordHuntGameLayout', () => {
  const defaultGrid = [
    ['A', 'B', 'C', 'D'],
    ['E', 'F', 'G', 'H'],
    ['I', 'J', 'K', 'L'],
    ['M', 'N', 'O', 'P'],
  ];

  const defaultProps = {
    // Header (no timer props)
    score: 450,
    onQuit: vi.fn(),

    // Clue boxes
    targetLength: 5,
    currentHint: { hint: '_ _ _ _ _', level: 0, unlockCost: 0 },
    attempts: [],
    accumulatedClues: new Map(),
    knownLetters: new Set<string>(),
    latestAttemptFeedback: null,
    showFeedbackOverlay: false,

    // Life bar
    lifePoints: 75,
    isGameOver: false,
    targetFound: false,
    isLifeGaining: false,
    lifeGainAmount: null,

    // Grid
    grid: defaultGrid,
    onWordSubmit: vi.fn(),
    onWordChange: vi.fn(),

    // Word forming
    formedWord: '',
    letterCount: 0,
    wordFeedback: null,

    // Leaderboard
    playerLives: {},
    eliminatedPlayers: [],
    leaderboard: [],
    currentUsername: 'testuser',

    // Clue animation
    isClueGaining: false,

    // Common
    t: (key: string) => key,
    gameDir: 'ltr' as const,
  };

  it('should render all major sections', () => {
    render(<WordHuntGameLayout {...defaultProps} />);

    expect(screen.getByTestId('mp-header')).toBeInTheDocument();
    expect(screen.getByTestId('survival-clue-boxes')).toBeInTheDocument();
    expect(screen.getByTestId('survival-life-bar')).toBeInTheDocument();
    expect(screen.getByTestId('survival-grid-section')).toBeInTheDocument();
    expect(screen.getAllByTestId('mp-leaderboard').length).toBeGreaterThanOrEqual(1);
  });

  it('should pass score to header without timer props', () => {
    render(<WordHuntGameLayout {...defaultProps} score={999} />);
    expect(screen.getByTestId('mp-header')).toHaveAttribute('data-score', '999');
  });

  it('should pass lifePoints to life bar', () => {
    render(<WordHuntGameLayout {...defaultProps} lifePoints={42} />);
    expect(screen.getByTestId('survival-life-bar')).toHaveAttribute('data-life', '42');
  });

  it('should pass showFeedbackOverlay to clue boxes', () => {
    render(<WordHuntGameLayout {...defaultProps} showFeedbackOverlay={true} />);
    expect(screen.getByTestId('survival-clue-boxes')).toHaveAttribute('data-overlay', 'true');
  });

  it('should pass isGameOver to grid section', () => {
    render(<WordHuntGameLayout {...defaultProps} isGameOver={true} />);
    expect(screen.getByTestId('survival-grid-section')).toHaveAttribute('data-game-over', 'true');
  });

});
