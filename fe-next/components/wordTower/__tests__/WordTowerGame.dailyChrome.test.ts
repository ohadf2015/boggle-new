/**
 * Word Tower in-game chrome — DAILY-ONLY.
 *
 * The standalone endless run was retired (founder 2026-07-17: "the word tower
 * should be the same word tower of the daily challenge — we shouldn't maintain
 * both modes"). The play surface must not offer a mode toggle, and must not carry
 * the endless-only server-progress fetch.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(resolve(__dirname, '../WordTowerGame.tsx'), 'utf8');

describe('WordTowerGame daily chrome (daily-only, no mode switch)', () => {
  it('does not render a daily↔endless toggle control (toDaily / toEndless)', () => {
    expect(src).not.toMatch(/wordTower\.daily\.toDaily/);
    expect(src).not.toMatch(/wordTower\.daily\.toEndless/);
  });

  it('does not ship a mid-play href that flips daily mode (?daily=1 toggle link)', () => {
    expect(src).not.toMatch(/href=\{daily \? ['"]\?['"] : ['"]\?daily=1['"]\}/);
    expect(src).not.toMatch(/href=\{daily \? ['"]\?daily=1['"] : ['"]\?['"]\}/);
  });

  it('runs the tower in daily mode unconditionally (no endless branch)', () => {
    expect(src).toMatch(/const daily = true/);
    // The retired endless run fetched saved server progress — it must be gone.
    expect(src).not.toMatch(/api\/word-tower\/progress/);
    expect(src).not.toMatch(/useDailyMode/);
  });

  it('always shows the non-action daily badge', () => {
    expect(src).toMatch(/wordTower\.daily\.badge/);
  });
});
