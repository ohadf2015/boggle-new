import { describe, it, expect } from 'vitest';
import {
  createFireState,
  tickFire,
  resetFire,
  isGameOver,
  applyFrostPause,
  type FireState,
} from '../cascade/fireRow';

describe('cascade/fireRow', () => {
  describe('createFireState', () => {
    it('starts with fireRow=0 and given totalRows', () => {
      const s = createFireState({ totalRows: 7, riseEveryMs: 10_000 });
      expect(s.fireRow).toBe(0);
      expect(s.totalRows).toBe(7);
      expect(s.riseEveryMs).toBe(10_000);
      expect(s.frozenUntilMs).toBe(0);
      expect(s.elapsedSinceRiseMs).toBe(0);
    });
  });

  describe('tickFire', () => {
    it('does not rise before riseEveryMs has accumulated', () => {
      let s = createFireState({ totalRows: 7, riseEveryMs: 10_000 });
      s = tickFire(s, 5_000);
      expect(s.fireRow).toBe(0);
      expect(s.elapsedSinceRiseMs).toBe(5_000);
    });

    it('rises exactly once after one full interval', () => {
      let s = createFireState({ totalRows: 7, riseEveryMs: 10_000 });
      s = tickFire(s, 10_000);
      expect(s.fireRow).toBe(1);
      expect(s.elapsedSinceRiseMs).toBe(0);
    });

    it('rises multiple rows if a large delta accumulates', () => {
      let s = createFireState({ totalRows: 7, riseEveryMs: 10_000 });
      s = tickFire(s, 35_000);
      expect(s.fireRow).toBe(3);
      expect(s.elapsedSinceRiseMs).toBe(5_000);
    });

    it('caps fireRow at totalRows', () => {
      let s = createFireState({ totalRows: 3, riseEveryMs: 1_000 });
      s = tickFire(s, 999_999);
      expect(s.fireRow).toBe(3);
    });

    it('does not rise while frozen', () => {
      let s = createFireState({ totalRows: 7, riseEveryMs: 1_000 });
      s = applyFrostPause(s, 5_000); // freeze 5s
      s = tickFire(s, 2_000);
      expect(s.fireRow).toBe(0);
      // After freeze expires, ticking resumes
      // Second tick: 5000ms wall delta. frozenUntilMs has 3000ms left after the
      // first tick (5000 - 2000 = 3000). So 3000ms consumed by freeze and
      // 2000ms remaining for rises → 2 rises at riseEveryMs=1000.
      s = tickFire(s, 5_000);
      expect(s.fireRow).toBe(2);
      expect(s.frozenUntilMs).toBe(0);
    });

    it('treats deltaMs<=0 as no-op', () => {
      let s = createFireState({ totalRows: 5, riseEveryMs: 1_000 });
      const before = { ...s };
      s = tickFire(s, 0);
      expect(s).toEqual(before);
      s = tickFire(s, -100);
      expect(s).toEqual(before);
    });
  });

  describe('resetFire', () => {
    it('pushes fire down by N rows but not below 0', () => {
      let s = createFireState({ totalRows: 7, riseEveryMs: 1_000 });
      s = { ...s, fireRow: 4 };
      s = resetFire(s, 2);
      expect(s.fireRow).toBe(2);
      s = resetFire(s, 99);
      expect(s.fireRow).toBe(0);
    });

    it('does not affect frozen state', () => {
      let s = createFireState({ totalRows: 7, riseEveryMs: 1_000 });
      s = applyFrostPause(s, 8_000);
      const frozenBefore = s.frozenUntilMs;
      s = resetFire(s, 1);
      expect(s.frozenUntilMs).toBe(frozenBefore);
    });
  });

  describe('isGameOver', () => {
    it('is true when fireRow >= totalRows', () => {
      const s: FireState = {
        fireRow: 7,
        totalRows: 7,
        riseEveryMs: 1_000,
        elapsedSinceRiseMs: 0,
        frozenUntilMs: 0,
      };
      expect(isGameOver(s)).toBe(true);
    });

    it('is false when fireRow < totalRows', () => {
      const s: FireState = {
        fireRow: 6,
        totalRows: 7,
        riseEveryMs: 1_000,
        elapsedSinceRiseMs: 0,
        frozenUntilMs: 0,
      };
      expect(isGameOver(s)).toBe(false);
    });
  });

  describe('applyFrostPause', () => {
    it('extends frozenUntilMs by the given duration relative to elapsed', () => {
      let s = createFireState({ totalRows: 7, riseEveryMs: 1_000 });
      s = applyFrostPause(s, 3_000);
      expect(s.frozenUntilMs).toBe(3_000);
    });

    it('stacks additional frost on top of existing pause', () => {
      let s = createFireState({ totalRows: 7, riseEveryMs: 1_000 });
      s = applyFrostPause(s, 2_000);
      s = applyFrostPause(s, 1_500);
      expect(s.frozenUntilMs).toBe(3_500);
    });
  });
});
