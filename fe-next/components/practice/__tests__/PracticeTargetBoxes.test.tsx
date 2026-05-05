/**
 * PracticeTargetBoxes — visual mimic of real SurvivalClueBoxes letter grid.
 * Always shows the full target word (no progressive reveal in practice).
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import PracticeTargetBoxes from '../PracticeTargetBoxes';

describe('PracticeTargetBoxes', () => {
  it('renders one box per letter', () => {
    render(<PracticeTargetBoxes word="STAR" />);
    expect(screen.getAllByTestId(/^practice-target-box-/)).toHaveLength(4);
  });

  it('shows each target letter inside its box', () => {
    render(<PracticeTargetBoxes word="STAR" />);
    expect(screen.getByTestId('practice-target-box-0')).toHaveTextContent('S');
    expect(screen.getByTestId('practice-target-box-1')).toHaveTextContent('T');
    expect(screen.getByTestId('practice-target-box-2')).toHaveTextContent('A');
    expect(screen.getByTestId('practice-target-box-3')).toHaveTextContent('R');
  });

  it('flips boxes to the lime-success state when solved', () => {
    render(<PracticeTargetBoxes word="STAR" solved />);
    const box = screen.getByTestId('practice-target-box-0');
    expect(box.className).toMatch(/bg-neo-lime/);
  });

  it('uses cream background when unsolved', () => {
    render(<PracticeTargetBoxes word="STAR" />);
    const box = screen.getByTestId('practice-target-box-0');
    expect(box.className).toMatch(/bg-neo-cream/);
  });

  it('respects RTL direction for Hebrew targets', () => {
    render(<PracticeTargetBoxes word="בית" dir="rtl" />);
    const wrap = screen.getByTestId('practice-target-boxes');
    expect(wrap.getAttribute('dir')).toBe('rtl');
  });
});
