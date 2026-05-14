import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildChainLevel } from '../engine/chain-builder';
import { validateChainLevel } from '../engine/chain-validator';
import type { ChainLevelSpec } from '../types';

const pack = JSON.parse(
  readFileSync(resolve(process.cwd(), 'content/blast/packs/he/pack-chain.json'), 'utf8'),
) as { locale: string; levels: ChainLevelSpec[] };

describe('he pack-chain.json', () => {
  it('has exactly 15 levels numbered 1..15', () => {
    expect(pack.levels.map((l) => l.levelNumber)).toEqual(
      Array.from({ length: 15 }, (_, i) => i + 1),
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
      const n = spec.levelNumber;
      const expected = n <= 5 ? 3 : n <= 10 ? 4 : 5;
      expect(spec.chain.length, `${spec.id}`).toBe(expected);
    }
  });

  it('columns exceed the longest word in every chain', () => {
    for (const spec of pack.levels) {
      const longest = Math.max(...spec.chain.map((w) => [...w].length));
      expect(spec.columns, `${spec.id}`).toBeGreaterThan(longest);
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
