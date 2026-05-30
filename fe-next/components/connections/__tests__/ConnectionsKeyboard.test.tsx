import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ConnectionsKeyboard from '../ConnectionsKeyboard';
import { getKeyboardLetters } from '@/lib/connections/keyboard';

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
    render(<ConnectionsKeyboard {...baseProps} letters={getKeyboardLetters('en')} canSubmit />);
    expect(screen.getByRole('button', { name: 'A' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Z' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Delete letter' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Submit' })).toBeTruthy();
  });

  it('calls onLetter with the tapped Hebrew letter', () => {
    const onLetter = vi.fn();
    render(<ConnectionsKeyboard {...baseProps} dir="rtl" letters={getKeyboardLetters('he')} onLetter={onLetter} canSubmit />);
    fireEvent.click(screen.getByRole('button', { name: 'ש' }));
    expect(onLetter).toHaveBeenCalledWith('ש');
  });

  it('calls onBackspace and onSubmit on their keys', () => {
    const onBackspace = vi.fn();
    const onSubmit = vi.fn();
    render(<ConnectionsKeyboard {...baseProps} letters={['A', 'B']} onBackspace={onBackspace} onSubmit={onSubmit} canSubmit />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete letter' }));
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(onBackspace).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('disables the submit key when the buffer is empty (canSubmit=false)', () => {
    render(<ConnectionsKeyboard {...baseProps} letters={['A']} canSubmit={false} />);
    expect(screen.getByRole('button', { name: 'Submit' })).toHaveProperty('disabled', true);
    // letters remain tappable
    expect(screen.getByRole('button', { name: 'A' })).toHaveProperty('disabled', false);
  });

  it('disables every key when disabled', () => {
    render(<ConnectionsKeyboard {...baseProps} letters={['A']} disabled canSubmit />);
    expect(screen.getByRole('button', { name: 'A' })).toHaveProperty('disabled', true);
    expect(screen.getByRole('button', { name: 'Delete letter' })).toHaveProperty('disabled', true);
    expect(screen.getByRole('button', { name: 'Submit' })).toHaveProperty('disabled', true);
  });
});
