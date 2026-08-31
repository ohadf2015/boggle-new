/**
 * Find Words first-click lock: hover translate + active:animate-neo-press
 * moved the button under the pointer so pointerup missed and the first tap
 * was eaten.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const src = readFileSync(path.resolve(__dirname, '..', 'PageClient.tsx'), 'utf8');

describe('Word Solver Find Words — first click registers', () => {
  it('does not translate or neo-press the solve button', () => {
    const start = src.indexOf('onClick={handleSolve}');
    expect(start).toBeGreaterThan(-1);
    const block = src.slice(start, src.indexOf('{isLoading', start));
    const classes = [...block.matchAll(/'([^']*)'/g)].map((m) => m[1]).join(' ');
    expect(classes).not.toMatch(/translate/);
    expect(classes).not.toMatch(/neo-press/);
    expect(classes).toContain('hover:shadow-hard-pressed');
    expect(classes).toContain('active:shadow-hard-pressed');
  });
});
