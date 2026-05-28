/**
 * Test suite for confettiUtils
 *
 * Tests Z-index constants and layered celebration system
 */

import { Z_INDEX } from '../confettiUtils';

// canvas-confetti uses requestAnimationFrame internally; stub it for jsdom
beforeAll(() => {
  if (typeof globalThis.requestAnimationFrame === 'undefined') {
    globalThis.requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(cb, 0) as unknown as number;
    globalThis.cancelAnimationFrame = (id: number) => clearTimeout(id);
  }
});

describe('confettiUtils', () => {
  describe('Z_INDEX constants', () => {
    it('should define BACKGROUND_PARTICLES constant', () => {
      // GIVEN/WHEN
      const zIndex = Z_INDEX.BACKGROUND_PARTICLES;

      // THEN
      expect(zIndex).toBe(1000);
      expect(typeof zIndex).toBe('number');
    });

    it('should define MIDGROUND_PARTICLES constant', () => {
      // GIVEN/WHEN
      const zIndex = Z_INDEX.MIDGROUND_PARTICLES;

      // THEN
      expect(zIndex).toBe(2000);
      expect(typeof zIndex).toBe('number');
    });

    it('should define FOREGROUND_PARTICLES constant', () => {
      // GIVEN/WHEN
      const zIndex = Z_INDEX.FOREGROUND_PARTICLES;

      // THEN
      expect(zIndex).toBe(3000);
      expect(typeof zIndex).toBe('number');
    });

    it('should define CELEBRATION_OVERLAY constant', () => {
      // GIVEN/WHEN
      const zIndex = Z_INDEX.CELEBRATION_OVERLAY;

      // THEN
      expect(zIndex).toBe(9000);
      expect(typeof zIndex).toBe('number');
    });

    it('should define CINEMATIC_PLAYER constant', () => {
      // GIVEN/WHEN
      const zIndex = Z_INDEX.CINEMATIC_PLAYER;

      // THEN
      expect(zIndex).toBe(9999);
      expect(typeof zIndex).toBe('number');
    });

    it('should have z-index values in ascending order', () => {
      // GIVEN/WHEN
      const values = [
        Z_INDEX.BACKGROUND_PARTICLES,
        Z_INDEX.MIDGROUND_PARTICLES,
        Z_INDEX.FOREGROUND_PARTICLES,
        Z_INDEX.CELEBRATION_OVERLAY,
        Z_INDEX.CINEMATIC_PLAYER,
      ];

      // THEN
      for (let i = 0; i < values.length - 1; i++) {
        expect(values[i]).toBeLessThan(values[i + 1]);
      }
    });

    it('should be exported as const object', () => {
      // GIVEN/WHEN
      const constantsType = typeof Z_INDEX;

      // THEN
      expect(constantsType).toBe('object');
      expect(Z_INDEX).toBeDefined();
      expect(Object.isFrozen(Z_INDEX)).toBe(false); // `as const` doesn't freeze at runtime
    });
  });

  describe('fireLayeredCelebration function', () => {
    it('should be exported and callable', async () => {
      // GIVEN
      const { fireLayeredCelebration } = await import('../confettiUtils');

      // THEN
      expect(fireLayeredCelebration).toBeDefined();
      expect(typeof fireLayeredCelebration).toBe('function');
    });

    it('should accept totalBudget parameter', async () => {
      // GIVEN
      const { fireLayeredCelebration } = await import('../confettiUtils');

      // WHEN/THEN - Should not throw
      expect(() => fireLayeredCelebration(100, { combo: 100 })).not.toThrow();
      expect(() => fireLayeredCelebration(0, { combo: 0 })).not.toThrow();
    });
  });

  describe('reduced motion (B4)', () => {
    afterEach(() => {
      // Reset matchMedia between tests
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        configurable: true,
        value: vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
      });
    });

    it('fireConfetti returns null and does not initialize canvas when prefers-reduced-motion is set', async () => {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        configurable: true,
        value: vi.fn().mockImplementation((q: string) => ({
          matches: q.includes('reduce'),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        })),
      });

      const mod = await import('../confettiUtils');
      const result = mod.fireConfetti({ particleCount: 50 });
      expect(result).toBeNull();
    });

    it('fireConfetti fires no particles but emits a quiet-celebrate event in calm mode', async () => {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        configurable: true,
        value: vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
      });

      const mod = await import('../confettiUtils');
      const { QUIET_FEEDBACK_EVENT } = await import('../../lib/cosy/quietFeedback');
      mod.setCelebrationIntensity('calm');

      const handler = vi.fn();
      window.addEventListener(QUIET_FEEDBACK_EVENT, handler);
      const result = mod.fireConfetti({ particleCount: 50 });
      window.removeEventListener(QUIET_FEEDBACK_EVENT, handler);

      // No particles fired in calm...
      expect(result).toBeNull();
      // ...but the dignified quiet beat was dispatched instead of nothing.
      expect(handler).toHaveBeenCalledTimes(1);

      mod.setCelebrationIntensity('full'); // reset module state for other tests
    });

    it('fireLevelUpConfetti is a no-op under prefers-reduced-motion', async () => {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        configurable: true,
        value: vi.fn().mockImplementation((q: string) => ({
          matches: q.includes('reduce'),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        })),
      });

      const mod = await import('../confettiUtils');
      // Should not throw and return without scheduling timers visibly
      expect(() => mod.fireLevelUpConfetti()).not.toThrow();
    });
  });
});
