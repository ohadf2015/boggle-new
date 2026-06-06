/**
 * Tests for the Language Curator scope + gamification pure helpers.
 *
 * TDD: written BEFORE implementation.
 *
 * Two independent axes (by design):
 *   - trust_tier  → CAPABILITY (admin-granted power; what writes are allowed)
 *   - curatorPoints → PRESTIGE (earned per RATIFIED proposal; fun cosmetics + coin bonuses)
 * Splitting them means grinding earns fun rewards but never buys power.
 */

import { describe, it, expect } from 'vitest';
import {
  isCurator,
  curatorLanguages,
  canCurate,
  curatorTier,
  pointsForRatifiedProposal,
  curatorRankForPoints,
  nextCuratorRank,
  progressToNextRank,
  coinBonusForCrossing,
  detectRankUp,
  CURATOR_RANKS,
  type CuratorAssignment,
} from '../curatorScope';

const assign = (o: Partial<CuratorAssignment> = {}): CuratorAssignment => ({
  language: 'he',
  active: true,
  trust_tier: 1,
  curator_points: 0,
  ...o,
});

describe('curator scope — access', () => {
  it('isCurator is false with no assignments', () => {
    expect(isCurator([])).toBe(false);
  });

  it('isCurator is false when all assignments are revoked (inactive)', () => {
    expect(isCurator([assign({ active: false })])).toBe(false);
  });

  it('isCurator is true with at least one active assignment', () => {
    expect(isCurator([assign({ active: false }), assign({ language: 'en' })])).toBe(true);
  });

  it('curatorLanguages returns active languages, deduped + sorted, excluding revoked', () => {
    const a = [
      assign({ language: 'sv' }),
      assign({ language: 'en' }),
      assign({ language: 'en' }), // dupe
      assign({ language: 'ja', active: false }), // revoked → excluded
    ];
    expect(curatorLanguages(a)).toEqual(['en', 'sv']);
  });

  it('canCurate is true only for an active assigned language', () => {
    const a = [assign({ language: 'he' }), assign({ language: 'ja', active: false })];
    expect(canCurate(a, 'he')).toBe(true);
    expect(canCurate(a, 'ja')).toBe(false); // revoked
    expect(canCurate(a, 'en')).toBe(false); // never assigned
  });

  it('curatorTier returns the active assignment tier, or 0 when not a curator for that language', () => {
    const a = [assign({ language: 'he', trust_tier: 3 }), assign({ language: 'en', trust_tier: 2, active: false })];
    expect(curatorTier(a, 'he')).toBe(3);
    expect(curatorTier(a, 'en')).toBe(0); // revoked → no power
    expect(curatorTier(a, 'sv')).toBe(0); // unassigned
  });
});

describe('curator gamification — points per ratified proposal', () => {
  it('awards points only for known proposal kinds', () => {
    expect(pointsForRatifiedProposal('word_approve')).toBeGreaterThan(0);
    expect(pointsForRatifiedProposal('puzzle_verdict')).toBeGreaterThan(0);
    expect(pointsForRatifiedProposal('word_flag_invalid')).toBeGreaterThan(0);
  });

  it('rewards a confirmed approval at least as much as a flag (positive contribution weighted)', () => {
    expect(pointsForRatifiedProposal('word_approve')).toBeGreaterThanOrEqual(
      pointsForRatifiedProposal('word_flag_invalid')
    );
  });

  it('returns 0 for an unknown kind', () => {
    // @ts-expect-error — exercising the runtime guard
    expect(pointsForRatifiedProposal('totally_made_up')).toBe(0);
  });
});

describe('curator gamification — rank ladder', () => {
  it('ranks are ordered by ascending minPoints starting at 0', () => {
    expect(CURATOR_RANKS[0].minPoints).toBe(0);
    for (let i = 1; i < CURATOR_RANKS.length; i++) {
      expect(CURATOR_RANKS[i].minPoints).toBeGreaterThan(CURATOR_RANKS[i - 1].minPoints);
    }
  });

  it('a brand-new curator is the lowest rank', () => {
    expect(curatorRankForPoints(0).key).toBe(CURATOR_RANKS[0].key);
  });

  it('returns the highest rank whose threshold is met', () => {
    const second = CURATOR_RANKS[1];
    expect(curatorRankForPoints(second.minPoints).key).toBe(second.key);
    expect(curatorRankForPoints(second.minPoints - 1).key).toBe(CURATOR_RANKS[0].key);
  });

  it('caps at the top rank for very high point totals', () => {
    const top = CURATOR_RANKS[CURATOR_RANKS.length - 1];
    expect(curatorRankForPoints(9_999_999).key).toBe(top.key);
    expect(nextCuratorRank(9_999_999)).toBeNull();
  });

  it('progressToNextRank reports a 0..1 ratio toward the next threshold', () => {
    const p = progressToNextRank(0);
    expect(p.current.key).toBe(CURATOR_RANKS[0].key);
    expect(p.next?.key).toBe(CURATOR_RANKS[1].key);
    expect(p.ratio).toBeGreaterThanOrEqual(0);
    expect(p.ratio).toBeLessThan(1);
  });

  it('progressToNextRank ratio is 1 at the top rank (no next)', () => {
    const top = CURATOR_RANKS[CURATOR_RANKS.length - 1];
    const p = progressToNextRank(top.minPoints);
    expect(p.next).toBeNull();
    expect(p.ratio).toBe(1);
  });
});

describe('curator gamification — rank-up detection', () => {
  it('returns the new rank when points cross a threshold', () => {
    // apprentice(0) → scribe(50)
    const up = detectRankUp(40, 60);
    expect(up?.key).toBe('scribe');
  });

  it('returns null when staying within the same rank', () => {
    expect(detectRankUp(10, 40)).toBeNull(); // both apprentice
  });

  it('returns null when points do not increase (no-op refresh / decrease)', () => {
    expect(detectRankUp(60, 60)).toBeNull();
    expect(detectRankUp(60, 55)).toBeNull();
  });

  it('reports the highest rank reached when crossing multiple thresholds at once', () => {
    // 0 → 250 jumps apprentice→scribe→lexicographer
    expect(detectRankUp(0, 250)?.key).toBe('lexicographer');
  });
});

describe('curator gamification — coin bonus milestones', () => {
  it('grants nothing when no milestone is crossed', () => {
    expect(coinBonusForCrossing(0, 5)).toBe(0);
  });

  it('grants the milestone bonus exactly once when crossed', () => {
    // crossing from below to at/above the first milestone pays it once
    const firstMilestone = 50;
    expect(coinBonusForCrossing(firstMilestone - 1, firstMilestone)).toBeGreaterThan(0);
    expect(coinBonusForCrossing(firstMilestone, firstMilestone + 1)).toBe(0); // already paid
  });

  it('sums all milestones crossed in a single jump', () => {
    const big = coinBonusForCrossing(0, 1_000_000);
    const incremental = coinBonusForCrossing(0, 50) + coinBonusForCrossing(50, 1_000_000);
    expect(big).toBe(incremental);
    expect(big).toBeGreaterThan(0);
  });
});
