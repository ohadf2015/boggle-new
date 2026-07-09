import { describe, it, expect } from 'vitest';
import {
  pickTowerSurprise,
  towerSurpriseReward,
  TOWER_SURPRISE_META,
  resolveTowerSubmitSurprise,
  defaultTowerSurpriseState,
  TOWER_SURPRISE_PITY,
  type TowerSurpriseEvent,
} from '../towerSurprise';

/** New + classic surprise kinds must stay on the pure deterministic path. */
const EXTRA: TowerSurpriseEvent[] = ['echo', 'meteor_strike', 'phantom_floor'];

describe('towerSurprise — extended unexpected events', () => {
  it('registers extra surprise kinds in the pick table + meta', () => {
    for (const ev of EXTRA) {
      expect(TOWER_SURPRISE_META[ev]).toBeDefined();
      expect(TOWER_SURPRISE_META[ev].key).toBeTruthy();
      expect(TOWER_SURPRISE_META[ev].sound).toBeTruthy();
    }
  });

  it('pickTowerSurprise can return every known event including extras', () => {
    const seen = new Set<TowerSurpriseEvent>();
    for (let i = 0; i < 200; i++) {
      seen.add(pickTowerSurprise(i / 200));
    }
    for (const ev of EXTRA) {
      expect(seen.has(ev)).toBe(true);
    }
    // classics still present
    expect(seen.has('surge')).toBe(true);
    expect(seen.has('golden_floor')).toBe(true);
  });

  it('extra events grant non-zero rewards (meters and/or scrambles and/or mult)', () => {
    const ctx = { floorCount: 10, wordsSinceLast: 4, wordLen: 5, combo: 3, baseMeters: 12 };
    for (const ev of EXTRA) {
      const r = towerSurpriseReward(ev, ctx);
      const payout = r.bonusMeters + r.bonusScrambles + (r.nextWordHeightMult > 1 ? 1 : 0);
      expect(payout).toBeGreaterThan(0);
    }
  });

  it('resolveTowerSubmitSurprise stays deterministic for a fixed gameCode seed', () => {
    const a = defaultTowerSurpriseState('daily-feel-2026-07-09');
    const b = defaultTowerSurpriseState('daily-feel-2026-07-09');
    // Force pity fire so event selection is exercised.
    a.wordsSinceSurprise = TOWER_SURPRISE_PITY - 1;
    b.wordsSinceSurprise = TOWER_SURPRISE_PITY - 1;
    const ra = resolveTowerSubmitSurprise(a, { floorCount: 12, wordLen: 6, combo: 4, baseMeters: 14 });
    const rb = resolveTowerSubmitSurprise(b, { floorCount: 12, wordLen: 6, combo: 4, baseMeters: 14 });
    expect(ra.next.activeSurprise?.event).toBe(rb.next.activeSurprise?.event);
    expect(ra.bonusMeters).toBe(rb.bonusMeters);
    expect(ra.next.surpriseSeed).toBe(rb.next.surpriseSeed);
  });
});
