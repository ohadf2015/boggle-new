/**
 * Regression: when MP word-hunt loses the original startGame, targetLength stays 0
 * in the store and HintBoxes renders ZERO tiles inside an otherwise-visible shell
 * (user-reported bug: "sometimes no clue tiles at all"). Layout now renders a
 * skeleton placeholder instead of the empty shell.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { WordHuntGameLayout } from '../WordHuntGameLayout';

// Stub heavy subcomponents — we test layout branching, not their internals.
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
  targetLength: 0,
  currentHint: null,
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

describe('WordHuntGameLayout clue-tile fallback', () => {
  it('renders skeleton when targetLength is 0', () => {
    render(<WordHuntGameLayout {...baseProps} targetLength={0} />);
    expect(screen.getByTestId('wh-clue-skeleton')).toBeInTheDocument();
    expect(screen.queryByTestId('real-clue-boxes')).not.toBeInTheDocument();
  });

  it('renders real SurvivalClueBoxes once targetLength arrives', () => {
    render(<WordHuntGameLayout {...baseProps} targetLength={5} currentHint={{ hint: '_ _ _ _ _', level: 0, unlockCost: 0 }} />);
    expect(screen.queryByTestId('wh-clue-skeleton')).not.toBeInTheDocument();
    expect(screen.getByTestId('real-clue-boxes')).toBeInTheDocument();
  });
});

describe('WordHuntGameLayout heal hint', () => {
  it('shows the "any word heals" survival hint once the target is loaded', () => {
    render(<WordHuntGameLayout {...baseProps} targetLength={5} currentHint={{ hint: '_ _ _ _ _', level: 0, unlockCost: 0 }} />);
    expect(screen.getByTestId('wh-heal-hint')).toHaveTextContent('wordHunt.survival.healHint');
  });

  it('hides the heal hint while target metadata is still syncing', () => {
    render(<WordHuntGameLayout {...baseProps} targetLength={0} />);
    expect(screen.queryByTestId('wh-heal-hint')).not.toBeInTheDocument();
  });
});
