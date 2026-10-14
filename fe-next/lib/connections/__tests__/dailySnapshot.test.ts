import { describe, it, expect, beforeEach } from 'vitest';
import {
  saveDailySnapshot,
  loadDailySnapshot,
  updateDailySnapshot,
  type DailyBridgeSnapshot,
  type DailyPyramidSnapshot,
} from '../dailySnapshot';

const OUTCOME = { reached: true, solved: true, wrongAttempts: 0, hintUsed: false };

const bridge: DailyBridgeSnapshot = {
  kind: 'bridge',
  dateISO: '2026-10-14',
  language: 'en',
  score: 320,
  solvedCount: 4,
  total: 5,
  outcomes: [OUTCOME, OUTCOME, OUTCOME, OUTCOME, { ...OUTCOME, solved: false }],
  streak: 3,
  rank: 12,
};

const pyramid: DailyPyramidSnapshot = {
  kind: 'pyramid',
  dateISO: '2026-10-15',
  language: 'he',
  pyramidId: 'he-pyr-1',
  won: true,
  score: 210,
  gaveUpBase: [false, true, false],
  outcomes: [OUTCOME, { ...OUTCOME, solved: false }, OUTCOME, OUTCOME],
  streak: 2,
};

describe('daily snapshot — the finished run, kept for the rest of the UTC day', () => {
  beforeEach(() => window.localStorage.clear());

  it('returns null when nothing was played', () => {
    // Given a fresh device / When loading today's snapshot / Then there is none
    expect(loadDailySnapshot('2026-10-14')).toBeNull();
  });

  it('round-trips a 5-riddle run for the same day', () => {
    // Given a saved bridge run
    saveDailySnapshot(bridge);
    // When the player comes back the same day
    // Then the full run comes back
    expect(loadDailySnapshot('2026-10-14')).toEqual(bridge);
  });

  it('round-trips a pyramid run', () => {
    saveDailySnapshot(pyramid);
    expect(loadDailySnapshot('2026-10-15')).toEqual(pyramid);
  });

  it('ignores a snapshot from a previous day', () => {
    // Given yesterday's run / When today loads / Then it is a fresh day
    saveDailySnapshot(bridge);
    expect(loadDailySnapshot('2026-10-15')).toBeNull();
  });

  it('ignores corrupt or foreign data instead of throwing', () => {
    window.localStorage.setItem('connections-daily-snapshot', '{not json');
    expect(loadDailySnapshot('2026-10-14')).toBeNull();
    window.localStorage.setItem('connections-daily-snapshot', JSON.stringify({ dateISO: '2026-10-14', kind: 'bridge' }));
    expect(loadDailySnapshot('2026-10-14')).toBeNull();
  });

  it('merges late server numbers (streak/rank) into the stored run', () => {
    // Given a run saved before the score submit resolved
    saveDailySnapshot({ ...bridge, streak: 0, rank: null });
    // When the server answers
    updateDailySnapshot('2026-10-14', { streak: 5, rank: 3 });
    // Then the revisit shows the server numbers
    expect(loadDailySnapshot('2026-10-14')).toMatchObject({ streak: 5, rank: 3, score: 320 });
  });

  it('does not resurrect a stale day when updating', () => {
    saveDailySnapshot(bridge);
    updateDailySnapshot('2026-10-15', { streak: 9 });
    expect(loadDailySnapshot('2026-10-14')?.streak).toBe(3);
    expect(loadDailySnapshot('2026-10-15')).toBeNull();
  });
});
