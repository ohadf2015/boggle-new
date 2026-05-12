import { describe, it, expect } from 'vitest';
import {
  getDailyQuestModes,
  getSlotForMode,
  DAILY_QUEST_POOL,
  type DailyQuestMode,
} from '../dailyQuestPool';

describe('getDailyQuestModes', () => {
  it('returns exactly 3 modes', () => {
    const modes = getDailyQuestModes('2026-05-13');
    expect(modes).toHaveLength(3);
  });

  it('returns 3 unique modes', () => {
    const modes = getDailyQuestModes('2026-05-13');
    expect(new Set(modes).size).toBe(3);
  });

  it('returns only modes from the pool', () => {
    for (const mode of getDailyQuestModes('2026-05-13')) {
      expect(DAILY_QUEST_POOL).toContain(mode);
    }
  });

  it('never returns adventure or singlePlayer', () => {
    for (let day = 0; day < 100; day++) {
      const date = new Date(Date.UTC(2026, 4, 1) + day * 86_400_000)
        .toISOString()
        .split('T')[0];
      const modes = getDailyQuestModes(date);
      expect(modes).not.toContain('adventure');
      expect(modes).not.toContain('singlePlayer');
    }
  });

  it('is deterministic — same date yields same result', () => {
    const date = '2026-05-13';
    expect(getDailyQuestModes(date)).toEqual(getDailyQuestModes(date));
  });

  it('produces variety across 20 consecutive dates', () => {
    const seen = new Set<string>();
    for (let day = 0; day < 20; day++) {
      const date = new Date(Date.UTC(2026, 4, 1) + day * 86_400_000)
        .toISOString()
        .split('T')[0];
      seen.add(getDailyQuestModes(date).join(','));
    }
    expect(seen.size).toBeGreaterThan(1);
  });

  it('uses current date when none provided', () => {
    const today = new Date().toISOString().split('T')[0];
    expect(getDailyQuestModes()).toEqual(getDailyQuestModes(today));
  });

  it('covers all pool modes across enough days (pigeonhole)', () => {
    const seen = new Set<DailyQuestMode>();
    for (let day = 0; day < 30; day++) {
      const date = new Date(Date.UTC(2026, 4, 1) + day * 86_400_000)
        .toISOString()
        .split('T')[0];
      for (const mode of getDailyQuestModes(date)) seen.add(mode);
    }
    for (const mode of DAILY_QUEST_POOL) {
      expect(seen).toContain(mode);
    }
  });
});

describe('getSlotForMode', () => {
  it('returns -1 for a mode not in today\'s quests', () => {
    const date = '2026-05-13';
    const modes = getDailyQuestModes(date);
    const absent = DAILY_QUEST_POOL.find(m => !modes.includes(m as DailyQuestMode))!;
    expect(getSlotForMode(absent as DailyQuestMode, date)).toBe(-1);
  });

  it('returns correct index for each of today\'s 3 modes', () => {
    const date = '2026-05-13';
    const modes = getDailyQuestModes(date);
    expect(getSlotForMode(modes[0], date)).toBe(0);
    expect(getSlotForMode(modes[1], date)).toBe(1);
    expect(getSlotForMode(modes[2], date)).toBe(2);
  });

  it('is consistent with getDailyQuestModes for all pool modes', () => {
    const date = '2026-08-01';
    const modes = getDailyQuestModes(date);
    for (const mode of DAILY_QUEST_POOL) {
      const slot = getSlotForMode(mode as DailyQuestMode, date);
      if (modes.includes(mode as DailyQuestMode)) {
        expect(slot).toBeGreaterThanOrEqual(0);
        expect(slot).toBeLessThanOrEqual(2);
        expect(modes[slot]).toBe(mode);
      } else {
        expect(slot).toBe(-1);
      }
    }
  });
});
