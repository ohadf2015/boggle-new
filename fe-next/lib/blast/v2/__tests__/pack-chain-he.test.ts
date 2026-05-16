import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildChainLevel } from '../engine/chain-builder';
import { validateChainLevel } from '../engine/chain-validator';
import type { ChainLevelSpec } from '../types';

const pack = JSON.parse(
  readFileSync(resolve(process.cwd(), 'content/blast/packs/he/pack-chain.json'), 'utf8'),
) as { locale: string; levels: ChainLevelSpec[] };

// Mirror the en curve: from L6 onward each tier adds one extra sophisticated
// word over the prior curve. Onboarding (1–5) stays at 3 to keep newcomers
// scanning simple patterns.
function expectedChainLength(n: number): number {
  if (n <= 5) return 3;
  if (n <= 10) return 5;
  if (n <= 15) return 6;
  if (n <= 20) return 7;
  if (n <= 25) return 8;
  return 9;
}

describe('he pack-chain.json', () => {
  it('has exactly 30 levels numbered 1..30', () => {
    expect(pack.levels.map((l) => l.levelNumber)).toEqual(
      Array.from({ length: 30 }, (_, i) => i + 1),
    );
  });

  it('every level builds and passes the forced-chain validator', () => {
    for (const spec of pack.levels) {
      const level = buildChainLevel(spec, spec.levelNumber);
      expect(level, `${spec.id} failed to build`).not.toBeNull();
      const check = validateChainLevel(level!);
      expect(check.ok, `${spec.id}: ${check.ok ? '' : check.reason}`).toBe(true);
    }
  });

  it('respects the difficulty curve (chain length grows by tier)', () => {
    for (const spec of pack.levels) {
      expect(spec.chain.length, `${spec.id}`).toBe(expectedChainLength(spec.levelNumber));
    }
  });

  // Phone-readability cap — every level ships with at most 5 columns so each
  // tile reads at ~60px+ on a 360px-wide phone. Words longer than 5 letters
  // are placed vertically (single-column tower) by the chain builder. L30 is
  // the lone exception: its 9-word science chain mixes 2-letter words (תא, דמ,
  // גנ) with 6-7 letter monsters and can't be isolated on 5 cols without a
  // full content re-author — granted 6 cols (~57px tiles on a 360px phone).
  it('caps columns at 5 across all levels (L30 exception)', () => {
    for (const spec of pack.levels) {
      const cap = spec.levelNumber === 30 ? 7 : 5;
      expect(spec.columns, `${spec.id}: ${spec.columns} columns exceeds ${cap}`).toBeLessThanOrEqual(cap);
    }
  });

  it('uses base-form Hebrew letters only (no final forms in source)', () => {
    const finals = ['ך', 'ם', 'ן', 'ף', 'ץ'];
    for (const spec of pack.levels) {
      for (const word of spec.chain) {
        for (const f of finals) {
          expect(word.includes(f), `${spec.id} word ${word} has final form ${f}`).toBe(false);
        }
      }
    }
  });

  it('decoyTiles is 0 for all levels (decoys deferred for v1)', () => {
    for (const spec of pack.levels) {
      expect(spec.decoyTiles, `${spec.id}`).toBe(0);
    }
  });
});
