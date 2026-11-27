import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (p: string) => readFileSync(path.join(__dirname, '..', '..', p), 'utf8');
const css = read('app/holidays.css');

describe('holidays.css', () => {
  it('is imported from globals.css', () => {
    expect(read('app/globals.css')).toContain("@import './holidays.css';");
  });

  it('keeps the ambience behind reduced motion and off game pages', () => {
    const ambience = css.slice(css.indexOf('/* ── Ambience'));
    expect(ambience).toMatch(/@media \(prefers-reduced-motion: no-preference\)/);
    const bodies = ambience.match(/body[^\s,{]*::after/g)!;
    expect(bodies.length).toBeGreaterThan(0);
    for (const b of bodies) expect(b).toBe('body:not([data-lc-heavy-game]):not([data-holiday-calm])::after');
  });

  it('has no colour literals (tokens only)', () => {
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i);
  });

  it('lets a selected or animating bonus tile keep its state colour', () => {
    for (const rule of css.match(/[^}]*\.holiday-bonus-tile[^{]*\{/g) ?? []) {
      expect(rule).toContain(':not([data-sel]):not([data-fx])');
    }
  });

  it('never tweens opacity', () => {
    for (const kf of css.match(/@keyframes[^{]+\{[\s\S]*?\n\}/g) ?? []) expect(kf).not.toMatch(/opacity/);
  });

  it('uses only --neo-holiday-* tokens that exist in :root and the tailwind theme', () => {
    const used = new Set(css.match(/--neo-holiday-[a-z-]+/g));
    const globals = read('app/globals.css');
    const tw = read('tailwind.config.js');
    expect(used.size).toBeGreaterThan(0);
    for (const token of used) {
      expect(globals).toContain(`${token}:`);
      expect(tw).toContain(`var(${token})`);
    }
  });

  it('leaves paid board themes and tile skins alone', () => {
    for (const rule of css.match(/html\.holiday-[a-z]+ \.game-board-frame[^{,]*/g) ?? []) {
      expect(rule).toContain(":not([class*='cosmetic-board-']):not([data-tile-skin])");
    }
  });
});
