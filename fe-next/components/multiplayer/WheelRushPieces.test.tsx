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

describe('MyWordsChips styling', () => {
  const entry = (kind: WordEntry['kind']): WordEntry => ({ word: 'VEND', kind, score: 24, ts: 0 });

  it('guards the words list from browser auto-translation (letters must not be rewritten)', () => {
    render(<MyWordsChips words={[entry('locked')]} />);
    const slot = screen.getByTestId('my-words-slot');
    expect(slot).toHaveAttribute('translate', 'no');
    expect(slot.className).toContain('notranslate');
  });

  it('renders calm, dark chips instead of full-saturation fills', () => {
    const { container } = render(<MyWordsChips words={[entry('closed')]} />);
    const chip = container.querySelector('[data-kind="closed"]') as HTMLElement;
    // Closed words use the neutral dark surface — NOT the old solid bg-neo-cyan.
    expect(chip.className).toContain('bg-neo-navy-light');
    expect(chip.className).not.toContain('bg-neo-cyan ');
  });

  it('gives every chip the same fixed height so the row never looks ragged', () => {
    const { container } = render(
      <MyWordsChips words={[entry('locked'), entry('stolen'), entry('closed'), entry('stolen-from-me')]} />,
    );
    const chips = container.querySelectorAll('[data-kind]');
    expect(chips.length).toBe(4);
    chips.forEach(chip => expect((chip as HTMLElement).className).toContain('h-7'));
  });

  it('still distinguishes word status by a subtle tinted border per kind', () => {
    const { container } = render(
      <MyWordsChips words={[entry('locked'), entry('stolen'), entry('stolen-from-me')]} />,
    );
    expect((container.querySelector('[data-kind="locked"]') as HTMLElement).className).toContain('border-neo-lime');
    expect((container.querySelector('[data-kind="stolen"]') as HTMLElement).className).toContain('border-neo-pink');
    const lost = container.querySelector('[data-kind="stolen-from-me"]') as HTMLElement;
    expect(lost.className).toContain('border-neo-red');
    expect(lost.className).toContain('line-through');
  });

  it('shows the score on a chip', () => {
    render(<MyWordsChips words={[entry('locked')]} />);
    expect(screen.getByText('+24')).toBeTruthy();
  });
});
