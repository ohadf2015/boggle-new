/**
 * Word Tower in-game chrome — no mid-run daily↔endless switch.
 *
 * Daily mode still enters via `?daily=1` (hub/URL); the play surface must not
 * offer a control that flips modes mid-climb.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(resolve(__dirname, '../WordTowerGame.tsx'), 'utf8');

describe('WordTowerGame daily chrome (no mid-run mode switch)', () => {
  it('does not render a daily↔endless toggle control (toDaily / toEndless)', () => {
    expect(src).not.toMatch(/wordTower\.daily\.toDaily/);
    expect(src).not.toMatch(/wordTower\.daily\.toEndless/);
  });

  it('does not ship a mid-play href that flips daily mode (?daily=1 toggle link)', () => {
    // Entry still reads `?daily=1` in useDailyMode; the control was a plain <a href=…>.
    expect(src).not.toMatch(/href=\{daily \? ['"]\?['"] : ['"]\?daily=1['"]\}/);
    expect(src).not.toMatch(/href=\{daily \? ['"]\?daily=1['"] : ['"]\?['"]\}/);
  });

  it('still supports daily entry via query (useDailyMode reads daily=1)', () => {
    expect(src).toMatch(/get\(['"]daily['"]\)\s*===\s*['"]1['"]/);
  });

  it('keeps optional non-action daily badge when already in daily mode', () => {
    expect(src).toMatch(/wordTower\.daily\.badge/);
  });
});
