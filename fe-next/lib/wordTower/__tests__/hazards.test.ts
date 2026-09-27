import { describe, it, expect } from 'vitest';
import { WORD_TOWER_HAZARDS, hazardsCrossed } from '../hazards';

describe('WORD_TOWER_HAZARDS', () => {
  it('rises monotonically with unique ids; bombs low, hurricanes high', () => {
    for (let i = 1; i < WORD_TOWER_HAZARDS.length; i++) {
      expect(WORD_TOWER_HAZARDS[i]!.atM).toBeGreaterThan(WORD_TOWER_HAZARDS[i - 1]!.atM);
    }
    expect(new Set(WORD_TOWER_HAZARDS.map((h) => h.id)).size).toBe(WORD_TOWER_HAZARDS.length);
    expect(WORD_TOWER_HAZARDS.every((h) => h.floors >= 1)).toBe(true);
    // The first hazard sits above the tutorial zone (early climb is safe).
    expect(WORD_TOWER_HAZARDS[0]!.atM).toBeGreaterThanOrEqual(120);
    // Bombs are the low-altitude hazard; hurricanes take over up high.
    expect(WORD_TOWER_HAZARDS[0]!.kind).toBe('bomb');
    expect(WORD_TOWER_HAZARDS[WORD_TOWER_HAZARDS.length - 1]!.kind).toBe('hurricane');
  });
});

describe('hazardsCrossed', () => {
  const fired = new Set<string>();
  const first = WORD_TOWER_HAZARDS[0]!;

  it('fires a hazard whose altitude is crossed while climbing (exclusive lower, inclusive upper)', () => {
    const got = hazardsCrossed(first.atM - 10, first.atM, fired);
    expect(got.map((h) => h.id)).toContain(first.id);
  });

  it('never fires while descending or static', () => {
    expect(hazardsCrossed(500, 500, fired)).toEqual([]);
    expect(hazardsCrossed(500, 200, fired)).toEqual([]);
  });

  it('never re-fires an already-fired hazard (no infinite ruin loop)', () => {
    const already = new Set([first.id]);
    expect(hazardsCrossed(first.atM - 10, first.atM + 5, already).map((h) => h.id)).not.toContain(first.id);
  });

  it('returns every hazard crossed in one big jump', () => {
    const span = hazardsCrossed(0, 10_000, new Set());
    expect(span.length).toBe(WORD_TOWER_HAZARDS.length);
  });
});
