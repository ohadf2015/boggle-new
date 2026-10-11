/** Daily Word Wheel — the press shows before a move, and a coverage banner owns the praise. */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/utils/growthTracking', () => ({
  trackGameStart: vi.fn(),
  trackGameEnd: vi.fn(),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (k: string) => k }),
}));

const { legendarySpy, fireConfettiSpy } = vi.hoisted(() => ({
  legendarySpy: vi.fn(),
  fireConfettiSpy: vi.fn(),
}));
vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({
    playTileSelectSound: vi.fn(),
    playWordAcceptedSound: vi.fn(),
    playWordRejectedSound: vi.fn(),
    playComboSound: vi.fn(),
    playLegendaryWordSound: legendarySpy,
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

vi.mock('@/utils/confettiUtils', () => ({ fireConfetti: fireConfettiSpy }));

// Real letter-validity (so coverage reflects the actual wheel); dictionary is
// the async onValidateWord prop, mocked true below.
vi.mock('@/utils/dailyChallenge/wordWheelGeneration', async () => {
  const actual = await vi.importActual<typeof import('@/utils/dailyChallenge/wordWheelGeneration')>(
    '@/utils/dailyChallenge/wordWheelGeneration',
  );
  return { ...actual };
});

import WordWheelGame from '../WordWheelGame';
import type { WordWheelPuzzle } from '@/utils/dailyChallenge/wordWheelGeneration';

const puzzle: WordWheelPuzzle = {
  centerLetter: 'A',
  outerLetters: ['C', 'T', 'R', 'S', 'N', 'E'],
  allLetters: ['A', 'C', 'T', 'R', 'S', 'N', 'E'],
  puzzleDate: '2026-06-01',
  language: 'en',
  puzzleNumber: 1,
};

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = vi.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch;
});

const mountGame = (overrides: Partial<React.ComponentProps<typeof WordWheelGame>> = {}) => {
  const onValidateWord = vi.fn().mockResolvedValue(true);
  const onEffect = vi.fn();
  const utils = render(
    <WordWheelGame
      puzzle={puzzle}
      duration={60}
      onComplete={vi.fn()}
      onValidateWord={onValidateWord}
      onEffect={onEffect}
      language="en"
      {...overrides}
    />,
  );
  return { ...utils, onValidateWord, onEffect };
};

const letter = (l: string) => {
  const el = document.querySelector<HTMLButtonElement>(`[data-wheel-letter="${l}"]`);
  if (!el) throw new Error(`No wheel letter ${l}`);
  return el;
};

describe('WordWheelGame finger-down preview', () => {
  it('given a finger lands on a letter, then the word line shows it before the finger moves', () => {
    mountGame();
    fireEvent.pointerDown(letter('T'));
    expect(screen.getByTestId('word-pending-letter').textContent).toBe('T');
    expect(letter('T').dataset.wheelPressed).toBe('true');
    fireEvent.pointerUp(screen.getByTestId('wheel-orbit'));
    expect(screen.queryByTestId('word-pending-letter')).toBeNull();
  });
});

describe('WordWheelGame coverage banner', () => {
  it('given an all-but-one word, then the banner carries the points and the praise pill steps aside', async () => {
    mountGame();
    for (const ch of 'CANTER') fireEvent.click(letter(ch));
    await act(async () => {
      fireEvent.click(screen.getByTestId('inline-submit-chip'));
    });
    const banner = await screen.findByTestId('wheel-celebration');
    expect(banner.textContent).toMatch(/\+\d+/);
    expect(screen.queryByTestId('word-feedback')).toBeNull();
  });

  it('given an ordinary word, then the praise pill still shows', async () => {
    mountGame();
    for (const ch of 'CAR') fireEvent.click(letter(ch));
    await act(async () => {
      fireEvent.click(screen.getByTestId('inline-submit-chip'));
    });
    expect(await screen.findByTestId('word-feedback')).toBeInTheDocument();
  });
});
