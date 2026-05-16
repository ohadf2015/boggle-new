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

  it('columns exceed the longest word in every chain', () => {
    for (const spec of pack.levels) {
      const longest = Math.max(...spec.chain.map((w) => w.length));
      expect(spec.columns, `${spec.id}`).toBeGreaterThan(longest);
    }
  });

  // Phone-readability ceiling — long words (≥6 letters) shipped on phones at
  // L16+ produced cramped tiles + horizontal scroll. Hard-capping the longest
  // word at 5 keeps tile size legible without a redesign.
  it('caps the longest word at 5 letters from L11 onward', () => {
    for (const spec of pack.levels) {
      if (spec.levelNumber < 11) continue;
      const longest = Math.max(...spec.chain.map((w) => w.length));
      expect(longest, `${spec.id}: word length ${longest} exceeds 5`).toBeLessThanOrEqual(5);
    }
  });

  // Board-width ceiling — tile size shrinks linearly with column count on the
  // narrow axis. Capping at 10 keeps tiles tappable on a 360px-wide phone
  // (≈ 32px per tile) and a large step down from the prior 11–15 columns
  // that produced thin strips on long chains. The 10-col allowance is for
  // dense 9-word chains (L26-30) where the chain builder needs extra width
  // to isolate all the words without dictionary collisions.
  it('caps columns at 10 from L11 onward', () => {
    for (const spec of pack.levels) {
      if (spec.levelNumber < 11) continue;
      expect(spec.columns, `${spec.id}: ${spec.columns} columns exceeds 10`).toBeLessThanOrEqual(10);
    }
  });
});
