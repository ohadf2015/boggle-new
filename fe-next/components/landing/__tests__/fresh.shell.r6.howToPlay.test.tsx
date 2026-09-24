/**
 * Piece A (shell), round 6: How to Play stops being fine print.
 *
 * Blind critic, round 6 (the same gap, fifth time): "Everything from 'How to
 * Play' down turns into an SEO content dump: a dense FAQ paragraph, a jarring
 * cyan-bordered callout ..., a second FAQ accordion, and a footer with dozens
 * of tiny uncategorized link lines ... so the page ends on the same fun,
 * game-forward energy it opened with."
 *
 * Rounds 2-5 made the tail QUIETER each time (outline icons, no shadows,
 * text-sm, one narrow column) and lost every time. Round 6 reverses that:
 * How to Play is a real section in the page's own vocabulary. The four steps
 * are the hero's tiles (colored, black border, hard shadow) strung on a lime
 * trace path; the bold "What is LexiClash? ..." Q&A paragraph is gone (its
 * title is an sr-only heading, SPEC §9; its answer is the section's line, set
 * like every other section line); nothing in it folds.
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { LandingSEOSection } from '../LandingSEOSection';
import { contentByLocale } from '../landingSEOContent';

vi.mock('next/navigation', () => ({ useParams: () => ({ locale: 'en' }) }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
  useLanguageSafe: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));

const c = contentByLocale.en;
const read = (rel: string) => readFileSync(path.resolve(__dirname, '..', rel), 'utf8');

describe('How to Play is a section, not fine print', () => {
  it('opens with a section-scale headline, like sections 2-6', () => {
    render(<LandingSEOSection />);
    const h = screen.getByRole('heading', { name: c.howToPlayTitle });
    expect(h.tagName).toBe('H2');
    expect(h.className).toMatch(/\bfont-neo-display\b/);
    expect(h.className).toMatch(/\bmd:text-5xl\b/);
  });

  it('drops the bold "What is LexiClash?" question: its title is an sr-only heading', () => {
    render(<LandingSEOSection />);
    const what = screen.getByRole('heading', { name: c.whatIsTitle });
    expect(what.tagName).toBe('H3');
    expect(what.className).toMatch(/\bsr-only\b/);
  });

  it('sets the what-is answer as the section line: under the headline, above the steps, line-sized', () => {
    const { container } = render(<LandingSEOSection />);
    const line = screen.getByText(c.whatIsShort);
    expect(line.tagName).toBe('P');
    expect(line.className).not.toMatch(/\bsr-only\b|\bhidden\b|\btext-(xs|sm)\b/);
    expect(line.className).toMatch(/\bmd:text-lg\b/);
    const h = screen.getByRole('heading', { name: c.howToPlayTitle });
    const steps = container.querySelector('ol') as HTMLElement;
    expect(h.compareDocumentPosition(line) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(line.compareDocumentPosition(steps) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('strings the steps on a lime trace path (the hero trace, echoed)', () => {
    const { container } = render(<LandingSEOSection />);
    const pathEl = container.querySelector('[data-step-path]') as HTMLElement;
    expect(pathEl).not.toBeNull();
    const rail = pathEl.querySelector('[data-step-rail]') as HTMLElement;
    expect(rail).not.toBeNull();
    expect(rail.getAttribute('aria-hidden')).toBe('true');
    expect(rail.className).toMatch(/\bbg-neo-lime\b/);
    expect(pathEl.contains(container.querySelector('ol'))).toBe(true);
  });

  it("makes every step one of the hero's tiles: colored, black-bordered, hard-shadowed, one accent each", () => {
    const { container } = render(<LandingSEOSection />);
    const items = [...container.querySelectorAll('ol > li')] as HTMLElement[];
    expect(items).toHaveLength(c.steps.length);
    const accents = new Set<string>();
    items.forEach((li, i) => {
      const tile = li.querySelector('[data-step-art]') as HTMLElement;
      expect(tile.getAttribute('aria-hidden')).toBe('true');
      const accent = tile.getAttribute('data-step-art') as string;
      accents.add(accent);
      expect(tile.className).toMatch(new RegExp(`\\bbg-neo-${accent}\\b`));
      expect(tile.className).toMatch(/\bborder-3\b/);
      expect(tile.className).toMatch(/\bborder-neo-black\b/);
      expect(tile.className).toMatch(/\bshadow-hard-lg\b/);
      expect(within(li).getByText(c.steps[i])).toBeTruthy();
    });
    expect([...accents].sort()).toEqual(['cyan', 'lime', 'pink', 'purple']);
  });

  it('folds nothing: the page keeps exactly one accordion, the FAQ', () => {
    const { container } = render(<LandingSEOSection />);
    expect(container.querySelectorAll('details, summary')).toHaveLength(0);
  });
});

describe('How to Play motion stays CSS-only and motion-safe', () => {
  it('keeps every hover/press move behind motion-safe', () => {
    const moves = read('LandingSEOSection.tsx')
      .split(/[\s'"`]+/)
      .filter((cl) => /(^|:)(hover|active|group-hover|group-active):-?(rotate|translate|scale)/.test(cl));
    expect(moves.length).toBeGreaterThan(0);
    for (const cl of moves) expect(cl.startsWith('motion-safe:')).toBe(true);
  });

  it('runs the step pop only when the visitor has not asked for reduced motion', () => {
    const css = read('fresh/FreshMotion.module.css');
    const gate = css.indexOf('@media (prefers-reduced-motion: no-preference)');
    const use = css.indexOf('animation: fresh-step');
    expect(use).toBeGreaterThan(gate);
    expect(css).toMatch(/@keyframes fresh-step\b/);
    // the tile's own style is the finished frame: no opacity-0 start
    expect(read('LandingSEOSection.tsx')).not.toMatch(/\bopacity-0\b/);
  });
});
