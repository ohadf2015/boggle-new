import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The run-end purse pays app-wide coins. A run token can be re-dealt at /start
 * and lost on purpose, so the "only once" key must be the RUN (its seed) and
 * durable — an attempt-keyed, in-process guard let one token bank again and again.
 */
const route = readFileSync(resolve(__dirname, '../complete/route.ts'), 'utf8');

describe('adventure purse — once per run', () => {
  it('claims the purse durably by user + run seed before paying', () => {
    expect(route).toMatch(/claimOnce\(`adv-purse:\$\{user\.id\}:\$\{payload\.run\.seed\}`\)/);
    const claimAt = route.indexOf('claimOnce(`adv-purse');
    const payAt = route.indexOf("'adventure_purse'");
    expect(claimAt).toBeGreaterThan(-1);
    expect(payAt).toBeGreaterThan(claimAt);
  });

  it('pays only on a fresh claim (taken or store-down withholds)', () => {
    expect(route).toMatch(/if \(claim === 'claimed'\)/);
  });
});
