import { describe, it, expect, beforeEach } from 'vitest';
import {
  getAlchemyStreakPB,
  setAlchemyStreakPB,
  checkAndUpdatePB,
} from '../alchemyStreak';

describe('alchemyStreak', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('getAlchemyStreakPB', () => {
    it('returns 0 when no PB stored', () => {
      expect(getAlchemyStreakPB()).toBe(0);
    });

    it('returns stored PB', () => {
      setAlchemyStreakPB(5);
      expect(getAlchemyStreakPB()).toBe(5);
    });

    it('returns 0 for invalid stored value', () => {
      localStorage.setItem('lexiclash:alchemy:streakPB', 'bad');
      expect(getAlchemyStreakPB()).toBe(0);
    });
  });

  describe('checkAndUpdatePB', () => {
    it('returns isNewPB=true and updates storage when streak exceeds PB', () => {
      const result = checkAndUpdatePB(3);
      expect(result.isNewPB).toBe(true);
      expect(result.prevPB).toBe(0);
      expect(getAlchemyStreakPB()).toBe(3);
    });

    it('returns isNewPB=false when streak equals PB', () => {
      setAlchemyStreakPB(3);
      const result = checkAndUpdatePB(3);
      expect(result.isNewPB).toBe(false);
      expect(result.prevPB).toBe(3);
      expect(getAlchemyStreakPB()).toBe(3);
    });

    it('returns isNewPB=false when streak is below PB', () => {
      setAlchemyStreakPB(5);
      const result = checkAndUpdatePB(3);
      expect(result.isNewPB).toBe(false);
      expect(result.prevPB).toBe(5);
      expect(getAlchemyStreakPB()).toBe(5);
    });

    it('updates PB when new streak is higher', () => {
      setAlchemyStreakPB(3);
      checkAndUpdatePB(7);
      expect(getAlchemyStreakPB()).toBe(7);
    });

    it('does not update PB for streak of 1 against PB of 0 (trivial case still counts)', () => {
      const result = checkAndUpdatePB(1);
      expect(result.isNewPB).toBe(true);
      expect(getAlchemyStreakPB()).toBe(1);
    });
  });
});
