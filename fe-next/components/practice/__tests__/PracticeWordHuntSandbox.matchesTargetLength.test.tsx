/**
 * matchesTargetLength wiring: when selection length equals target word length,
 * SurvivalClueBoxes should show the match-target-warning sentinel.
 *
 * Bug: matchesTargetLength was always false — players never saw the pink
 * warning that their formed word was about to count as a target attempt.
 */
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SelectedCell } from '@/components/grid';

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
    x = 0; y = 0; alpha = 1;
    scale = { set: vi.fn() };
    circle = vi.fn().mockReturnThis();
    fill = vi.fn().mockReturnThis();
    clear = vi.fn().mockReturnThis();
    destroy = vi.fn();
  },
}));

// GridComponent mock that exposes onSelectionChange so tests can simulate drags
let capturedOnSelectionChange: ((cells: SelectedCell[]) => void) | undefined;
vi.mock('@/components/GridComponent', () => ({
  default: ({
    onSelectionChange,
  }: {
    onWordSubmit?: (word: string) => void;
    onSelectionChange?: (cells: SelectedCell[]) => void;
  }) => {
    capturedOnSelectionChange = onSelectionChange;
    return <div data-testid="grid-component-stub" />;
  },
}));

vi.mock('@/lib/practice/wordHuntPuzzle', () => ({
  generateWordHuntPuzzle: () => ({
    board: [['S', 'T', 'A', 'R'], ['E', 'O', 'N', 'I'], ['P', 'L', 'A', 'T'], ['E', 'R', 'I', 'N']],
    target: 'STAR',
  }),
  getWordHuntTargets: () => ['STAR'],
}));

import PracticeWordHuntSandbox from '../PracticeWordHuntSandbox';

beforeEach(() => {
  capturedOnSelectionChange = undefined;
  validatorCheck.mockReset();
  validatorCheck.mockResolvedValue({ isValid: true, source: 'dictionary' });
  window.localStorage.clear();
});

describe('PracticeWordHuntSandbox — matchesTargetLength wiring', () => {
  it('shows match-target-warning when selection length equals target word length', () => {
    render(<PracticeWordHuntSandbox />);

    // EN target is 'STAR' (4 letters) — select 4 cells
    const fourCells: SelectedCell[] = [
      { row: 0, col: 0, letter: 'S' },
      { row: 0, col: 1, letter: 'T' },
      { row: 0, col: 2, letter: 'A' },
      { row: 0, col: 3, letter: 'R' },
    ];

    act(() => { capturedOnSelectionChange?.(fourCells); });

    expect(screen.getByTestId('match-target-warning')).toBeInTheDocument();
  });

  it('hides match-target-warning when selection is shorter than target', () => {
    render(<PracticeWordHuntSandbox />);

    // Select only 3 cells (EN target is 4 letters)
    const threeCells: SelectedCell[] = [
      { row: 0, col: 0, letter: 'S' },
      { row: 0, col: 1, letter: 'T' },
      { row: 0, col: 2, letter: 'A' },
    ];

    act(() => { capturedOnSelectionChange?.(threeCells); });

    expect(screen.queryByTestId('match-target-warning')).not.toBeInTheDocument();
  });

  it('hides match-target-warning when selection is longer than target', () => {
    render(<PracticeWordHuntSandbox />);

    // Select 6 cells (EN target is 4 letters)
    const sixCells: SelectedCell[] = Array.from({ length: 6 }, (_, i) => ({
      row: Math.floor(i / 4),
      col: i % 4,
      letter: 'X',
    }));

    act(() => { capturedOnSelectionChange?.(sixCells); });

    expect(screen.queryByTestId('match-target-warning')).not.toBeInTheDocument();
  });

  it('clears match-target-warning when selection is cleared', () => {
    render(<PracticeWordHuntSandbox />);

    const fourCells: SelectedCell[] = Array.from({ length: 4 }, (_, i) => ({
      row: Math.floor(i / 4),
      col: i % 4,
      letter: 'X',
    }));

    act(() => { capturedOnSelectionChange?.(fourCells); });
    expect(screen.getByTestId('match-target-warning')).toBeInTheDocument();

    act(() => { capturedOnSelectionChange?.([]); });
    expect(screen.queryByTestId('match-target-warning')).not.toBeInTheDocument();
  });
});
