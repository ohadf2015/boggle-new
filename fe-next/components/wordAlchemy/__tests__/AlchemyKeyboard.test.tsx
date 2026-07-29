import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import AlchemyKeyboard from '../AlchemyKeyboard';
import { getKeyboardLetters } from '@/lib/wordAlchemy/keyboard';

describe('AlchemyKeyboard', () => {
  it('renders one button per letter plus a backspace key', () => {
    const letters = getKeyboardLetters('en');
    render(
      <AlchemyKeyboard
        letters={letters}
        dir="ltr"
        onLetter={() => {}}
        onBackspace={() => {}}
        backspaceLabel="Delete letter"
      />,
    );
    // Each letter is an accessible button.
    expect(screen.getByRole('button', { name: 'A' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Z' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Delete letter' })).toBeTruthy();
  });

  it('calls onLetter with the tapped letter', () => {
    const onLetter = vi.fn();
    render(
      <AlchemyKeyboard
        letters={getKeyboardLetters('he')}
        dir="rtl"
        onLetter={onLetter}
        onBackspace={() => {}}
        backspaceLabel="מחיקת אות"
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'ש' }));
    expect(onLetter).toHaveBeenCalledWith('ש');
  });

  it('calls onBackspace when the backspace key is tapped', () => {
    const onBackspace = vi.fn();
    render(
      <AlchemyKeyboard
        letters={['A', 'B']}
        dir="ltr"
        onLetter={() => {}}
        onBackspace={onBackspace}
        backspaceLabel="Delete letter"
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Delete letter' }));
    expect(onBackspace).toHaveBeenCalledTimes(1);
  });

  it('disables every key when disabled', () => {
    render(
      <AlchemyKeyboard
        letters={['A']}
        dir="ltr"
        onLetter={() => {}}
        onBackspace={() => {}}
        backspaceLabel="Delete letter"
        disabled
      />,
    );
    expect(screen.getByRole('button', { name: 'A' })).toHaveProperty('disabled', true);
    expect(screen.getByRole('button', { name: 'Delete letter' })).toHaveProperty('disabled', true);
  });
});
