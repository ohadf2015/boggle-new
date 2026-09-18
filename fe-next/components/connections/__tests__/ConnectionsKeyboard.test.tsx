import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ConnectionsKeyboard from '../ConnectionsKeyboard';
import { getKeyboardRows } from '@/lib/connections/keyboard';

const baseProps = {
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

  it('gives every Hebrew letter key the same 9.5-column width', () => {
    // Hebrew rows are 6/8/8: backspace moves to the short top row, submit stays
    // on the last row, so the widest row is 8 + 1.5 = 9.5 columns (was 11,
    // which rendered skinny pills). jsdom does not compute flex-shrink, so the
    // divisor is what this pins.
    render(<ConnectionsKeyboard {...baseProps} rows={getKeyboardRows('he')} canSubmit />);
    const firstRowKey = screen.getByRole('button', { name: 'ק' });
    const lastRowKey = screen.getByRole('button', { name: 'ת' });
    const expected = `calc(${(100 / 9.5).toFixed(4)}% - 0.25rem)`;
    expect(firstRowKey.style.flexBasis).toBe(expected);
    expect(lastRowKey.style.flexBasis).toBe(expected);
  });

  it('puts Hebrew backspace on the top row and submit on the bottom row', () => {
    render(<ConnectionsKeyboard {...baseProps} rows={getKeyboardRows('he')} canSubmit />);
    const backspaceKey = screen.getByRole('button', { name: 'Delete letter' });
    const submit = screen.getByRole('button', { name: 'Submit' });
    expect(backspaceKey.parentElement).toBe(screen.getByRole('button', { name: 'ק' }).parentElement);
    expect(submit.parentElement).toBe(screen.getByRole('button', { name: 'ת' }).parentElement);
  });

  it('renders the physical-layout keyboard left-to-right for Hebrew (ק top-left, not mirrored)', () => {
    // A physical/mobile Hebrew keyboard — and Hebrew Wordle — put ק at the TOP-LEFT,
    // never mirrored to the right. The key grid is a locale-independent physical
    // artifact, so the keyboard must flow LTR even though Hebrew text is RTL.
    const { container } = render(
      <ConnectionsKeyboard {...baseProps} rows={getKeyboardRows('he')} canSubmit />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute('dir')).toBe('ltr');
    // ק is the first key of the top row (its visual start under LTR flow).
    const qof = screen.getByRole('button', { name: 'ק' });
    expect(qof.parentElement!.firstElementChild).toBe(qof);
  });

  it('calls onLetter with the tapped Hebrew letter', () => {
    const onLetter = vi.fn();
    render(<ConnectionsKeyboard {...baseProps} rows={getKeyboardRows('he')} onLetter={onLetter} canSubmit />);
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

  it('matches the wheel/hunt neo-brutalist key language (border-3, hard shadow, pressed offset)', () => {
    render(<ConnectionsKeyboard {...baseProps} rows={getKeyboardRows('en')} canSubmit />);
    const letterKey = screen.getByRole('button', { name: 'Q' });
    // Same visual language as the word-wheel letters / word-hunt tiles:
    // 3px black border, hard offset shadow that collapses on press with a 1px
    // translate — not the old scale-95 press, which read as "danced but didn't
    // commit" on slow Android frames (rage-click lesson from the wheel).
    expect(letterKey.className).toContain('border-3');
    expect(letterKey.className).toContain('border-neo-black');
    expect(letterKey.className).toContain('shadow-hard');
    expect(letterKey.className).toContain('active:shadow-hard-pressed');
    expect(letterKey.className).toContain('active:translate-x-px');
    expect(letterKey.className).toContain('active:translate-y-px');
    expect(letterKey.className).toContain('bg-neo-white');
    expect(letterKey.className).toContain('touch-manipulation');
    expect(letterKey.className).not.toContain('active:scale-95');
    // Action keys share the same press language.
    const submit = screen.getByRole('button', { name: 'Submit' });
    expect(submit.className).toContain('active:shadow-hard-pressed');
    expect(submit.className).not.toContain('active:scale-95');
  });
});
