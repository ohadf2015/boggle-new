/** lessonHud: quick-play and MP Wheel Rush share the lesson-style game HUD; Daily stays as it is. */
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
  useLanguageSafe: () => ({ language: 'en', t: (k: string) => k }),
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

vi.mock('@/components/mascot/GameMascotReactions', () => ({ GameMascotReactions: () => null }));
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

describe('WordWheelGame lessonHud (quick-play / MP rush): the shared game HUD, nothing doubled', () => {
  it('uses the one game HUD: exit, timer bar, score pill', () => {
    renderGame({ lessonHud: true, hideCompetitive: true, onExit: vi.fn() });
    expect(screen.getByTestId('game-hud')).toBeInTheDocument();
    expect(screen.queryByTestId('wheel-exit')).toBeNull();
  });

  it('folds the rank ladder into one slim chip, no second progress bar on phones', () => {
    renderGame({ lessonHud: true, hideCompetitive: true });
    expect(screen.getByTestId('rank-chip')).toHaveTextContent('wordWheel.rank.toNext');
    expect(screen.getAllByRole('progressbar')).toHaveLength(1);
  });

  it('shows no lone "0" bubble before the first word', () => {
    renderGame({ lessonHud: true, hideCompetitive: true });
    expect(screen.queryByTestId('found-count')).toBeNull();
  });

  it('keeps the inline submit for keyboards only; touch uses the big SUBMIT', () => {
    renderGame({ lessonHud: true, hideCompetitive: true });
    for (const l of ['C', 'A', 'B']) fireEvent.click(document.querySelector(`[data-wheel-letter="${l}"]`)!);
    expect(screen.getByTestId('inline-submit-chip').className).toContain('pointer-coarse:hidden');
  });

  it('daily keeps its own top bar', () => {
    renderGame();
    expect(screen.queryByTestId('game-hud')).toBeNull();
    expect(screen.queryByTestId('rank-chip')).toBeNull();
  });
});
