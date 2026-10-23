import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { PLAN_MATRIX_ROWS } from '@/lib/education/planMatrix';
import { PRO_FEATURE_BACKING } from '../proFeatureBacking';

const ROOT = join(__dirname, '../../../..');
const proOnly = PLAN_MATRIX_ROWS.filter((r) => r.free !== r.pro).map((r) => r.key);

describe('every Pro row is backed on the server and reachable from HQ', () => {
  it('lists a backing for every matrix row where Free and Pro differ', () => {
    expect(Object.keys(PRO_FEATURE_BACKING).sort()).toEqual(expect.arrayContaining(proOnly.sort()));
  });

  it.each(Object.entries(PRO_FEATURE_BACKING))('%s: its route exists and enforces the plan', (_key, backing) => {
    const file = join(ROOT, backing.route);
    expect(existsSync(file), backing.route).toBe(true);
    expect(readFileSync(file, 'utf8')).toContain(backing.guard);
  });

  it.each(Object.entries(PRO_FEATURE_BACKING))('%s: its UI exists and is at most 2 taps from HQ', (_key, backing) => {
    expect(existsSync(join(ROOT, backing.ui)), backing.ui).toBe(true);
    expect(backing.tapsFromHq).toBeLessThanOrEqual(2);
  });
});
