/**
 * Integration test: tapping a 3rd valid word in the classic sandbox writes
 * to practice progress storage AND mounts the completion banner. This is the
 * seam where the sandbox, the practiceProgress lib, and the banner have to
 * agree — easy to break independently of any unit test.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (k: string) => k }),
}));

import PracticeClassicSandbox from '../PracticeClassicSandbox';
import { isPracticeModeComplete } from '@/lib/practice/practiceProgress';

const tapPath = (cells: Array<[number, number]>) => {
  for (const [r, c] of cells) {
    fireEvent.click(screen.getByTestId(`practice-tile-${r}-${c}`));
  }
};

const submit = () => {
  fireEvent.click(screen.getByRole('button', { name: 'practice.classic.submit' }));
};

beforeEach(() => {
  window.localStorage.clear();
});

describe('PracticeClassicSandbox completion integration', () => {
  it('renders the complete banner + writes progress after the 3rd valid word', async () => {
    render(<PracticeClassicSandbox />);
    expect(screen.queryByTestId('practice-complete-banner')).toBeNull();
    expect(isPracticeModeComplete('classic', 'en')).toBe(false);

    // Curated EN board:  S T A R / E O N I / P L A T / E R I N
    // STAR row 0: (0,0)(0,1)(0,2)(0,3)
    tapPath([[0, 0], [0, 1], [0, 2], [0, 3]]);
    submit();

    // PLAN: P(2,0)-L(2,1)-A(2,2)-N(1,2) — last hop is a diagonal
    tapPath([[2, 0], [2, 1], [2, 2], [1, 2]]);
    submit();

    // TIN: T(2,3)-I(3,2)-N(3,3) — both hops include a diagonal
    tapPath([[2, 3], [3, 2], [3, 3]]);
    submit();

    await waitFor(() => {
      expect(screen.getByTestId('practice-complete-banner')).toBeInTheDocument();
    });
    expect(isPracticeModeComplete('classic', 'en')).toBe(true);
  });
});
