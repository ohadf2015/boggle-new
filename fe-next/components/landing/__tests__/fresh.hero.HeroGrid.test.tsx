/**
 * Piece B (hero): HeroGrid is the first-viewport "try it" board. It autoplays a
 * CSS-only trace of the locale's demo word, and a visitor can tap (or drag with
 * a mouse) the same word themselves. Only the target word counts: no invented
 * word lists per locale. Page scroll over the grid is never blocked.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { HeroGrid, getHeroDemo } from '../fresh/HeroGrid';

const lang = { language: 'en' };
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, p?: Record<string, string>) => (p && typeof p === 'object' ? `${k}|${Object.values(p).join('|')}` : k),
    language: lang.language,
    dir: lang.language === 'he' ? 'rtl' : 'ltr',
  }),
}));

function tile(row: number, col: number): HTMLButtonElement {
  const el = document.querySelector<HTMLButtonElement>(`button[data-cell="${row}-${col}"]`);
  if (!el) throw new Error(`no tile ${row}-${col}`);
  return el;
}

function board(): HTMLElement {
  const el = document.querySelector<HTMLElement>('[data-hero-grid]');
  if (!el) throw new Error('no hero grid');
  return el;
}

describe('HeroGrid', () => {
  beforeEach(() => {
    lang.language = 'en';
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders a 3x3 board of the locale demo letters, autoplaying at rest', () => {
    render(<HeroGrid />);
    const buttons = board().querySelectorAll('button[data-cell]');
    expect(buttons).toHaveLength(9);
    expect([...buttons].map((b) => b.textContent).join('')).toBe('CAPDTOERS');
    expect(board()).toHaveAttribute('data-state', 'demo');
    // the lime trace path exists in the server HTML (CSS animates it, no JS)
    expect(board().querySelector('svg polyline')).not.toBeNull();
  });

  it('pins the board to ltr so the SVG path matches the tiles in RTL locales', () => {
    lang.language = 'he';
    render(<HeroGrid />);
    expect(board()).toHaveAttribute('dir', 'ltr');
  });

  it('tapping the demo word in order finds it and reports it once', () => {
    const onFound = vi.fn();
    render(<HeroGrid onFound={onFound} />);
    fireEvent.click(tile(0, 0));
    fireEvent.click(tile(0, 1));
    expect(board()).toHaveAttribute('data-state', 'play');
    fireEvent.click(tile(1, 1));
    expect(board()).toHaveAttribute('data-state', 'found');
    expect(onFound).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/homeFresh\.hero\.found\|CAT/)).toBeInTheDocument();
    expect(tile(1, 1)).toHaveAttribute('aria-pressed', 'true');
  });

  it('a wrong word shakes, then resets to an empty selection with the hint', () => {
    const onFound = vi.fn();
    render(<HeroGrid onFound={onFound} />);
    // D (1,0) -> E (2,0) -> R (2,1): adjacent, but not the word
    fireEvent.click(tile(1, 0));
    fireEvent.click(tile(2, 0));
    fireEvent.click(tile(2, 1));
    expect(board()).toHaveAttribute('data-state', 'miss');
    expect(screen.getByText(/homeFresh\.hero\.miss\|C-A-T/)).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(board()).toHaveAttribute('data-state', 'play');
    expect(board().querySelectorAll('button[aria-pressed="true"]')).toHaveLength(0);
    expect(onFound).not.toHaveBeenCalled();
  });

  it('a non-adjacent tap restarts the selection from that tile', () => {
    render(<HeroGrid />);
    fireEvent.click(tile(0, 0));
    fireEvent.click(tile(2, 2));
    const pressed = board().querySelectorAll('button[aria-pressed="true"]');
    expect(pressed).toHaveLength(1);
    expect(pressed[0]).toBe(tile(2, 2));
  });

  it('tapping the last tile again steps back', () => {
    render(<HeroGrid />);
    fireEvent.click(tile(0, 0));
    fireEvent.click(tile(0, 1));
    fireEvent.click(tile(0, 1));
    expect(tile(0, 1)).toHaveAttribute('aria-pressed', 'false');
    expect(tile(0, 0)).toHaveAttribute('aria-pressed', 'true');
  });

  it('a mouse drag across the word finds it without double-counting the click', () => {
    const onFound = vi.fn();
    render(<HeroGrid onFound={onFound} />);
    fireEvent.pointerDown(tile(0, 0), { pointerType: 'mouse' });
    fireEvent.pointerEnter(tile(0, 1), { pointerType: 'mouse' });
    fireEvent.pointerEnter(tile(1, 1), { pointerType: 'mouse' });
    fireEvent.click(tile(0, 0));
    fireEvent.pointerUp(window);
    expect(board()).toHaveAttribute('data-state', 'found');
    expect(onFound).toHaveBeenCalledTimes(1);
  });

  it('never blocks page scroll over the board (no touch-action:none)', () => {
    render(<HeroGrid />);
    const html = board().outerHTML;
    expect(html).not.toMatch(/touch-none|touch-action:\s*none/);
  });

  it('Hebrew: tracing ש-מ-ש from the right finds the word', () => {
    lang.language = 'he';
    const onFound = vi.fn();
    render(<HeroGrid onFound={onFound} />);
    fireEvent.click(tile(0, 2));
    fireEvent.click(tile(0, 1));
    fireEvent.click(tile(1, 1));
    expect(onFound).toHaveBeenCalledTimes(1);
  });
});

describe('getHeroDemo', () => {
  it.each(['en', 'he', 'sv', 'ja', 'es', 'ru', 'xx'])('%s: the path is adjacent and spells the word', (l) => {
    const demo = getHeroDemo(l);
    expect(demo.letters).toHaveLength(3);
    demo.letters.forEach((row) => expect(row).toHaveLength(3));
    const spelled = demo.path.map((p) => demo.letters[p.row][p.col]).join('');
    expect(spelled).toBe(demo.word);
    for (let i = 1; i < demo.path.length; i++) {
      const a = demo.path[i - 1];
      const b = demo.path[i];
      expect(Math.max(Math.abs(a.row - b.row), Math.abs(a.col - b.col))).toBe(1);
    }
  });

  it('Russian gets a Cyrillic word, not the English fallback', () => {
    expect(getHeroDemo('ru').word).toBe('КОТ');
  });
});
