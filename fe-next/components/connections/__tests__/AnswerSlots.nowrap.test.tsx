import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import AnswerSlots from '../AnswerSlots';

/**
 * The letter cells must occupy exactly ONE row for every bridge length we ship.
 * Shipped bridges run to 14 characters (ru), 10 (sv/es), 8 (en/he) — at 320px a
 * row of fixed 40px cells cannot fit, so the row used to wrap and the player saw
 * their answer split across two lines.
 *
 * jsdom does not perform flex layout, so "did these two cells land on the same
 * visual row" is unanswerable here and any such assertion would pass vacuously.
 * These tests pin the CONTRACT that makes wrapping impossible instead:
 *   1. the row never wraps, and
 *   2. each cell is sized as a share of the row, so N cells always fit.
 * Real geometry is verified separately in a browser.
 */
describe('AnswerSlots — one row, always', () => {
  const base = { value: '', state: 'idle' as const, dir: 'ltr' as const, label: 'answer' };

  it('never wraps the row', () => {
    render(<AnswerSlots {...base} slotCount={14} />);
    const row = screen.getByRole('group');
    expect(row.className).toContain('flex-nowrap');
    expect(row.className).not.toContain('flex-wrap');
  });

  it('tells the cells how many of them share the row', () => {
    render(<AnswerSlots {...base} slotCount={14} />);
    const row = screen.getByRole('group');
    expect(row.style.getPropertyValue('--slots')).toBe('14');
  });

  it('sizes each cell as a share of the row, not a fixed width', () => {
    render(<AnswerSlots {...base} slotCount={14} />);
    const cell = screen.getAllByTestId('answer-slot')[0];
    // Width must be derived by dividing the row among --slots cells.
    expect(cell.className).toMatch(/w-\[min\(.*\/var\(--slots\)/);
    // A fixed Tailwind width would re-introduce the overflow the row can't wrap away.
    expect(cell.className).not.toMatch(/\bw-10\b/);
    expect(cell.className).not.toMatch(/\bh-12\b/);
  });

  it('caps cell size so a short answer does not render giant cells', () => {
    render(<AnswerSlots {...base} slotCount={3} />);
    const cell = screen.getAllByTestId('answer-slot')[0];
    expect(cell.className).toContain('min(2.5rem,');
  });

  it('scales the letter with the cell instead of a fixed text size', () => {
    render(<AnswerSlots {...base} slotCount={14} />);
    const cell = screen.getAllByTestId('answer-slot')[0];
    expect(cell.className).not.toMatch(/\btext-2xl\b/);
    expect(cell.className).toMatch(/text-\[calc\(/);
  });

  it('still renders one cell per letter of the bridge', () => {
    render(<AnswerSlots {...base} slotCount={14} />);
    expect(screen.getAllByTestId('answer-slot')).toHaveLength(14);
  });

  it('tightens the gutter for long answers so the cells stay legible', () => {
    // At 14 cells the default gutters would eat ~78px of a ~280px phone row.
    render(<AnswerSlots {...base} slotCount={14} />);
    expect(screen.getByRole('group').style.getPropertyValue('--gap')).toBe('0.125rem');
  });

  it('keeps the roomier gutter for short answers, which have space to spare', () => {
    render(<AnswerSlots {...base} slotCount={4} />);
    expect(screen.getByRole('group').style.getPropertyValue('--gap')).toBe('0.375rem');
  });
});
