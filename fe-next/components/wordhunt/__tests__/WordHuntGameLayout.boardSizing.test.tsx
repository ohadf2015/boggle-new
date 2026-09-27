/**
 * Board-sizing opt-out for Word Hunt MP.
 *
 * The inner GridComponent renders `.game-board-frame`, which carries a legacy
 * global landscape-tablet rule (animations.css) sizing it off the VIEWPORT:
 *   min(80vh, calc(100vw - 300px)).
 * WordHuntGameLayout already wraps the grid in a correctly-computed square
 * (`--wh-grid-size: min(100cqw,100cqh,…)`), but without an opt-out container
 * class the frame honours the viewport rule instead of the square — on
 * landscape tablets the frame overflows its box and the grid rows spill over
 * each other (tiles appear to overlap).
 *
 * Adventure / desktop / tv layouts solve this with a `*-grid-container` class
 * whose CSS forces `.game-board-frame` to fill the wrapper. Word Hunt must do
 * the same via `wordhunt-grid-container`.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { WordHuntGameLayout } from '../WordHuntGameLayout';

vi.mock('../WordHuntMPHeader', () => ({ WordHuntMPHeader: () => <div data-testid="mp-header" /> }));
vi.mock('../WordHuntMPLeaderboard', () => ({ WordHuntMPLeaderboard: () => <div data-testid="mp-leaderboard" /> }));
vi.mock('../WordHuntGameOverOverlay', () => ({ WordHuntGameOverOverlay: () => null }));
vi.mock('@/components/daily/survival/SurvivalLifeBar', () => ({ SurvivalLifeBar: () => <div data-testid="life-bar" /> }));
vi.mock('@/components/daily/survival/SurvivalGridSection', () => ({ SurvivalGridSection: () => <div data-testid="grid-section" /> }));
vi.mock('@/components/daily/survival/SurvivalClueBoxes', () => ({
  SurvivalClueBoxes: () => <div data-testid="real-clue-boxes" />,
}));

const baseProps = {
  score: 0,
  onQuit: () => {},
  targetLength: 5,
  currentHint: { hint: '_ _ _ _ _', level: 0, unlockCost: 0 },
  attempts: [],
  accumulatedClues: new Map(),
  knownLetters: new Set<string>(),
  latestAttemptFeedback: null,
  showFeedbackOverlay: false,
  lifePoints: 100,
  isGameOver: false,
  targetFound: false,
  isLifeGaining: false,
  lifeGainAmount: null,
  isClueGaining: false,
  grid: [['A']] as never,
  onWordSubmit: () => {},
  onWordChange: () => {},
  playerLives: {},
  eliminatedPlayers: [],
  leaderboard: [],
  currentUsername: 'me',
  t: (k: string) => k,
  gameDir: 'ltr' as const,
};

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });
});

describe('WordHuntGameLayout grid sizing', () => {
  it('marks the grid wrapper with wordhunt-grid-container so .game-board-frame fills the square (no legacy-landscape overflow → no tile overlap)', () => {
    render(<WordHuntGameLayout {...baseProps} />);
    const squareBox = screen.getByTestId('grid-section').parentElement;
    expect(squareBox).toHaveClass('wordhunt-grid-container');
  });
});
