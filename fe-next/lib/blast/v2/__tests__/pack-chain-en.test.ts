import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildChainLevel } from '../engine/chain-builder';
import { validateChainLevel } from '../engine/chain-validator';
import type { ChainLevelSpec } from '../types';

const pack = JSON.parse(
  readFileSync(resolve(process.cwd(), 'content/blast/packs/en/pack-chain.json'), 'utf8'),
) as { locale: string; levels: ChainLevelSpec[] };

// Difficulty curve — bumped one notch starting at the L6 sophistication gate.
// Onboarding (1–5) stays at 3-word chains so newcomers can build pattern
// recognition. From L6 each tier carries one extra word over the prior
// curve (5/6/7/8/9 vs 4/5/6/7/8) — the added word is intentionally a less-
// common, longer thematic pick so vocabulary AND chain depth both step up.
function expectedChainLength(n: number): number {
  if (n <= 5) return 3;
  if (n <= 10) return 5;
  if (n <= 15) return 6;
  if (n <= 20) return 7;
  if (n <= 25) return 8;
  return 9;
}

describe('en pack-chain.json', () => {
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
  // are placed vertically (single-column tower) by the chain builder.
  it('caps columns at 5 across all levels', () => {
    for (const spec of pack.levels) {
      expect(spec.columns, `${spec.id}: ${spec.columns} columns exceeds 5`).toBeLessThanOrEqual(5);
    }
  });
});
