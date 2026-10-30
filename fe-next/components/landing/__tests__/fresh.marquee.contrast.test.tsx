/**
 * The homepage marquee's "+N" points badge is 12px bold text on bg-neo-purple.
 * White on #8b5cf6 measures 4.23:1, under the WCAG AA 4.5:1 floor for small
 * text (public audit, 2026-10-29). Ratios are computed from the default theme
 * tokens in app/globals.css, so a token change re-checks the badge.
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { FreshMarquee } from '../fresh/FreshMarquee';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));

const css = readFileSync(path.resolve(__dirname, '../../../app/globals.css'), 'utf8');

/** First (default theme) value of a --neo-* token, as [r, g, b]. */
function token(name: string): [number, number, number] {
  const m = css.match(new RegExp(`--neo-${name}:\\s*([^;]+);`));
  if (!m) throw new Error(`--neo-${name} not found`);
  const v = m[1].trim();
  if (v.startsWith('#')) {
    const n = parseInt(v.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const [r, g, b] = v.split(/\s+/).map(Number);
  return [r, g, b];
}

function luminance([r, g, b]: [number, number, number]): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrast(a: [number, number, number], b: [number, number, number]): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe('FreshMarquee points badge contrast', () => {
  it('given the badge on bg-neo-purple, when rendered, then its text meets WCAG AA 4.5:1', () => {
    const { container } = render(<FreshMarquee />);
    const badges = [...container.querySelectorAll('span')].filter((el) => el.classList.contains('bg-neo-purple'));
    expect(badges.length).toBeGreaterThan(0);

    for (const badge of badges) {
      const textClass = [...badge.classList].find((c) => /^text-neo-(black|white)$/.test(c));
      expect(textClass).toBeDefined();
      const fg = token(textClass!.replace('text-neo-', ''));
      expect(contrast(fg, token('purple'))).toBeGreaterThanOrEqual(4.5);
    }
  });
});
