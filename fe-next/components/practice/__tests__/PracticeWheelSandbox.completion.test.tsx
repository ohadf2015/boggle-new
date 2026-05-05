/**
 * Integration test (redesigned): drag-spelling 3 valid wheel words containing
 * the center letter writes progress + reveals chain CTA. Also asserts the
 * center-letter rule short-circuits validation (no API call).
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
    init = vi.fn().mockResolvedValue(undefined);
    destroy = vi.fn();
  },
}));

import PracticeWheelSandbox from '../PracticeWheelSandbox';
import { isPracticeModeComplete } from '@/lib/practice/practiceProgress';

const dragWord = (indices: number[]) => {
  const tiles = indices.map((i) => screen.getByTestId(`practice-letter-${i}`));
  fireEvent.pointerDown(tiles[0]);
  for (let k = 1; k < tiles.length; k++) fireEvent.pointerEnter(tiles[k]);
  fireEvent.pointerUp(tiles[tiles.length - 1]);
};

beforeEach(() => {
  validatorCheck.mockReset();
  validatorCheck.mockResolvedValue({ isValid: true, source: 'dictionary' });
  window.localStorage.clear();
});

describe('PracticeWheelSandbox completion integration (redesign)', () => {
  it('writes progress + reveals chain CTA after 3 valid words with center letter', async () => {
    // EN puzzle — letters[0]=A (center), letters[1..4]=T R C E
    render(<PracticeWheelSandbox />);

    dragWord([2, 0, 1]);  // CAR  (C=idx 3, A=0, R=2 — but we use indices 2,0,1 → letters[2]=R letters[0]=A letters[1]=T → "RAT")
    await waitFor(() => expect(validatorCheck).toHaveBeenCalledTimes(1));
    dragWord([3, 0, 2]);  // letters[3]=C letters[0]=A letters[2]=R → "CAR"
    await waitFor(() => expect(validatorCheck).toHaveBeenCalledTimes(2));
    dragWord([4, 0, 2]);  // letters[4]=E letters[0]=A letters[2]=R → "EAR"
    await waitFor(() => {
      expect(screen.getByTestId('practice-chain-cta')).toBeInTheDocument();
    });
    expect(isPracticeModeComplete('wheelRush', 'en')).toBe(true);
  });

  it('rejects a word without the center letter (validator NOT called)', async () => {
    render(<PracticeWheelSandbox />);
    // letters[1]=T letters[3]=C letters[2]=R → "TCR" no center A
    dragWord([1, 3, 2]);
    await new Promise((r) => setTimeout(r, 50));
    expect(validatorCheck).not.toHaveBeenCalled();
    expect(isPracticeModeComplete('wheelRush', 'en')).toBe(false);
  });
});
