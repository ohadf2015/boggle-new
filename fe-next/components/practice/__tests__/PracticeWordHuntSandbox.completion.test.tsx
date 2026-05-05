/**
 * Integration test: drag-spelling the target word in the redesigned word-hunt
 * sandbox writes to practice progress + mounts the completion banner. Pointer
 * events drive the new drag-on-grid UX.
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

import PracticeWordHuntSandbox from '../PracticeWordHuntSandbox';
import { isPracticeModeComplete } from '@/lib/practice/practiceProgress';

const dragPath = (cells: Array<[number, number]>) => {
  const tiles = cells.map(([r, c]) => screen.getByTestId(`practice-tile-${r}-${c}`));
  fireEvent.pointerDown(tiles[0]);
  for (let i = 1; i < tiles.length; i++) fireEvent.pointerEnter(tiles[i]);
  fireEvent.pointerUp(tiles[tiles.length - 1]);
};

beforeEach(() => {
  validatorCheck.mockReset();
  validatorCheck.mockResolvedValue({ isValid: true, source: 'dictionary' });
  window.localStorage.clear();
});

describe('PracticeWordHuntSandbox completion integration (redesign)', () => {
  it('writes progress + reveals chain CTA after spelling the target', async () => {
    render(<PracticeWordHuntSandbox />);

    expect(screen.queryByTestId('practice-complete-banner')).toBeNull();
    expect(isPracticeModeComplete('wordHunt', 'en')).toBe(false);

    // EN board row 0: S T A R — target = "STAR" — drag (0,0)→(0,1)→(0,2)→(0,3)
    dragPath([[0, 0], [0, 1], [0, 2], [0, 3]]);

    await waitFor(() => {
      expect(screen.getByTestId('practice-complete-banner')).toBeInTheDocument();
    });
    expect(isPracticeModeComplete('wordHunt', 'en')).toBe(true);
  });
});
