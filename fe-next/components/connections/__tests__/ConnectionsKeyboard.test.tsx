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

  it('grows letter keys to fill the row width (flex-1, not fixed width)', () => {
    render(<ConnectionsKeyboard {...baseProps} rows={getKeyboardRows('en')} canSubmit />);
    const a = screen.getByRole('button', { name: 'A' });
    // Letters must flex-grow to use the full screen width rather than a fixed width.
    expect(a.className).toContain('flex-1');
    // No fixed-width utility (a min-w floor is fine; a hard w-9/w-10 is not).
    expect(a.className).not.toMatch(/(?<![a-z-])w-(?:9|10)\b/);
  });
});
