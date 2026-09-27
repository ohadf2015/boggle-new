/**
 * Quick Play's wheel round wants the rival layer WITHOUT the daily-leaderboard
 * layer: hideCompetitive still suppresses the funnel event and combo counter,
 * but a caller-supplied rival list (Quick Play's ghosts, drawn from recent quick
 * rounds) must still light up the "player to beat" pill and the pass toasts.
 *
 * Without the override the daily fetch is the only rival source, and it is the
 * WRONG cohort for a quick round — different puzzle, different duration.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
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
    playButtonClickSound: vi.fn(),
    playWordLengthSound: vi.fn(),
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
  scoreWord: (w: string) => w.length,
}));

import WordWheelGame from '../WordWheelGame';
import type { WordWheelPuzzle } from '@/utils/dailyChallenge/wordWheelGeneration';

const puzzle: WordWheelPuzzle = {
  centerLetter: 'A',
  outerLetters: ['B', 'C', 'D', 'E', 'F', 'G'],
  allLetters: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
  validWords: ['CAB'],
  language: 'en',
} as unknown as WordWheelPuzzle;

const rivals = [
  { name: 'Ada', score: 40, avatarImage: null, customAvatar: null, playerId: 'u1', guestFingerprint: null },
  { name: 'Bo', score: 90, avatarImage: null, customAvatar: null, playerId: 'u2', guestFingerprint: null },
];

const renderGame = (props: Partial<React.ComponentProps<typeof WordWheelGame>> = {}) =>
  render(
    <WordWheelGame
      puzzle={puzzle}
      duration={60}
      onComplete={vi.fn()}
      onValidateWord={vi.fn().mockResolvedValue(true)}
      onEffect={vi.fn()}
      language="en"
      {...props}
    />,
  );

beforeEach(() => {
  global.fetch = vi.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch;
});
afterEach(() => {
  vi.clearAllMocks();
});

describe('WordWheelGame — caller-supplied rivals', () => {
  it('shows the rival pill even under hideCompetitive when rivals are supplied', () => {
    renderGame({ hideCompetitive: true, practice: true, rivals });
    expect(screen.getByTestId('next-rival-slot')).toBeInTheDocument();
  });

  it('does not fetch the daily leaderboard — the supplied cohort is the whole cohort', () => {
    renderGame({ hideCompetitive: true, practice: true, rivals });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('keeps the rest of the competitive chrome suppressed', () => {
    renderGame({ hideCompetitive: true, practice: true, rivals });
    expect(screen.queryByTestId('combo-slot')).toBeNull();
  });

  it('still hides the pill when hideCompetitive is set and no rivals are supplied', () => {
    renderGame({ hideCompetitive: true, practice: true });
    expect(screen.queryByTestId('next-rival-slot')).toBeNull();
  });

  it('skips the daily fetch when rivals are supplied in competitive mode too', () => {
    renderGame({ rivals });
    expect(global.fetch).not.toHaveBeenCalled();
    expect(screen.getByTestId('next-rival-slot')).toBeInTheDocument();
  });
});
