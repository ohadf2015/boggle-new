/**
 * Integration test for the redesigned classic sandbox: drag-spell three valid
 * words → progress is written + chain CTA reveals. Uses pointer events (not
 * the legacy submit button — that was removed in the redesign).
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

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

import PracticeClassicSandbox from '../PracticeClassicSandbox';
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

describe('PracticeClassicSandbox completion integration (redesign)', () => {
  it('writes progress + reveals chain CTA after the 3rd valid word', async () => {
    render(<PracticeClassicSandbox />);
    expect(isPracticeModeComplete('classic', 'en')).toBe(false);
    expect(screen.queryByTestId('practice-chain-cta')).toBeNull();

    // Curated EN board:  S T A R / E O N I / P L A T / E R I N
    dragPath([[0, 0], [0, 1], [0, 2], [0, 3]]); // STAR
    await waitFor(() => expect(validatorCheck).toHaveBeenCalledTimes(1));
    dragPath([[2, 0], [2, 1], [2, 2], [1, 2]]); // PLAN
    await waitFor(() => expect(validatorCheck).toHaveBeenCalledTimes(2));
    dragPath([[2, 3], [3, 2], [3, 3]]);         // TIN
    await waitFor(() => {
      expect(screen.getByTestId('practice-chain-cta')).toBeInTheDocument();
    });
    expect(isPracticeModeComplete('classic', 'en')).toBe(true);
  });
});
