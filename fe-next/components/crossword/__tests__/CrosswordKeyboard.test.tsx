// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CrosswordKeyboard } from '../CrosswordKeyboard';
import heClueBank from '@/lib/crossword/data/clueBank.he.json';

const SOFIT = ['ך', 'ם', 'ן', 'ף', 'ץ'];
const HEBREW_ALPHABET = 'אבגדהוזחטיכלמנסעפצקרשת'.split('');

function keys(): string[] {
  return screen
    .getAllByRole('button')
    .map((b) => b.textContent ?? '')
    .filter((s) => s.length === 1);
}

describe('CrosswordKeyboard — Hebrew', () => {
  it('offers no final (sofit) letter keys', () => {
    render(
      <CrosswordKeyboard locale="he" onLetter={() => {}} onBackspace={() => {}} backspaceLabel="b" />,
    );
    for (const f of SOFIT) expect(keys()).not.toContain(f);
  });

  it('still offers every one of the 22 regular Hebrew letters', () => {
    render(
      <CrosswordKeyboard locale="he" onLetter={() => {}} onBackspace={() => {}} backspaceLabel="b" />,
    );
    const shown = keys();
    for (const letter of HEBREW_ALPHABET) expect(shown).toContain(letter);
    expect(shown).toHaveLength(22);
  });

  // The safety proof for dropping those five keys: they were unreachable input. Answers are stored
  // in regular form, so a sofit key could never match a solution letter — it only ever folded back
  // to the regular letter sitting next to it on the same keyboard.
  it('is safe because no Hebrew answer contains a final letter', () => {
    const answers = Object.keys(heClueBank as Record<string, unknown>);
    expect(answers.length).toBeGreaterThan(1000); // guard: we really did load the bank
    expect(answers.filter((a) => SOFIT.some((f) => a.includes(f)))).toEqual([]);
  });

  it('lays the board out right-to-left and reports the letter tapped', () => {
    const onLetter = vi.fn();
    const { container } = render(
      <CrosswordKeyboard locale="he" onLetter={onLetter} onBackspace={() => {}} backspaceLabel="b" />,
    );
    expect(container.querySelector('[dir="rtl"]')).not.toBeNull();
    fireEvent.click(screen.getByText('א'));
    expect(onLetter).toHaveBeenCalledWith('א');
  });
});
