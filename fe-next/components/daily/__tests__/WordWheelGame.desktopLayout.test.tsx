/**
 * Desktop 3-column layout (parity with Word Hunt's SurvivalDesktopLayout).
 *
 * On desktop (isDesktop=true) Word Wheel renders a 3-column grid — left live
 * ranks / center wheel / right found-words — instead of the mobile single
 * column that floated narrow in a wide void. The wheel + its refs/handlers are
 * the SAME JSX in both layouts (drag interaction preserved), so we assert the
 * grid wraps the unchanged wheel-orbit, and that mobile is untouched.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/utils/growthTracking', () => ({
  trackGameStart: vi.fn(),
  trackGameEnd: vi.fn(),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (k: string) => k }),
}));

vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({
    playTileSelectSound: vi.fn(),
    playWordAcceptedSound: vi.fn(),
    playWordRejectedSound: vi.fn(),
    playComboSound: vi.fn(),
    playLegendaryWordSound: vi.fn(),
    playEpicVictorySound: vi.fn(),
    playCountdownBeep: vi.fn(),
    playBoardShuffleSound: vi.fn(),
    playButtonClickSound: vi.fn(),
  }),
}));

vi.mock('@/hooks/useWordWheelKeyboard', () => ({
  useWordWheelKeyboard: () => ({ keyboardFocused: false }),
}));

vi.mock('../WordWheelPixiRing', () => ({
  __esModule: true,
  default: () => <div data-testid="pixi-ring-stub" />,
}));

vi.mock('next/dynamic', () => ({
  __esModule: true,
  default: () => () => <div data-testid="dynamic-stub" />,
}));

vi.mock('@/utils/dailyChallenge/wordWheelGeneration', () => ({
  isValidWordWheelWord: () => true,
}));

vi.mock('@/utils/dailyChallenge/wordWheelScoring', () => ({
  scoreWord: () => 5,
}));

import WordWheelGame from '../WordWheelGame';
import type { WordWheelPuzzle } from '@/utils/dailyChallenge/wordWheelGeneration';

const puzzle: WordWheelPuzzle = {
  centerLetter: 'A',
  outerLetters: ['B', 'C', 'D', 'E', 'F', 'G'],
  validWords: ['CAB'],
  language: 'en',
} as unknown as WordWheelPuzzle;

function renderGame(extra: Record<string, unknown> = {}) {
  return render(
    <WordWheelGame
      puzzle={puzzle}
      duration={60}
      onComplete={vi.fn()}
      onValidateWord={vi.fn().mockResolvedValue(true)}
      onEffect={vi.fn()}
      language="en"
      {...extra}
    />,
  );
}

beforeEach(() => {
  // rivals fetch fails → ranks panel shows its empty-state, never a blank void.
  global.fetch = vi.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch;
});

describe('WordWheelGame desktop 3-column layout', () => {
  it('renders the 3-column desktop grid wrapping the same wheel when isDesktop', () => {
    renderGame({ isDesktop: true });
    const grid = screen.getByTestId('word-wheel-desktop-grid');
    expect(grid).toBeInTheDocument();
    // The wheel (with its drag handlers/refs) lives INSIDE the grid — same JSX,
    // just relocated to the center column.
    expect(grid.querySelector('[data-testid="wheel-orbit"]')).toBeInTheDocument();
  });

  it('keeps the mobile single-column layout (no grid) when not desktop', () => {
    renderGame();
    expect(screen.queryByTestId('word-wheel-desktop-grid')).not.toBeInTheDocument();
    // wheel still renders in the mobile column
    expect(screen.getByTestId('wheel-orbit')).toBeInTheDocument();
  });

  it('shows the live-ranks header even with no rivals (panel is never a blank void)', () => {
    renderGame({ isDesktop: true });
    // t() echoes the key; the panel always renders the Live Ranks header + empty state.
    expect(screen.getByText('wordHunt.desktop.liveRanks')).toBeInTheDocument();
    expect(screen.getByText('wordHunt.desktop.beFirst')).toBeInTheDocument();
  });
});
