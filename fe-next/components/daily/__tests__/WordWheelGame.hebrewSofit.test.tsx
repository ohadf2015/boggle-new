/**
 * Hebrew sofit (final-form) display in word wheel.
 *
 * Wheel tiles must NEVER show sofit forms (verified by
 * `wordWheelGeneration.test.ts`). The built-word bar and found-words list
 * also use regular (non-sofit) forms — the wheel is finals-free throughout
 * so players only ever see the same letter shapes as the tiles.
 */
import React from 'react';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/utils/growthTracking', () => ({
  trackGameStart: vi.fn(),
  trackGameEnd: vi.fn(),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'he', t: (k: string) => k }),
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
  scoreWord: () => 5,
}));

import WordWheelGame from '../WordWheelGame';
import type { WordWheelPuzzle } from '@/utils/dailyChallenge/wordWheelGeneration';

// Hebrew puzzle: regular forms only on the wheel — no sofit.
const puzzle = {
  centerLetter: 'י',
  outerLetters: ['מ', 'ש', 'ר', 'ל', 'ה', 'ב'],
  allLetters: ['י', 'מ', 'ש', 'ר', 'ל', 'ה', 'ב'],
  puzzleDate: '2026-05-03',
  language: 'he' as const,
  puzzleNumber: 1,
} as unknown as WordWheelPuzzle;

const mountGame = (overrides: Partial<React.ComponentProps<typeof WordWheelGame>> = {}) => {
  const onValidateWord = vi.fn().mockResolvedValue(true);
  const utils = render(
    <WordWheelGame
      puzzle={puzzle}
      duration={60}
      onComplete={vi.fn()}
      onValidateWord={onValidateWord}
      onEffect={vi.fn()}
      language="he"
      {...overrides}
    />,
  );
  return { ...utils, onValidateWord };
};

const tap = (container: HTMLElement, selector: string) => {
  const el = container.querySelector(selector) as HTMLButtonElement | null;
  if (!el) throw new Error(`No element matching ${selector}`);
  fireEvent.click(el);
};

beforeEach(() => {
  cleanup();
  global.fetch = vi.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch;
});
afterEach(cleanup);

describe('WordWheelGame Hebrew sofit display', () => {
  it('wheel tiles never render sofit forms', () => {
    mountGame();
    const sofit = ['ך', 'ם', 'ן', 'ף', 'ץ'];
    for (const tile of document.querySelectorAll('[data-wheel-letter]')) {
      const letter = (tile as HTMLElement).dataset.wheelLetter || '';
      expect(sofit).not.toContain(letter);
    }
  });

  const builderTileText = (root: HTMLElement): string[] => {
    const builder = root.querySelector('[data-testid="word-builder"]');
    if (!builder) throw new Error('word-builder area not found');
    const buttons = Array.from(builder.querySelectorAll('button')) as HTMLElement[];
    // Filter out the inline submit chip; keep only the per-letter WordTiles.
    return buttons
      .filter((b) => b.getAttribute('data-testid') !== 'inline-submit-chip')
      .map((b) => (b.firstChild?.textContent || '').trim());
  };

  it('built word never shows sofit — last letter stays in regular form (מ stays מ)', () => {
    const { container } = mountGame();
    tap(container, '[data-wheel-letter="י"]');
    tap(container, '[data-wheel-letter="מ"]');
    expect(builderTileText(container)).toEqual(['י', 'מ']);
  });

  it('built word non-terminal letter stays regular form (מ stays מ when not last)', () => {
    const { container } = mountGame();
    tap(container, '[data-wheel-letter="מ"]');
    tap(container, '[data-wheel-letter="י"]');
    expect(builderTileText(container)).toEqual(['מ', 'י']);
  });

  it('found-word chip shows regular form (no sofit)', async () => {
    const { container, onValidateWord } = mountGame();
    // Each wheel letter usable once; need 3 letters with center 'י' present.
    tap(container, '[data-wheel-letter="ה"]');
    tap(container, '[data-wheel-letter="י"]');
    tap(container, '[data-wheel-letter="מ"]');
    await act(async () => {
      const chip = container.querySelector('[data-testid="inline-submit-chip"]') as HTMLButtonElement;
      fireEvent.click(chip);
    });
    expect(onValidateWord).toHaveBeenCalled();
    const chipText = container.textContent || '';
    expect(chipText).toContain('הימ');
    expect(chipText).not.toContain('הים');
  });
});
