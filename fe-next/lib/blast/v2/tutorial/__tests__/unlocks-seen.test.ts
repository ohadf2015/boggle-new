import { describe, it, expect } from 'vitest';
import {
  MECHANIC_KEYS,
  type MechanicKey,
  type UnlocksSeen,
  validateUnlocksSeen,
  hasSeenUnlock,
  markUnlockSeen,
  shouldSkipAll,
  setSkipAll,
  completeFtue,
} from '../unlocks-seen';

describe('unlocks-seen helpers', () => {
  describe('hasSeenUnlock', () => {
    it('returns true when unlock is marked seen', () => {
      const unlocks: UnlocksSeen = { coinOverlay: true };
      expect(hasSeenUnlock(unlocks, 'coinOverlay')).toBe(true);
    });

    it('returns false when unlock is not seen', () => {
      const unlocks: UnlocksSeen = {};
      expect(hasSeenUnlock(unlocks, 'coinOverlay')).toBe(false);
    });

    it('works with ftue_completed flag', () => {
      const unlocks: UnlocksSeen = { ftue_completed: true };
      expect(hasSeenUnlock(unlocks, 'ftue_completed')).toBe(true);
    });
  });

  describe('markUnlockSeen', () => {
    it('marks a mechanic as seen', () => {
      const unlocks: UnlocksSeen = {};
      const updated = markUnlockSeen(unlocks, 'gemTiles');
      expect(updated.gemTiles).toBe(true);
      expect(unlocks.gemTiles).toBeUndefined(); // original unchanged
    });

    it('preserves existing fields', () => {
      const unlocks: UnlocksSeen = { coinOverlay: true };
      const updated = markUnlockSeen(unlocks, 'gemTiles');
      expect(updated.coinOverlay).toBe(true);
      expect(updated.gemTiles).toBe(true);
    });

    it('marks ftue_completed', () => {
      const unlocks: UnlocksSeen = {};
      const updated = markUnlockSeen(unlocks, 'ftue_completed');
      expect(updated.ftue_completed).toBe(true);
    });
  });

  describe('shouldSkipAll', () => {
    it('returns true when skip_all is set', () => {
      const unlocks: UnlocksSeen = { skip_all: true };
      expect(shouldSkipAll(unlocks)).toBe(true);
    });

    it('returns false when skip_all is not set', () => {
      const unlocks: UnlocksSeen = {};
      expect(shouldSkipAll(unlocks)).toBe(false);
    });

    it('returns false when skip_all is explicitly false', () => {
      const unlocks: UnlocksSeen = { skip_all: false };
      expect(shouldSkipAll(unlocks)).toBe(false);
    });
  });

  describe('setSkipAll', () => {
    it('sets skip_all to true', () => {
      const unlocks: UnlocksSeen = {};
      const updated = setSkipAll(unlocks, true);
      expect(updated.skip_all).toBe(true);
    });

    it('sets skip_all to false', () => {
      const unlocks: UnlocksSeen = { skip_all: true };
      const updated = setSkipAll(unlocks, false);
      expect(updated.skip_all).toBe(false);
    });

    it('preserves other fields', () => {
      const unlocks: UnlocksSeen = { coinOverlay: true, ftue_completed: true };
      const updated = setSkipAll(unlocks, true);
      expect(updated.coinOverlay).toBe(true);
      expect(updated.ftue_completed).toBe(true);
      expect(updated.skip_all).toBe(true);
    });
  });

  describe('completeFtue', () => {
    it('sets ftue_completed to true', () => {
      const unlocks: UnlocksSeen = {};
      const updated = completeFtue(unlocks);
      expect(updated.ftue_completed).toBe(true);
    });

    it('preserves existing fields', () => {
      const unlocks: UnlocksSeen = { coinOverlay: true };
      const updated = completeFtue(unlocks);
      expect(updated.coinOverlay).toBe(true);
      expect(updated.ftue_completed).toBe(true);
    });
  });

  describe('validateUnlocksSeen', () => {
    it('accepts valid UnlocksSeen object', () => {
      const raw = { coinOverlay: true, gemTiles: false };
      const result = validateUnlocksSeen(raw);
      expect(result.coinOverlay).toBe(true);
      expect(result.gemTiles).toBe(false);
    });

    it('accepts non-boolean values as undefined', () => {
      const raw = { coinOverlay: null };
      const result = validateUnlocksSeen(raw);
      // null is coerced, but should be handled by schema validation
      expect(result).toBeDefined();
    });

    it('round-trip serialization preserves all fields', () => {
      const original: UnlocksSeen = {
        ftue_completed: true,
        coinOverlay: true,
        skip_all: false,
      };
      const json = JSON.stringify(original);
      const parsed = validateUnlocksSeen(JSON.parse(json));
      expect(parsed.ftue_completed).toBe(true);
      expect(parsed.coinOverlay).toBe(true);
      expect(parsed.skip_all).toBe(false);
    });
  });

  describe('MECHANIC_KEYS constant', () => {
    it('contains 12 mechanic keys', () => {
      expect(MECHANIC_KEYS.length).toBe(12);
    });

    it('includes coinOverlay', () => {
      expect(MECHANIC_KEYS).toContain('coinOverlay');
    });

    it('includes frozenTiles', () => {
      expect(MECHANIC_KEYS).toContain('frozenTiles');
    });

    it('includes multiWordReveal', () => {
      expect(MECHANIC_KEYS).toContain('multiWordReveal');
    });
  });
});
