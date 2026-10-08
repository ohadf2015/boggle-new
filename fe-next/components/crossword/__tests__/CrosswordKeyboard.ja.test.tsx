// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CrosswordKeyboard } from '../CrosswordKeyboard';
import { foldJaKana } from '@/lib/crossword/answer';
import jaPuzzles from '@/lib/crossword/data/puzzles.ja.json';

const BASE = 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをんー';
const VOICED = 'がぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽ';

function kanaKeys(): string[] {
  return screen
    .getAllByRole('button')
    .map((b) => b.textContent ?? '')
    .filter((s) => s.length === 1 && /[ぁ-ゖー]/.test(s));
}

function renderJa(onLetter = vi.fn(), onBackspace = vi.fn()) {
  render(
    <CrosswordKeyboard
      locale="ja"
      onLetter={onLetter}
      onBackspace={onBackspace}
      backspaceLabel="delete"
      voicedLabel="voiced kana"
      basicLabel="basic kana"
    />,
  );
  return { onLetter, onBackspace };
}

describe('CrosswordKeyboard — Japanese kana', () => {
  it('shows the 46 base kana plus ー, never QWERTY', () => {
    renderJa();
    const shown = kanaKeys();
    for (const k of BASE) expect(shown).toContain(k);
    expect(shown).toHaveLength(BASE.length);
    expect(screen.queryByText('q')).toBeNull();
  });

  it('switches to the dakuten/handakuten page and back with a labelled toggle', () => {
    renderJa();
    const toggle = screen.getByRole('button', { name: 'voiced kana' });
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(toggle);
    const shown = kanaKeys();
    for (const k of VOICED) expect(shown).toContain(k);
    expect(shown).toContain('ん');
    expect(shown).toContain('ー');
    expect(screen.queryByText('か')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'basic kana' }));
    expect(kanaKeys()).toContain('か');
  });

  it('reports the kana tapped and the backspace', () => {
    const { onLetter, onBackspace } = renderJa();
    fireEvent.click(screen.getByText('ね'));
    fireEvent.click(screen.getByRole('button', { name: 'voiced kana' }));
    fireEvent.click(screen.getByText('ぱ'));
    fireEvent.click(screen.getByRole('button', { name: 'delete' }));
    expect(onLetter.mock.calls.map((c) => c[0])).toEqual(['ね', 'ぱ']);
    expect(onBackspace).toHaveBeenCalledTimes(1);
  });

  it('can type every letter of every shipped ja puzzle', () => {
    const typeable = new Set([...BASE, ...VOICED]);
    const letters = new Set(
      (jaPuzzles as { grid: (string | null)[][] }[]).flatMap((p) => p.grid.flat().filter((c): c is string => !!c)),
    );
    expect(letters.size).toBeGreaterThan(20);
    for (const l of letters) expect(typeable.has(foldJaKana(l)), l).toBe(true);
  });
});
