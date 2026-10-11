/**
 * Word Wheel sits in the shared desktop GameShell: one tree for every screen,
 * CSS decides the frame. Rivals + round stats left, found words right.
 */
import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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

function onDesktop(matches = true) {
  window.matchMedia = ((q: string) => ({
    matches, media: q, onchange: null,
    addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

const realMatchMedia = window.matchMedia;
afterEach(() => {
  window.matchMedia = realMatchMedia;
});

describe('WordWheelGame in the desktop game shell', () => {
  it('wraps the wheel in the shared shell — no separate desktop tree', () => {
    renderGame();
    expect(screen.queryByTestId('word-wheel-desktop-grid')).not.toBeInTheDocument();
    const shell = screen.getByTestId('game-shell');
    expect(shell.getAttribute('data-game-shell')).toBe('wheel');
    expect(screen.getByTestId('game-shell-stage').querySelector('[data-testid="wheel-orbit"]')).toBeInTheDocument();
  });

  it('keeps keyboard help and the live ranks in the start rail', () => {
    onDesktop();
    renderGame();
    const left = screen.getByTestId('game-shell-left');
    expect(within(left).getByTestId('shell-keys')).toBeInTheDocument();
    expect(within(left).getByText('wordHunt.desktop.liveRanks')).toBeInTheDocument();
  });

  it('moves the found words into the end rail on desktop, leaving one copy', () => {
    onDesktop();
    renderGame();
    expect(screen.getAllByTestId('found-words-slot')).toHaveLength(1);
    expect(within(screen.getByTestId('game-shell-right')).getByTestId('found-words-slot')).toBeInTheDocument();
  });

  it('leaves both rails empty on a phone, so the phone tree has one ladder and one word strip', () => {
    onDesktop(false);
    renderGame({ hideCompetitive: true });
    expect(screen.getByTestId('game-shell-left')).toBeEmptyDOMElement();
    expect(screen.getByTestId('game-shell-right')).toBeEmptyDOMElement();
    expect(screen.getAllByTestId('rank-ladder')).toHaveLength(1);
    expect(screen.getAllByTestId('found-words-slot')).toHaveLength(1);
  });

  it('shows the rank ladder once, not again as a side list, when live ranks fill the left column', () => {
    onDesktop();
    renderGame();
    expect(screen.getAllByTestId('rank-ladder')).toHaveLength(1);
  });

  it('falls back to the rank list on the left when there is no live board', () => {
    onDesktop();
    renderGame({ hideCompetitive: true });
    expect(screen.queryByText('wordHunt.desktop.liveRanks')).toBeNull();
    expect(screen.getAllByTestId('rank-ladder')).toHaveLength(2);
  });
});
