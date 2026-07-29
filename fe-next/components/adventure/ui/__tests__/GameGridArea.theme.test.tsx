/**
 * GameGridArea Theme Integration Tests
 *
 * Verifies that GameGridArea uses HUD theme values from useHUDTheme()
 * for feedback message and hint area coloring.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { GameGridArea } from '../GameGridArea';

const mockHUDTheme = {
  headerBg: 'bg-emerald-950/90',
  headerBorder: 'border-emerald-800/40',
  sidebarBg: 'bg-emerald-900/40',
  scoreAccent: 'text-emerald-300',
  levelBadgeColor: 'bg-emerald-900/60',
  levelBadgeText: 'text-emerald-400',
  objectiveAccent: 'text-emerald-300',
  hintActiveColor: 'bg-emerald-400',
  hintActiveText: 'text-emerald-950',
};

vi.mock('@/contexts/AdventureThemeContext', () => {
  const R = require('react');
  return {
    useHUDTheme: () => mockHUDTheme,
    AdventureThemeContext: R.createContext({ worldId: 1 }),
  };
});

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    locale: 'en',
    dir: 'ltr',
  }),
}));

vi.mock('../../AdventureGrid', () => ({
  __esModule: true,
  default: React.forwardRef(function MockAdventureGrid() { return <div data-testid="mock-grid" />; }),
}));

vi.mock('@/components/game/WordFormingArea', () => ({
  __esModule: true,
  default: ({ word }: any) => <div data-testid="mock-word-area">{word}</div>,
}));


describe('GameGridArea — Theme Integration', () => {
  const defaultProps = {
    tiles: [
      { row: 0, col: 0, letter: 'A', type: 'standard' as const, id: '0-0', isCleared: false },
    ],
    gridSize: 4,
    selectedIndices: [],
    onTileSelect: vi.fn(),
    onWordSubmit: vi.fn(),
    onDragStart: vi.fn(),
    onDragEnter: vi.fn(),
    gridRef: { current: null },
    isInteractive: true,
    isDisabled: false,
    entryPhase: 'play',
    showCascade: false,
    onCascadeComplete: vi.fn(),
    hintHighlightIndices: [],
    pathPoints: [],
    validationError: null,
    isValidating: false,
    isWordValid: false,
    wasWordSubmitted: false,
    lastAccepted: null,
    selectedLength: 0,
    minWordLength: 3,
    hintLevel: 'none' as const,
  };

  it('should apply scoreAccent from theme to hint message', () => {
    const { container } = render(
      <GameGridArea {...defaultProps} hintLevel="length" />
    );
    // Hint messages should use the theme accent
    const hintElements = container.querySelectorAll('[class*="text-emerald-300"]');
    expect(hintElements.length).toBeGreaterThan(0);
  });

  it('should not render a separate validation error banner (handled by WordFormingArea)', () => {
    render(
      <GameGridArea {...defaultProps} validationError="Too short!" />
    );
    // Validation errors are now displayed by WordFormingArea, not a separate banner
    expect(screen.queryByText('Too short!')).not.toBeInTheDocument();
  });
});
