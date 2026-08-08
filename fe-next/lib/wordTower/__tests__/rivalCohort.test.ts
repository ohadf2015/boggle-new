import { describe, it, expect } from 'vitest';
import { rivalCohort, rankAmong, rankDelta, isLiveRival, LIVE_WINDOW_MS } from '../rivalCohort';
import type { LeaderboardRivalRow } from '../rivals';

/** Board ordered best→worst, the shape `/api/word-tower/leaderboard` returns. */
const row = (rank: number, heightM: number, extra: Partial<LeaderboardRivalRow> = {}): LeaderboardRivalRow => ({
  rank,
  playerId: `p${rank}`,
  username: `Player ${rank}`,
  bestHeightM: heightM,
  highestBiome: 'city',
  ...extra,
});

const BOARD: LeaderboardRivalRow[] = [
  row(1, 900), row(2, 640), row(3, 500), row(4, 410),
  row(5, 120), row(6, 96), row(7, 74), row(8, 58),
  row(9, 41), row(10, 33), row(11, 22), row(12, 14),
  row(13, 8), row(14, 3),
];

describe('rivalCohort — reachable band, not the global top', () => {
  it('picks rivals AROUND the viewer instead of the unreachable leaders', () => {
    const cohort = rivalCohort(BOARD, 30, { above: 3, below: 2, anchor: false });
    const heights = cohort.map((r) => r.heightM).sort((a, b) => a - b);
    // Nearest three above 30 are 33, 41, 58; nearest two below are 22 and 14.
    expect(heights).toEqual([14, 22, 33, 41, 58]);
  });

  it('never returns a rival the viewer has no chance of reaching as the chase target', () => {
    const cohort = rivalCohort(BOARD, 30, { above: 3, below: 2, anchor: false });
    const nearestAbove = cohort.filter((r) => r.heightM > 30).sort((a, b) => a.heightM - b.heightM)[0];
    expect(nearestAbove!.heightM).toBe(33); // was 900 under the old global-top slice
  });

  it('adds the board leader as a single aspirational anchor when asked', () => {
    const cohort = rivalCohort(BOARD, 30, { above: 3, below: 2, anchor: true });
    expect(cohort.some((r) => r.heightM === 900)).toBe(true);
    expect(cohort).toHaveLength(6);
  });

  it('does not duplicate the leader when they are already in the band', () => {
    const cohort = rivalCohort(BOARD, 700, { above: 3, below: 2, anchor: true });
    const ids = cohort.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(cohort.filter((r) => r.heightM === 900)).toHaveLength(1);
  });

  it('backfills from the other side when one side is short', () => {
    // Viewer above everyone: nothing to chase, so the band fills downward.
    const cohort = rivalCohort(BOARD, 5000, { above: 3, below: 2, anchor: false });
    expect(cohort).toHaveLength(5);
    expect(cohort.every((r) => r.heightM < 5000)).toBe(true);
  });

  it('backfills upward for a brand-new player with nobody below them', () => {
    const cohort = rivalCohort(BOARD, 0, { above: 3, below: 2, anchor: false });
    expect(cohort).toHaveLength(5);
    const heights = cohort.map((r) => r.heightM).sort((a, b) => a - b);
    expect(heights).toEqual([3, 8, 14, 22, 33]);
  });

  it('excludes the viewer themselves so you can never pass yourself', () => {
    const board = [...BOARD, row(99, 35, { isYou: true })];
    const cohort = rivalCohort(board, 30, { above: 3, below: 2, anchor: true });
    expect(cohort.some((r) => r.id === 'p99')).toBe(false);
  });

  it('drops rows with no climb', () => {
    const board = [...BOARD, row(98, 0)];
    const cohort = rivalCohort(board, 0, { above: 8, below: 8, anchor: false });
    expect(cohort.some((r) => r.heightM === 0)).toBe(false);
  });

  it('returns an empty cohort for an empty board (no rail, no fabrication)', () => {
    expect(rivalCohort([], 30)).toEqual([]);
  });

  it('carries the avatar + zone through so ghost towers stay themed', () => {
    const board = [row(1, 90, { highestBiome: 'orbit', avatarEmoji: '🦊', avatarColor: '#f00' })];
    const [rival] = rivalCohort(board, 10, { above: 1, below: 0, anchor: false });
    expect(rival!.highestBiome).toBe('orbit');
    expect(rival!.avatarEmoji).toBe('🦊');
  });
});

describe('rankAmong — the number players actually defend', () => {
  it('is 1 when the viewer is above everyone', () => {
    expect(rankAmong(5000, BOARD)).toBe(1);
  });

  it('counts only the records still above the viewer', () => {
    // 900, 640, 500, 410 are above 300 → viewer sits 5th.
    expect(rankAmong(300, BOARD)).toBe(5);
  });

  it('ties count as ahead of the viewer, so a rank is never over-claimed', () => {
    expect(rankAmong(410, BOARD)).toBe(5);
  });

  it('ignores the viewer\'s own row', () => {
    const board = [...BOARD, row(99, 5000, { isYou: true })];
    expect(rankAmong(300, board)).toBe(5);
  });

  it('is 1 on an empty board', () => {
    expect(rankAmong(0, [])).toBe(1);
  });
});

describe('rankDelta — the overtake readout', () => {
  it('reports the climb from the old rank into the new one', () => {
    expect(rankDelta(12, 11)).toEqual({ from: 12, to: 11, gained: 1 });
  });

  it('reports a multi-place jump', () => {
    expect(rankDelta(12, 8)).toEqual({ from: 12, to: 8, gained: 4 });
  });

  it('returns null when the rank did not improve — no empty celebration', () => {
    expect(rankDelta(11, 11)).toBeNull();
    expect(rankDelta(8, 12)).toBeNull();
  });
});

describe('isLiveRival — real presence, never fabricated', () => {
  const now = 1_700_000_000_000;

  it('flags a rival whose row moved inside the window', () => {
    expect(isLiveRival({ updatedAt: now - 30_000, currentHeightM: 12 }, now)).toBe(true);
  });

  it('does not flag a stale row', () => {
    expect(isLiveRival({ updatedAt: now - LIVE_WINDOW_MS - 1, currentHeightM: 12 }, now)).toBe(false);
  });

  it('does not flag a recent row with no climb in progress', () => {
    expect(isLiveRival({ updatedAt: now - 30_000, currentHeightM: 0 }, now)).toBe(false);
  });

  it('does not flag a row with no timestamp at all', () => {
    expect(isLiveRival({ currentHeightM: 12 }, now)).toBe(false);
  });

  it('tolerates clock skew putting the row slightly in the future', () => {
    expect(isLiveRival({ updatedAt: now + 5_000, currentHeightM: 12 }, now)).toBe(true);
  });
});
