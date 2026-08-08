import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ConnectionsKeyboard from '../ConnectionsKeyboard';
import { getKeyboardRows } from '@/lib/connections/keyboard';

const baseProps = {
  dir: 'ltr' as const,
  onLetter: () => {},
  onBackspace: () => {},
  onSubmit: () => {},
  backspaceLabel: 'Delete letter',
  submitLabel: 'Submit',
};

describe('ConnectionsKeyboard', () => {
  it('renders one button per letter plus backspace and submit keys', () => {
    render(<ConnectionsKeyboard {...baseProps} rows={getKeyboardRows('en')} canSubmit />);
    expect(screen.getByRole('button', { name: 'A' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Z' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Delete letter' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Submit' })).toBeTruthy();
  });

  it('renders keys grouped in one flex line per row (QWERTY shape)', () => {
    render(<ConnectionsKeyboard {...baseProps} rows={getKeyboardRows('en')} canSubmit />);
    const q = screen.getByRole('button', { name: 'Q' });
    const p = screen.getByRole('button', { name: 'P' });
    const a = screen.getByRole('button', { name: 'A' });
    // Q and P share a row container; A lives in a different one.
    expect(q.parentElement).toBe(p.parentElement);
    expect(q.parentElement).not.toBe(a.parentElement);
  });

  it('puts submit and backspace on the last row, flanking the letters', () => {
    render(<ConnectionsKeyboard {...baseProps} rows={getKeyboardRows('en')} canSubmit />);
    const z = screen.getByRole('button', { name: 'Z' });
    const submit = screen.getByRole('button', { name: 'Submit' });
    const backspaceKey = screen.getByRole('button', { name: 'Delete letter' });
    expect(submit.parentElement).toBe(z.parentElement);
    expect(backspaceKey.parentElement).toBe(z.parentElement);
  });

  it('gives every Hebrew letter key the same width, including the last row', () => {
    // Hebrew rows are 6/8/8, so the last row is already the longest and the
    // submit/backspace keys have no column budget of their own. Sizing letters
    // off the longest row alone let the bottom row shrink under them.
    // NB: asserting the two keys share a flex-basis would be vacuous — they
    // always did. The old bug was runtime flex-SHRINK, which jsdom does not
    // compute. What actually changed is the divisor: the budget must be 11
    // columns (8 letters + 3 for the action keys), not the bare longest row of
    // 8. Pinning the number is what makes this test able to fail.
    render(<ConnectionsKeyboard {...baseProps} dir="rtl" rows={getKeyboardRows('he')} canSubmit />);
    const firstRowKey = screen.getByRole('button', { name: 'ק' });   // row 1
    const lastRowKey = screen.getByRole('button', { name: 'ת' });    // row 3, beside the action keys
    const expected = `calc(${(100 / 11).toFixed(4)}% - 0.375rem)`;
    expect(firstRowKey.style.flexBasis).toBe(expected);
    expect(lastRowKey.style.flexBasis).toBe(expected);
  });

  it('calls onLetter with the tapped Hebrew letter', () => {
    const onLetter = vi.fn();
    render(<ConnectionsKeyboard {...baseProps} dir="rtl" rows={getKeyboardRows('he')} onLetter={onLetter} canSubmit />);
    fireEvent.click(screen.getByRole('button', { name: 'ש' }));
    expect(onLetter).toHaveBeenCalledWith('ש');
  });

  it('calls onBackspace and onSubmit on their keys', () => {
    const onBackspace = vi.fn();
    const onSubmit = vi.fn();
    render(<ConnectionsKeyboard {...baseProps} rows={[['A', 'B']]} onBackspace={onBackspace} onSubmit={onSubmit} canSubmit />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete letter' }));
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(onBackspace).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('disables the submit key when the buffer is empty (canSubmit=false)', () => {
    render(<ConnectionsKeyboard {...baseProps} rows={[['A']]} canSubmit={false} />);
    expect(screen.getByRole('button', { name: 'Submit' })).toHaveProperty('disabled', true);
    // letters remain tappable
    expect(screen.getByRole('button', { name: 'A' })).toHaveProperty('disabled', false);
  });

  it('disables every key when disabled', () => {
    render(<ConnectionsKeyboard {...baseProps} rows={[['A']]} disabled canSubmit />);
    expect(screen.getByRole('button', { name: 'A' })).toHaveProperty('disabled', true);
    expect(screen.getByRole('button', { name: 'Delete letter' })).toHaveProperty('disabled', true);
    expect(screen.getByRole('button', { name: 'Submit' })).toHaveProperty('disabled', true);
  });

  it('keeps letter keys the same width across ALL rows (sized off the widest row)', () => {
    render(<ConnectionsKeyboard {...baseProps} rows={getKeyboardRows('en')} canSubmit />);
    // Q lives in the 10-key row, A in the 9-key row, Z in the 7-key row —
    // all three must share one flex-basis so no row's keys look squashed/fat.
    const q = screen.getByRole('button', { name: 'Q' });
    const a = screen.getByRole('button', { name: 'A' });
    const z = screen.getByRole('button', { name: 'Z' });
    expect(q.style.flexBasis).toBeTruthy();
    expect(a.style.flexBasis).toBe(q.style.flexBasis);
    expect(z.style.flexBasis).toBe(q.style.flexBasis);
    // Uniform width means no grow — otherwise shorter rows widen again.
    expect(q.style.flexGrow).toBe('0');
    // No fixed-width utility (a min-w floor is fine; a hard w-9/w-10 is not).
    expect(a.className).not.toMatch(/(?<![a-z-])w-(?:9|10)\b/);
  });
});
