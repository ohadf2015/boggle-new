/**
 * Entry Timing Tests (DEBT-01)
 *
 * Documents and validates the optimized entry sequence timing.
 * Target: Reduce total entry time from 2.38s to 2.0s.
 *
 * Entry sequence phases:
 * 1. Cascade: Tiles fall in diagonal wave pattern
 * 2. Objectives: Slide in from right/left
 * 3. Title: Level number burst animation
 * 4. Playing: Game starts
 */

import { OPTIMIZED_TIMING } from '@/lib/adventure/entryTiming';

describe('Entry Sequence Timing (DEBT-01)', () => {
  describe('tile cascade animation', () => {
    it('should use 25ms diagonal stagger (optimized from 30ms)', () => {
      expect(OPTIMIZED_TIMING.cascade.diagonalStaggerMs).toBe(25);
    });

    it('should use optimized spring config for faster settle', () => {
      expect(OPTIMIZED_TIMING.cascade.spring.stiffness).toBe(500);
      expect(OPTIMIZED_TIMING.cascade.spring.damping).toBe(28);
      expect(OPTIMIZED_TIMING.cascade.spring.mass).toBe(0.6);
    });

    it('should calculate cascade duration for 4x4 grid under 450ms', () => {
      const gridSize = 4;
      const maxDiagonal = (gridSize - 1) * 2; // = 6
      const staggerMs = OPTIMIZED_TIMING.cascade.diagonalStaggerMs;
      const springSettleMs = OPTIMIZED_TIMING.cascade.springSettleMs;
      const totalMs = maxDiagonal * staggerMs + springSettleMs;

      // 6 * 25 + 300 = 450ms (down from 6 * 30 + 400 = 580ms)
      expect(totalMs).toBeLessThanOrEqual(450);
    });

    it('should calculate cascade duration for 5x5 grid under 500ms', () => {
      const gridSize = 5;
      const maxDiagonal = (gridSize - 1) * 2; // = 8
      const staggerMs = OPTIMIZED_TIMING.cascade.diagonalStaggerMs;
      const springSettleMs = OPTIMIZED_TIMING.cascade.springSettleMs;
      const totalMs = maxDiagonal * staggerMs + springSettleMs;

      // 8 * 25 + 300 = 500ms (down from 8 * 30 + 400 = 640ms)
      expect(totalMs).toBeLessThanOrEqual(500);
    });
  });

  describe('objectives slide-in animation', () => {
    it('should use 80ms stagger between objectives (optimized from 100ms)', () => {
      expect(OPTIMIZED_TIMING.objectives.staggerMs).toBe(80);
    });

    it('should use 250ms spring duration (optimized from 300ms)', () => {
      expect(OPTIMIZED_TIMING.objectives.durationMs).toBe(250);
    });

    it('should use optimized spring config for snappier feel', () => {
      expect(OPTIMIZED_TIMING.objectives.spring.stiffness).toBe(500);
      expect(OPTIMIZED_TIMING.objectives.spring.damping).toBe(35);
    });

    it('should calculate objectives time for 2 objectives under 410ms', () => {
      const objectiveCount = 2;
      const totalMs =
        objectiveCount * OPTIMIZED_TIMING.objectives.staggerMs +
        OPTIMIZED_TIMING.objectives.durationMs;

      // 2 * 80 + 250 = 410ms (down from 2 * 100 + 300 = 500ms)
      expect(totalMs).toBeLessThanOrEqual(410);
    });
  });

  describe('level title animation', () => {
    it('should use 350ms burst duration (optimized from 400ms)', () => {
      expect(OPTIMIZED_TIMING.title.burstMs).toBe(350);
    });

    it('should use 400ms hold duration (optimized from 600ms)', () => {
      expect(OPTIMIZED_TIMING.title.holdMs).toBe(400);
    });

    it('should use 250ms fade duration (optimized from 300ms)', () => {
      expect(OPTIMIZED_TIMING.title.fadeMs).toBe(250);
    });

    it('should calculate total title time as 1000ms (optimized from 1300ms)', () => {
      const totalMs =
        OPTIMIZED_TIMING.title.burstMs +
        OPTIMIZED_TIMING.title.holdMs +
        OPTIMIZED_TIMING.title.fadeMs;

      // 350 + 400 + 250 = 1000ms (down from 400 + 600 + 300 = 1300ms)
      expect(totalMs).toBe(1000);
    });
  });

  describe('parallel animations', () => {
    it('should run HUD fade-in with no initial delay', () => {
      expect(OPTIMIZED_TIMING.parallel.hudDelayMs).toBe(0);
    });

    it('should run background fade-in immediately', () => {
      expect(OPTIMIZED_TIMING.parallel.backgroundDelayMs).toBe(0);
    });

    it('should pre-initialize particles during cascade', () => {
      expect(OPTIMIZED_TIMING.parallel.particlePreInitialize).toBe(true);
    });
  });

  describe('total entry sequence', () => {
    it('should complete within 2.0s target (4x4 grid, 2 objectives)', () => {
      // Phases run sequentially: cascade -> objectives -> title
      const gridSize = 4;
      const objectiveCount = 2;

      // Cascade: 6 * 25 + 300 = 450ms
      const maxDiagonal = (gridSize - 1) * 2;
      const cascadeMs =
        maxDiagonal * OPTIMIZED_TIMING.cascade.diagonalStaggerMs +
        OPTIMIZED_TIMING.cascade.springSettleMs;

      // Objectives: 2 * 80 + 250 = 410ms
      const objectivesMs =
        objectiveCount * OPTIMIZED_TIMING.objectives.staggerMs +
        OPTIMIZED_TIMING.objectives.durationMs;

      // Title: 350 + 400 + 250 = 1000ms
      const titleMs =
        OPTIMIZED_TIMING.title.burstMs +
        OPTIMIZED_TIMING.title.holdMs +
        OPTIMIZED_TIMING.title.fadeMs;

      // Total: 450 + 410 + 1000 = 1860ms
      // Note: With phase overlap optimization (not implemented yet), this could be even faster
      const totalMs = cascadeMs + objectivesMs + titleMs;

      expect(totalMs).toBeLessThanOrEqual(2000);
    });

    it('should maintain acceptable timing for 5x5 grid', () => {
      const gridSize = 5;
      const objectiveCount = 3; // Harder levels may have more objectives

      const maxDiagonal = (gridSize - 1) * 2;
      const cascadeMs =
        maxDiagonal * OPTIMIZED_TIMING.cascade.diagonalStaggerMs +
        OPTIMIZED_TIMING.cascade.springSettleMs;

      const objectivesMs =
        objectiveCount * OPTIMIZED_TIMING.objectives.staggerMs +
        OPTIMIZED_TIMING.objectives.durationMs;

      const titleMs =
        OPTIMIZED_TIMING.title.burstMs +
        OPTIMIZED_TIMING.title.holdMs +
        OPTIMIZED_TIMING.title.fadeMs;

      // 5x5 with 3 objectives: 500 + 490 + 1000 = 1990ms
      const totalMs = cascadeMs + objectivesMs + titleMs;

      expect(totalMs).toBeLessThanOrEqual(2100);
    });
  });

  describe('timing constants documentation', () => {
    it('should export timing constants for use in components', () => {
      // Ensure all expected keys exist
      expect(OPTIMIZED_TIMING.cascade).toBeDefined();
      expect(OPTIMIZED_TIMING.objectives).toBeDefined();
      expect(OPTIMIZED_TIMING.title).toBeDefined();
      expect(OPTIMIZED_TIMING.parallel).toBeDefined();
    });

    it('should provide helper function to calculate cascade delay', () => {
      expect(typeof OPTIMIZED_TIMING.getCascadeDelay).toBe('function');

      // Test the helper
      const delay = OPTIMIZED_TIMING.getCascadeDelay(1, 2); // row 1, col 2
      expect(delay).toBe((1 + 2) * OPTIMIZED_TIMING.cascade.diagonalStaggerMs); // 75ms
    });

    it('should provide helper function to calculate total cascade duration', () => {
      expect(typeof OPTIMIZED_TIMING.getCascadeDuration).toBe('function');

      // Test for 4x4 grid
      const duration = OPTIMIZED_TIMING.getCascadeDuration(4);
      expect(duration).toBe(450); // 6 * 25 + 300
    });

    it('should provide helper function to calculate objectives duration', () => {
      expect(typeof OPTIMIZED_TIMING.getObjectivesDuration).toBe('function');

      // Test for 2 objectives
      const duration = OPTIMIZED_TIMING.getObjectivesDuration(2);
      expect(duration).toBe(410); // 2 * 80 + 250
    });
  });
});
