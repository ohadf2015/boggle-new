/**
 * Integration: tapping 3 valid wheel words (each containing the center
 * letter) through the REAL WordWheelGame bumps the practice goal pill,
 * writes progress, and reveals the chain CTA. Also asserts the center-letter
 * rule short-circuits validation (no validator call).
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';

const validatorCheck = vi.fn();
vi.mock('@/lib/practice/usePracticeValidator', () => ({
  usePracticeValidator: () => ({ check: validatorCheck }),
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (k: string) => k }),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));
vi.mock('next/dynamic', () => ({
  __esModule: true,
  default: () => () => <div data-testid="pixi-ring-stub" />,
}));
vi.mock('pixi.js', () => ({
  Application: class {
    canvas = document.createElement('canvas');
    screen = { width: 320, height: 240 };
    stage = { addChild: vi.fn(), removeChild: vi.fn(), removeChildren: vi.fn() };
    ticker = { add: vi.fn(), remove: vi.fn() };
    init = vi.fn().mockResolvedValue(undefined);
    destroy = vi.fn();
  },
  Graphics: class {
    x = 0;
    y = 0;
    alpha = 1;
    scale = { set: vi.fn() };
    circle = vi.fn().mockReturnThis();
    fill = vi.fn().mockReturnThis();
    clear = vi.fn().mockReturnThis();
    destroy = vi.fn();
  },
}));

vi.mock('@/utils/dailyChallenge/wordWheelGeneration', async (orig) => ({
  ...(await orig()),
  generateWordWheelPuzzle: () => ({
    centerLetter: 'A',
    outerLetters: ['T', 'R', 'C', 'E', 'S', 'N'],
    allLetters: ['A', 'T', 'R', 'C', 'E', 'S', 'N'],
    puzzleDate: '',
    puzzleNumber: 0,
    language: 'en',
  }),
}));

import PracticeWheelSandbox from '../PracticeWheelSandbox';
import { isPracticeModeComplete } from '@/lib/practice/practiceProgress';

/** Tap wheel letters by their glyph, then tap the action-bar submit. */
const submitWord = (letters: string[]) => {
  for (const ch of letters) {
    const el = document.querySelector(`[data-wheel-letter="${ch}"]`) as HTMLElement | null;
    if (!el) throw new Error(`wheel letter ${ch} not found`);
    fireEvent.click(el);
  }
  // Action-bar submit (distinct from the inline chip — both carry the label).
  const submit = screen.getByTestId('word-wheel-action-bar').querySelector('button:nth-child(2)') as HTMLElement;
  fireEvent.click(submit);
};

beforeEach(() => {
  validatorCheck.mockReset();
  validatorCheck.mockResolvedValue({ isValid: true, source: 'dictionary' });
  global.fetch = vi.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch;
  window.localStorage.clear();
});

describe('PracticeWheelSandbox completion integration (real WordWheelGame)', () => {
  it('bumps the goal pill + reveals chain CTA after 3 valid words with the center letter', async () => {
    // EN puzzle: center A, outer T R C E S N.
    render(<PracticeWheelSandbox />);

    submitWord(['A', 'T', 'R']); // ATR
    await waitFor(() => expect(screen.getByTestId('practice-goal-indicator')).toHaveTextContent('1'));
    // Flush pending passive effects so builtLettersRef resets to [] before next submit.
    // Without this, handleLetterPress reads a stale ref still containing ATR's letters
    // and incorrectly removes the center 'A' instead of adding it for the next word.
    await act(async () => {});
    submitWord(['A', 'C', 'R']); // ACR
    await waitFor(() => expect(screen.getByTestId('practice-goal-indicator')).toHaveTextContent('2'));
    await act(async () => {});
    submitWord(['A', 'E', 'S']); // AES
    await waitFor(() => {
      expect(screen.getByTestId('practice-chain-cta')).toBeInTheDocument();
    });
    expect(isPracticeModeComplete('wheelRush', 'en')).toBe(true);
  });

  it('rejects a word without the center letter (validator NOT called)', async () => {
    render(<PracticeWheelSandbox />);
    submitWord(['T', 'C', 'R']); // no center A
    await new Promise((r) => setTimeout(r, 50));
    expect(validatorCheck).not.toHaveBeenCalled();
    expect(isPracticeModeComplete('wheelRush', 'en')).toBe(false);
  });
});
