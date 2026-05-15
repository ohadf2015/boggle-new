import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildChainLevel } from '../engine/chain-builder';
import { validateChainLevel } from '../engine/chain-validator';
import type { ChainLevelSpec } from '../types';

const pack = JSON.parse(
  readFileSync(resolve(process.cwd(), 'content/blast/packs/en/pack-chain.json'), 'utf8'),
) as { locale: string; levels: ChainLevelSpec[] };

// Difficulty curve — each 5-level tier bumps the chain length so progression
// stays readable. Tiers 1–3 (3/4/5-word chains) are the original onboarding
// arc; tiers 4–6 (6/7/8-word chains) extend the curated content from 15 → 30
// levels before the generator takes over.
function expectedChainLength(n: number): number {
  if (n <= 5) return 3;
  if (n <= 10) return 4;
  if (n <= 15) return 5;
  if (n <= 20) return 6;
  if (n <= 25) return 7;
  return 8;
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
});
