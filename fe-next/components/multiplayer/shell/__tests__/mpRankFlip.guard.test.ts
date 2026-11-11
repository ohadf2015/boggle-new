import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';

describe('rank chip flip (globals.css)', () => {
  const css = readFileSync(join(__dirname, '../../../../app/globals.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

  it('never turns the rank number edge-on or backwards, so the chip never reads "/3" with no number mid-flip', () => {
    const keyframes = css.match(/@keyframes mp-flip\s*\{([\s\S]*?\})\s*\}/)?.[1] ?? '';
    const angles = [...keyframes.matchAll(/rotateX\((-?\d+(?:\.\d+)?)deg\)/g)].map((m) => Math.abs(Number(m[1])));
    expect(angles.length).toBeGreaterThan(0);
    for (const a of angles) expect(a).toBeLessThan(90);
    const rule = css.match(/\.animate-mp-flip\s*\{([^}]*)\}/)?.[1] ?? '';
    expect(rule).toMatch(/animation:\s*mp-flip/);
    expect(rule).not.toMatch(/backface-visibility:\s*hidden/);
  });
});
