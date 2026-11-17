import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { HuntSolvedRow, SOLVED_FLIP_STEP_MS, solvedRowDurationMs } from '../HuntSolvedRow';

describe('HuntSolvedRow', () => {
  it('Given a solved word, Then each letter flips in turn, left to right, in the solved colour', () => {
    render(<HuntSolvedRow word="PLATE" sizeClass="w-10 h-10" calm={false} />);
    const letters = screen.getAllByTestId('hunt-solved-letter');
    expect(letters.map((el) => el.textContent).join('')).toBe('PLATE');
    expect(letters.map((el) => Number(el.dataset.delay))).toEqual([0, 1, 2, 3, 4].map((i) => i * SOLVED_FLIP_STEP_MS));
    letters.forEach((el) => expect(el.dataset.flip).toBe('true'));
  });

  it('Given calm motion, Then the letters are simply filled with no flip', () => {
    render(<HuntSolvedRow word="PLATE" sizeClass="w-10 h-10" calm />);
    screen.getAllByTestId('hunt-solved-letter').forEach((el) => expect(el.dataset.flip).toBe('false'));
  });

  it('Given the longest daily word, Then the whole flip finishes well inside the solve hold', () => {
    expect(solvedRowDurationMs(8)).toBeLessThanOrEqual(1200);
  });

  it('Given a Hebrew word, Then final letter forms show', () => {
    render(<HuntSolvedRow word="שלומ" language="he" sizeClass="w-10 h-10" calm />);
    expect(screen.getAllByTestId('hunt-solved-letter').map((el) => el.textContent).join('')).toBe('שלום');
  });
});
