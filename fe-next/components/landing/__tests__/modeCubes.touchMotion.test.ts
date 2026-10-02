import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const css = fs.readFileSync(path.join(__dirname, '../../../app/globals.css'), 'utf8');
const POINTER_GATE = '@media (prefers-reduced-motion: no-preference) and (hover: hover) and (pointer: fine)';

function blockAfter(marker: string): string {
  const start = css.indexOf(marker);
  expect(start).toBeGreaterThan(-1);
  let depth = 0;
  for (let i = css.indexOf('{', start); i < css.length; i++) {
    if (css[i] === '{') depth++;
    if (css[i] === '}' && --depth === 0) return css.slice(start, i + 1);
  }
  throw new Error('unbalanced');
}

describe('homepage mode cubes on touch screens', () => {
  it('runs the scroll-driven rise only for a fine pointer, so phone scrolling never moves the tiles', () => {
    const gated = blockAfter(`${POINTER_GATE} {\n  @supports (animation-timeline: view())`);
    expect(gated).toContain('animation-timeline: view()');
    const outside = css.replace(gated, '');
    expect(outside).not.toMatch(/\.cube-reveal\s*\{[^}]*animation:/);
  });

  it('keeps the hover lift off touch screens, where :hover sticks after a tap', () => {
    const outside = css.replace(blockAfter(`${POINTER_GATE} {\n  .cube-deck`), '');
    expect(outside).not.toMatch(/\.cube-tilt:hover/);
  });
});
