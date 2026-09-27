import { describe, it, expect } from 'vitest';
import {
  dayStartKey,
  parseDayStart,
  serializeDayStart,
  resolveDayStart,
  lockDayStart,
  todayClimbM,
  todayFloors,
} from './dayStart';

describe('wordTower/dayStart', () => {
  describe('resolveDayStart', () => {
    it('stamps today when nothing is stored (a first-ever or cleared client)', () => {
      // Given no stored baseline
      // When resolving against a 334m / 60-floor tower
      const ds = resolveDayStart(null, '2026-08-25', 334, 60);
      // Then today starts where the tower stands — climb is 0, not 334
      expect(ds).toEqual({ dayKey: '2026-08-25', startHeightM: 334, startFloors: 60, locked: false });
    });

    it('re-stamps when the stored baseline is from an earlier day', () => {
      // Given yesterday's baseline
      const stored = { dayKey: '2026-08-24', startHeightM: 100, startFloors: 20, locked: true };
      // When a new UTC day begins on a 334m tower
      const ds = resolveDayStart(stored, '2026-08-25', 334, 60);
      // Then the baseline moves up to today's starting height
      expect(ds).toEqual({ dayKey: '2026-08-25', startHeightM: 334, startFloors: 60, locked: false });
    });

    it('re-stamps an UNLOCKED same-day baseline — the late DB swap must not inflate the climb', () => {
      // Given today's baseline stamped from a stale local session (100m)
      const stored = { dayKey: '2026-08-25', startHeightM: 100, startFloors: 20, locked: false };
      // When the server's taller current_state (334m) resolves and replaces it
      const ds = resolveDayStart(stored, '2026-08-25', 334, 60);
      // Then the baseline follows, so the climb stays 0 instead of jumping to 234
      expect(ds.startHeightM).toBe(334);
      expect(ds.startFloors).toBe(60);
      expect(ds.locked).toBe(false);
    });

    it('leaves a LOCKED same-day baseline alone so the climb can accrue', () => {
      // Given the player has already placed a floor today
      const stored = { dayKey: '2026-08-25', startHeightM: 334, startFloors: 60, locked: true };
      // When resolving against a taller tower
      const ds = resolveDayStart(stored, '2026-08-25', 350, 63);
      // Then the baseline is frozen — the 16m and 3 floors are today's climb
      expect(ds).toEqual(stored);
    });
  });

  describe('lockDayStart', () => {
    it('freezes the existing baseline rather than re-stamping to the current height', () => {
      const ds = lockDayStart({ dayKey: '2026-08-25', startHeightM: 334, startFloors: 60, locked: false });
      expect(ds).toEqual({ dayKey: '2026-08-25', startHeightM: 334, startFloors: 60, locked: true });
    });
  });

  describe('todayFloors', () => {
    it('counts only floors built today', () => {
      expect(todayFloors(63, 60)).toBe(3);
    });

    it('is 0 for a returning player who has placed nothing today', () => {
      expect(todayFloors(60, 60)).toBe(0);
    });

    it('never goes negative when a wreck removes floors', () => {
      expect(todayFloors(55, 60)).toBe(0);
    });
  });

  describe('todayClimbM', () => {
    it('reports meters climbed today, not the lifetime tower height', () => {
      // The returning-player bug: 334m tower, one 3-letter word today
      expect(todayClimbM(336, 334)).toBe(2);
    });

    it('reports 0 for a returning player who has placed nothing today', () => {
      // This is the 334->334 and 99->99 case observed in daily_word_tower_attempts
      expect(todayClimbM(334, 334)).toBe(0);
    });

    it('never goes negative when the tower is shortened (a wreck) below the baseline', () => {
      expect(todayClimbM(300, 334)).toBe(0);
    });

    it('puts a newcomer and a veteran on the same scale', () => {
      // A newcomer's first word and a 334m veteran's first word both score 2
      expect(todayClimbM(2, 0)).toBe(2);
      expect(todayClimbM(336, 334)).toBe(2);
    });

    it('works in whole metres so it matches the submitted (floored) score', () => {
      expect(todayClimbM(336.9, 334.2)).toBe(2);
    });
  });

  describe('serialize / parse', () => {
    it('round-trips', () => {
      const ds = { dayKey: '2026-08-25', startHeightM: 334.5, startFloors: 60, locked: true };
      expect(parseDayStart(serializeDayStart(ds))).toEqual(ds);
    });

    it('defaults startFloors to 0 for a blob written before the field existed', () => {
      const parsed = parseDayStart('{"dayKey":"2026-08-25","startHeightM":334,"locked":true}');
      expect(parsed?.startFloors).toBe(0);
    });

    it('returns null for absent or malformed storage rather than throwing', () => {
      expect(parseDayStart(null)).toBeNull();
      expect(parseDayStart('not json')).toBeNull();
      expect(parseDayStart('{"nope":1}')).toBeNull();
    });

    it('is namespaced per UTC date', () => {
      expect(dayStartKey('2026-08-25')).toBe('wt-day-start-2026-08-25');
    });
  });
});
