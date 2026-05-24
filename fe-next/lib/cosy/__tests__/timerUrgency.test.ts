import { describe, it, expect } from 'vitest';
import { computeTimerUrgency } from '../timerUrgency';

describe('computeTimerUrgency', () => {
  describe('normal (urgency shown)', () => {
    it('is normal with plenty of time left', () => {
      const u = computeTimerUrgency(60, false);
      expect(u.state).toBe('normal');
      expect(u.isLowTime).toBe(false);
    });

    it('escalates to low at 20s, veryLow at 10s, critical at 5s', () => {
      expect(computeTimerUrgency(20, false).state).toBe('low');
      expect(computeTimerUrgency(10, false).state).toBe('veryLow');
      expect(computeTimerUrgency(5, false).state).toBe('critical');
    });

    it('treats 0 as not very-low/critical (timer ran out, no flashing)', () => {
      const u = computeTimerUrgency(0, false);
      expect(u.isVeryLowTime).toBe(false);
      expect(u.isCriticalTime).toBe(false);
    });
  });

  describe('suppressed (cosy / calm mode)', () => {
    it('stays normal no matter how little time is left', () => {
      expect(computeTimerUrgency(20, true).state).toBe('normal');
      expect(computeTimerUrgency(10, true).state).toBe('normal');
      expect(computeTimerUrgency(5, true).state).toBe('normal');
      expect(computeTimerUrgency(1, true).state).toBe('normal');
    });

    it('reports every urgency flag as false', () => {
      const u = computeTimerUrgency(3, true);
      expect(u.isLowTime).toBe(false);
      expect(u.isVeryLowTime).toBe(false);
      expect(u.isCriticalTime).toBe(false);
    });
  });
});
