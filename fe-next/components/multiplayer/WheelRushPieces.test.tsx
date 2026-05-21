import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MyWordsChips, type WordEntry } from './WheelRushPieces';

const word = (w: string): WordEntry => ({ word: w, kind: 'locked', score: 5, ts: 0 });

describe('MyWordsChips word direction', () => {
  it('renders the words slot LTR by default (English game on Hebrew UI must read LTR)', () => {
    render(<MyWordsChips words={[word('CAT')]} dir="ltr" />);
    const slot = screen.getByTestId('my-words-slot');
    expect(slot).toHaveAttribute('dir', 'ltr');
  });

  it('renders RTL when the game language is Hebrew', () => {
    render(<MyWordsChips words={[word('שלום')]} dir="rtl" />);
    const slot = screen.getByTestId('my-words-slot');
    expect(slot).toHaveAttribute('dir', 'rtl');
  });

  it('defaults to LTR when no dir is provided', () => {
    render(<MyWordsChips words={[word('DOG')]} />);
    expect(screen.getByTestId('my-words-slot')).toHaveAttribute('dir', 'ltr');
  });
});
