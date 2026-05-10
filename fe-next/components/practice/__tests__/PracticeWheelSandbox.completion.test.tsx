/**
 * Integration test (redesigned): tap-spell 3 valid wheel words containing
 * the center letter writes progress + reveals chain CTA. Also asserts the
 * center-letter rule short-circuits validation (no API call).
 *
 * Wheel switched from drag→tap on 2026-05-05 to mirror real WheelRush input.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';

const validatorCheck = vi.fn();
vi.mock('@/lib/practice/usePracticeValidator', () => ({
  usePracticeValidator: () => ({ check: validatorCheck }),
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (k: string) => k }),
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

import PracticeWheelSandbox from '../PracticeWheelSandbox';
import { isPracticeModeComplete } from '@/lib/practice/practiceProgress';

/** Tap letters by index (0=center, 1..N=outer), then tap submit. */
const tapWord = (indices: number[]) => {
  for (const i of indices) {
    const el = document.querySelector(`[data-wheel-index="${i}"]`) as HTMLElement | null;
    if (!el) throw new Error(`wheel letter ${i} not found`);
    fireEvent.click(el);
  }
  const submit = screen.queryByTestId('practice-wheel-submit');
  if (submit) fireEvent.click(submit);
};

beforeEach(() => {
  validatorCheck.mockReset();
  validatorCheck.mockResolvedValue({ isValid: true, source: 'dictionary' });
  window.localStorage.clear();
});

describe('PracticeWheelSandbox completion integration (redesign — tap mode)', () => {
  it('writes progress + reveals chain CTA after 3 valid words with center letter', async () => {
    // EN puzzle: center=A (idx 0), outer T R C E S N (idx 1..6)
    render(<PracticeWheelSandbox />);

    tapWord([0, 1, 2]); // ATR
    await waitFor(() => expect(validatorCheck).toHaveBeenCalledTimes(1));
    tapWord([0, 3, 2]); // ACR
    await waitFor(() => expect(validatorCheck).toHaveBeenCalledTimes(2));
    tapWord([0, 4, 2]); // AER
    await waitFor(() => {
      expect(screen.getByTestId('practice-chain-cta')).toBeInTheDocument();
    });
    expect(isPracticeModeComplete('wheelRush', 'en')).toBe(true);
  });

  it('rejects a word without the center letter (validator NOT called)', async () => {
    render(<PracticeWheelSandbox />);
    tapWord([1, 3, 2]); // TCR — no center A
    await new Promise((r) => setTimeout(r, 50));
    expect(validatorCheck).not.toHaveBeenCalled();
    expect(isPracticeModeComplete('wheelRush', 'en')).toBe(false);
  });
});
