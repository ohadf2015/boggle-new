/**
 * Tests for WordHuntGameLayout
 * Portrait layout composing SP survival + MP components
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock all child components to isolate layout testing
jest.mock('../WordHuntMPHeader', () => ({
  WordHuntMPHeader: (props: Record<string, unknown>) => <div data-testid="mp-header" data-score={props.score} />,
}));

jest.mock('../WordHuntMPLeaderboard', () => ({
  WordHuntMPLeaderboard: () => <div data-testid="mp-leaderboard" />,
}));

jest.mock('@/components/daily/survival/SurvivalClueBoxes', () => ({
  SurvivalClueBoxes: React.forwardRef(function MockSurvivalClueBoxes(props: Record<string, unknown>, ref: React.Ref<HTMLDivElement>) {
    return <div ref={ref} data-testid="survival-clue-boxes" data-overlay={String(props.showFeedbackOverlay)} />;
  }),
}));

jest.mock('@/components/daily/survival/SurvivalLifeBar', () => ({
  SurvivalLifeBar: (props: Record<string, unknown>) => <div data-testid="survival-life-bar" data-life={props.lifePoints} />,
}));

jest.mock('@/components/daily/survival/SurvivalGridSection', () => ({
  SurvivalGridSection: (props: Record<string, unknown>) => (
    <div data-testid="survival-grid-section" data-game-over={String(props.isGameOver)} />
  ),
}));

jest.mock('@/components/game/WordFormingArea', () => {
  const MockWordFormingArea = (props: Record<string, unknown>) => (
    <div data-testid="word-forming-area" data-word={props.word} />
  );
  return { __esModule: true, default: MockWordFormingArea };
});

import { WordHuntGameLayout } from '../WordHuntGameLayout';

describe('WordHuntGameLayout', () => {
  const defaultGrid = [
    ['A', 'B', 'C', 'D'],
    ['E', 'F', 'G', 'H'],
    ['I', 'J', 'K', 'L'],
    ['M', 'N', 'O', 'P'],
  ];

  const defaultProps = {
    // Header
    remainingTime: 120,
    totalTime: 180,
    score: 450,
    onQuit: jest.fn(),

    // Clue boxes
    currentHint: { hint: '_ _ _ _ _', level: 0, unlockCost: 0 },
    attempts: [],
    accumulatedClues: new Map(),
    knownLetters: new Set<string>(),
    latestAttemptFeedback: null,
    showFeedbackOverlay: false,

    // Life bar
    lifePoints: 75,
    isGameOver: false,
    isLifeGaining: false,
    lifeGainAmount: null,

    // Grid
    grid: defaultGrid,
    onWordSubmit: jest.fn(),
    onWordChange: jest.fn(),

    // Word forming
    formedWord: '',
    letterCount: 0,
    wordFeedback: null,

    // Leaderboard
    playerLives: {},
    eliminatedPlayers: [],
    leaderboard: [],
    currentUsername: 'testuser',

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
    expect(screen.getByTestId('word-forming-area')).toBeInTheDocument();
    expect(screen.getByTestId('mp-leaderboard')).toBeInTheDocument();
  });

  it('should pass score to header', () => {
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

  it('should pass formedWord to WordFormingArea', () => {
    render(<WordHuntGameLayout {...defaultProps} formedWord="HELLO" />);
    expect(screen.getByTestId('word-forming-area')).toHaveAttribute('data-word', 'HELLO');
  });
});
