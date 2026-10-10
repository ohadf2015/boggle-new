/**
 * Word Wheel sits in the shared desktop GameShell: one tree for every screen,
 * CSS decides the frame. Rivals + round stats left, found words right.
 */
import React from 'react';
import { render, screen, within } from '@testing-library/react';
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

describe('WordWheelGame in the desktop game shell', () => {
  it('wraps the wheel in the shared shell — no separate desktop tree', () => {
    renderGame();
    expect(screen.queryByTestId('word-wheel-desktop-grid')).not.toBeInTheDocument();
    const shell = screen.getByTestId('game-shell');
    expect(shell.getAttribute('data-game-shell')).toBe('wheel');
    expect(screen.getByTestId('game-shell-stage').querySelector('[data-testid="wheel-orbit"]')).toBeInTheDocument();
  });

  it('puts the found-words feed in the end rail and keyboard help in the start rail', () => {
    renderGame();
    expect(within(screen.getByTestId('game-shell-right')).getByTestId('shell-words')).toBeInTheDocument();
    expect(within(screen.getByTestId('game-shell-left')).getByTestId('shell-keys')).toBeInTheDocument();
  });

  it('races the passed-in rivals in the start rail with the player marked', () => {
    renderGame({ rivals: [{ name: 'Ada', score: 30, playerId: 'a' }] });
    const left = screen.getByTestId('game-shell-left');
    expect(within(left).getByTestId('shell-standing-me').getAttribute('data-me')).toBe('true');
    expect(within(left).getByText('Ada')).toBeInTheDocument();
  });
});
