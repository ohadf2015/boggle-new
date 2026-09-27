// Invariants for the Hebrew newspaper (11×11) pool.
//
// The load-bearing one is the RTL round-trip. The pool stores GRIDS, not answers; the answers are
// re-derived at load time by buildGrid, and which direction an across run is read in comes from
// `rtl`. scripts/crossword/build-big.ts bakes with isRtlLocale(locale) and bigPool.toPuzzle loads
// with the same call — but they are separate code paths (the classic asymmetric-path trap), and if
// they ever disagree every across answer comes back reversed. A reversed Hebrew word is essentially
// never itself a word in the bank, so "every across answer is in the clue bank" catches the whole
// class for free.

import { describe, it, expect } from 'vitest';
import pool from '../data/grids.he11.json';
import heClueBank from '../data/clueBank.he.json';
import { pickBigPuzzle } from '../bigPool';
import { isRealCrossword, HE_TEMPLATES_11 } from '../templates';
import { isRtlLocale } from '../format';
import type { ClueMap } from '../generate.runtime';

const clues = heClueBank as unknown as ClueMap;
const grids = (pool as { size: number; grids: string[][] }).grids;
const toSolution = (rows: string[]) =>
  rows.map((r) => r.split('').map((ch) => (ch === '#' ? null : ch)));

describe('Hebrew 11×11 baked pool', () => {
  it('is a real pool at the newspaper size', () => {
    expect((pool as { size: number }).size).toBe(11);
    expect(grids.length).toBeGreaterThanOrEqual(20);
    for (const rows of grids) {
      expect(rows).toHaveLength(11);
      for (const r of rows) expect(r).toHaveLength(11);
    }
  });

  it('every grid passes the "is a real crossword" gate in RTL', () => {
    for (const rows of grids) {
      expect(isRealCrossword(toSolution(rows), true)).toBe(true);
    }
  });

  it('uses only runs the Hebrew bank is deep in (3–4 letters)', () => {
    // The whole reason he needs its own templates: the EN 11×11s want 24 five-letter answers each
    // and Hebrew has 189 of them.
    for (const t of HE_TEMPLATES_11) expect(t.size).toBe(11);
    for (const rows of grids) {
      for (const line of [...rows, ...Array.from({ length: 11 }, (_, c) => rows.map((r) => r[c]).join(''))]) {
        for (const run of line.split('#').filter(Boolean)) {
          expect(run.length).toBeGreaterThanOrEqual(3);
          expect(run.length).toBeLessThanOrEqual(4);
        }
      }
    }
  });

  it('loads as an RTL Hebrew puzzle whose every answer is a real clued word', async () => {
    const puzzle = await pickBigPuzzle(12345, clues, {
      id: 'he-test-full',
      locale: 'he',
      difficulty: 'medium',
    });
    expect(puzzle).not.toBeNull();
    expect(puzzle!.size).toBe(11);
    expect(puzzle!.rtl).toBe(true);
    expect(isRtlLocale('he')).toBe(true);
    expect(puzzle!.slots.length).toBeGreaterThan(12); // newspaper scale — drives the clue-list UI

    for (const s of puzzle!.slots) {
      // Reversed-answer detection: a baker/loader rtl mismatch lands here.
      expect(clues[s.answer], `${s.dir} ${s.number} = "${s.answer}" is not in the Hebrew bank`)
        .toBeDefined();
      expect(s.clue.length).toBeGreaterThan(0);
    }
  });

  it('is deterministic — the same seed yields the same board', async () => {
    const meta = { id: 'he-det', locale: 'he' as const, difficulty: 'medium' as const };
    const a = await pickBigPuzzle(777, clues, meta);
    const b = await pickBigPuzzle(777, clues, meta);
    expect(a!.slots.map((s) => s.answer)).toEqual(b!.slots.map((s) => s.answer));
  });
});
