/**
 * Short-landscape (wide-but-short) layout behaviour for Word Hunt MP.
 *
 * At viewports like 1530×695 the row layout is active (≥720px wide) but the
 * height is too small for the full-size chrome, which squished the grid and
 * made the board feel cluttered with overlapping tiles. In that band the
 * layout drops the redundant "any word heals" one-liner and threads `compact`
 * to the clue boxes / header so the grid keeps its room.
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
  SurvivalClueBoxes: ({ compact }: { compact?: boolean }) => (
    <div data-testid="real-clue-boxes" data-compact={compact ? 'true' : 'false'} />
  ),
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

function setMatchMedia(matchesShortLandscape: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: query.includes('max-height') ? matchesShortLandscape : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });
}

describe('WordHuntGameLayout short-landscape adaptation', () => {
  it('keeps the heal hint and full clue boxes on tall viewports', () => {
    setMatchMedia(false);
    render(<WordHuntGameLayout {...baseProps} />);
    expect(screen.getByTestId('wh-heal-hint')).toBeInTheDocument();
    expect(screen.getByTestId('real-clue-boxes')).toHaveAttribute('data-compact', 'false');
  });

  it('drops the heal hint and compacts the clue boxes on wide-short viewports', () => {
    setMatchMedia(true);
    render(<WordHuntGameLayout {...baseProps} />);
    expect(screen.queryByTestId('wh-heal-hint')).not.toBeInTheDocument();
    expect(screen.getByTestId('real-clue-boxes')).toHaveAttribute('data-compact', 'true');
  });
});
