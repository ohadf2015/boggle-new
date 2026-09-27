import { describe, it, expect } from 'vitest';
import {
  tenantArrival,
  TENANT_KINDS,
  tenantKindsAt,
  type TenantKind,
} from '../tenants';

describe('tenantKindsAt — the arrival cast grows with altitude', () => {
  it('starts with the ground-level cast only', () => {
    const kinds = tenantKindsAt(0);
    expect(kinds.length).toBeGreaterThan(0);
    for (const k of kinds) expect(TENANT_KINDS.find((t) => t.id === k)!.fromM).toBe(0);
  });

  it('unlocks strictly more kinds the higher the tower gets', () => {
    const low = tenantKindsAt(0).length;
    const mid = tenantKindsAt(600).length;
    const high = tenantKindsAt(2000).length;
    expect(mid).toBeGreaterThan(low);
    expect(high).toBeGreaterThan(mid);
  });

  it('never offers a kind below its unlock altitude', () => {
    for (const m of [0, 100, 500, 900, 1600, 3000]) {
      for (const id of tenantKindsAt(m)) {
        expect(TENANT_KINDS.find((t) => t.id === id)!.fromM).toBeLessThanOrEqual(m);
      }
    }
  });
});

describe('tenantArrival', () => {
  it('is deterministic for the same floor — a re-render never re-rolls the cast', () => {
    const a = tenantArrival(4, 5, 300);
    const b = tenantArrival(4, 5, 300);
    expect(a).toEqual(b);
  });

  it('differs between floors so the tower does not look cloned', () => {
    const arrivals = Array.from({ length: 12 }, (_, i) => tenantArrival(i, 5, 300));
    const shapes = new Set(arrivals.map((a) => `${a.count}:${a.kind}:${a.fromLeft}`));
    expect(shapes.size).toBeGreaterThan(2);
  });

  it('scales the crowd with the word length — a bigger floor houses more people', () => {
    const short = tenantArrival(3, 3, 300).count;
    const long = tenantArrival(3, 8, 300).count;
    expect(long).toBeGreaterThanOrEqual(short);
    expect(long).toBeLessThanOrEqual(4);
  });

  it('always sends at least one tenant, and never more than the cap', () => {
    for (let i = 0; i < 40; i++) {
      const a = tenantArrival(i, 5, i * 97);
      expect(a.count).toBeGreaterThanOrEqual(1);
      expect(a.count).toBeLessThanOrEqual(4);
    }
  });

  it('only picks a kind that is unlocked at that altitude', () => {
    for (const m of [0, 200, 700, 1200, 2500]) {
      for (let i = 0; i < 20; i++) {
        const kind: TenantKind = tenantArrival(i, 5, m).kind;
        expect(tenantKindsAt(m)).toContain(kind);
      }
    }
  });

  it('spreads arrivals across both sides of the floor', () => {
    const sides = new Set(Array.from({ length: 20 }, (_, i) => tenantArrival(i, 5, 300).fromLeft));
    expect(sides.size).toBe(2);
  });
});
