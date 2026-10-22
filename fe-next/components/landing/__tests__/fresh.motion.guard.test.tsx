/**
 * Motion contract for the homepage and the education landing: every animation
 * and transition sits behind `prefers-reduced-motion: no-preference`, and no
 * reveal starts from a transparent frame, so reduced motion, no-JS, crawlers
 * and a paused capture all see finished content.
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { FreshSection } from '../fresh/FreshSection';
import { FreshMarquee, marqueeWords } from '../fresh/FreshMarquee';

const lang = { language: 'en' };
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: lang.language, dir: lang.language === 'he' ? 'rtl' : 'ltr' }),
}));

const root = path.resolve(__dirname, '..', '..');
const read = (rel: string) => readFileSync(path.join(root, rel), 'utf8');

const MOTION_CSS = ['landing/fresh/FreshReveal.module.css', 'education/landing/landingMotion.module.css'];

/** Removes every `@media (prefers-reduced-motion: no-preference) {…}` block (brace matched). */
function stripMotionSafe(css: string): string {
  let out = '';
  let i = 0;
  const marker = /@media\s*\(prefers-reduced-motion:\s*no-preference\)\s*\{/g;
  for (let m = marker.exec(css); m; m = marker.exec(css)) {
    out += css.slice(i, m.index);
    let depth = 1;
    let j = m.index + m[0].length;
    while (depth > 0 && j < css.length) {
      if (css[j] === '{') depth++;
      else if (css[j] === '}') depth--;
      j++;
    }
    i = j;
    marker.lastIndex = j;
  }
  return out + css.slice(i);
}

/** Removes @keyframes definitions (they only run when an animation names them). */
const stripKeyframes = (css: string) => css.replace(/@keyframes[^{]+\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, '');

describe.each(MOTION_CSS)('%s', (file) => {
  const css = read(file).replace(/\/\*[\s\S]*?\*\//g, '');

  it('declares animation and transition only inside a prefers-reduced-motion: no-preference block', () => {
    const outside = stripKeyframes(stripMotionSafe(css));
    expect(outside).not.toMatch(/\banimation(-name|-timeline)?\s*:/);
    expect(outside).not.toMatch(/\btransition\s*:/);
  });

  it('never starts a keyframe from a see-through frame (no opacity below 1 anywhere)', () => {
    for (const m of css.matchAll(/opacity\s*:\s*([\d.]+)/g)) expect(Number(m[1])).toBe(1);
  });

  it('scroll-linked reveals are feature-detected, so unsupported browsers keep the resting frame', () => {
    if (!/animation-timeline/.test(css)) return;
    const gated = /@supports\s*\(animation-timeline:\s*view\(\)\)/.test(css);
    expect(gated).toBe(true);
  });

  it('declares scroll timelines as longhands: the build folds a shorthand + timeline into one invalid `animation`', () => {
    expect(css).not.toMatch(/\banimation\s*:[^;]*;\s*animation-timeline/);
  });
});

describe('FreshSection motion hooks', () => {
  it('wraps the art (not the art itself) in a scroll-reveal layer, so the art keeps its own tilt', () => {
    const { container } = render(
      <FreshSection id="daily" accent="cyan" title="t" line="l" art={<div data-testid="art" />} />
    );
    const art = container.querySelector('[data-testid="art"]') as HTMLElement;
    const wrap = art.parentElement as HTMLElement;
    expect(wrap.getAttribute('data-fresh-reveal')).toBe('art');
  });

  it('keeps the default beat rhythm and offers a compact size for a closing beat', () => {
    const { container } = render(
      <FreshSection id="classrooms" accent="purple" size="compact" title="t" line="l" art={<div />} />
    );
    const cls = (container.querySelector('section') as HTMLElement).className;
    expect(cls).toMatch(/(^|\s)py-16(\s|$)/);
    expect(cls).toMatch(/(^|\s)md:py-28(\s|$)/);
    expect(cls).not.toMatch(/(^|\s)md:py-40(\s|$)/);
  });
});

describe('FreshMarquee', () => {
  it('is decoration: aria-hidden, no section id, no heading', () => {
    lang.language = 'en';
    const { container } = render(<FreshMarquee />);
    const band = container.firstElementChild as HTMLElement;
    expect(band.getAttribute('aria-hidden')).toBe('true');
    expect(container.querySelector('[data-fresh-section]')).toBeNull();
    expect(container.querySelector('h1,h2,h3')).toBeNull();
  });

  it('renders the word run twice for a seamless loop, every word visible at rest', () => {
    lang.language = 'en';
    const { container } = render(<FreshMarquee />);
    const runs = container.querySelectorAll('[data-marquee-run]');
    expect(runs).toHaveLength(2);
    const words = marqueeWords('en');
    expect(runs[0].querySelectorAll('[data-marquee-word]')).toHaveLength(words.length);
  });

  it("speaks the visitor's language (Hebrew words on /he, romaji convention on /ja)", () => {
    expect(marqueeWords('he').every((w) => /[֐-׿]/.test(w))).toBe(true);
    expect(marqueeWords('ja')).toEqual(marqueeWords('en'));
    expect(marqueeWords('xx')).toEqual(marqueeWords('en'));
  });
});
