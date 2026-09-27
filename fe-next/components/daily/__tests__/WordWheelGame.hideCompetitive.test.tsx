/**
 * hideCompetitive mode: when rendered inside the practice hub the live
 * WordWheelGame must suppress all competitive chrome — leaderboard fetch,
 * rival pill, pass toasts, the combo counter, and the game_started funnel
 * event — while keeping the core gameplay intact. It must also surface each
 * accepted word via onWordFound so the practice shell can track goal progress.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const trackGameStart = vi.fn();
const trackGameEnd = vi.fn();
vi.mock('@/utils/growthTracking', () => ({
  trackGameStart: (...a: unknown[]) => trackGameStart(...a),
  trackGameEnd: (...a: unknown[]) => trackGameEnd(...a),
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
  trackGameStart.mockReset();
  trackGameEnd.mockReset();
  global.fetch = vi.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch;
});
afterEach(() => { vi.clearAllMocks(); });

describe('WordWheelGame hideCompetitive', () => {
  it('renders the combo + rival slots by default (competitive mode)', () => {
    renderGame();
    expect(screen.getByTestId('combo-slot')).toBeInTheDocument();
    expect(screen.getByTestId('next-rival-slot')).toBeInTheDocument();
  });

  it('emits the game_started funnel event by default', () => {
    renderGame();
    expect(trackGameStart).toHaveBeenCalledWith('word-wheel', { language: 'en' });
  });

  it('hides the combo + rival slots when hideCompetitive is set', () => {
    renderGame({ hideCompetitive: true, practice: true });
    expect(screen.queryByTestId('combo-slot')).toBeNull();
    expect(screen.queryByTestId('next-rival-slot')).toBeNull();
  });

  it('does NOT fetch the leaderboard when hideCompetitive is set', () => {
    renderGame({ hideCompetitive: true, practice: true });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('does NOT emit the game_started funnel event when hideCompetitive is set', () => {
    renderGame({ hideCompetitive: true, practice: true });
    expect(trackGameStart).not.toHaveBeenCalled();
  });

  it('calls onWordFound with the accepted word + running list', async () => {
    const onWordFound = vi.fn();
    renderGame({ hideCompetitive: true, practice: true, onWordFound });
    // Build "ABC" (center A + B + C), then submit.
    fireEvent.click(screen.getByText('A'));
    fireEvent.click(screen.getByText('B'));
    fireEvent.click(screen.getByText('C'));
    await act(async () => {
      fireEvent.click(screen.getByTestId('inline-submit-chip'));
    });
    await waitFor(() => expect(onWordFound).toHaveBeenCalledTimes(1));
    expect(onWordFound).toHaveBeenCalledWith('ABC', ['ABC']);
  });
});
