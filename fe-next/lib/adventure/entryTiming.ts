/**
 * Entry Timing Constants (DEBT-01)
 *
 * Optimized timing constants for the level entry sequence.
 * Target: Reduce total entry time from 2.38s to 2.0s.
 *
 * Optimizations:
 * - Reduced cascade stagger: 30ms -> 25ms
 * - Increased spring stiffness/damping for faster settle
 * - Reduced objectives stagger: 100ms -> 80ms
 * - Reduced title hold time: 600ms -> 400ms
 * - Parallel HUD/background initialization
 */

export const OPTIMIZED_TIMING = {
  /**
   * Cascade animation (tiles falling in diagonal wave)
   * Optimized: 580ms -> 450ms for 4x4 grid
   */
  cascade: {
    /** Delay between each diagonal wave (ms) */
    diagonalStaggerMs: 25, // was 30
    /** Time for spring animation to settle (ms) */
    springSettleMs: 300, // was 400
    /** Spring physics configuration */
    spring: {
      stiffness: 500, // was 400 - higher = snappier
      damping: 28, // was 25 - higher = faster settle
      mass: 0.6, // was 0.8 - lower = faster response
    },
  },

  /**
   * Objectives slide-in animation
   * Optimized: 500ms -> 410ms for 2 objectives
   */
  objectives: {
    /** Stagger delay between each objective (ms) */
    staggerMs: 80, // was 100
    /** Total animation duration per objective (ms) */
    durationMs: 250, // was 300
    /** Spring physics configuration */
    spring: {
      stiffness: 500, // was 400
      damping: 35, // was 30
    },
  },

  /**
   * Level title burst animation
   * Optimized: 1300ms -> 1000ms
   */
  title: {
    /** Initial burst/scale animation (ms) */
    burstMs: 350, // was 400
    /** Hold at full scale before fade (ms) */
    holdMs: 400, // was 600
    /** Fade out duration (ms) */
    fadeMs: 250, // was 300
  },

  /**
   * Parallel animations (run concurrently, no waiting)
   */
  parallel: {
    /** HUD container fade-in delay (ms) */
    hudDelayMs: 0, // no delay, parallel with tiles
    /** Background fade-in delay (ms) */
    backgroundDelayMs: 0, // immediate
    /** Whether to pre-initialize particle system */
    particlePreInitialize: true,
    /** Parallax layer stagger (ms) */
    parallaxLayerStaggerMs: 50, // was 100
  },

  /**
   * Calculate cascade delay for a specific tile position
   * @param row - Tile row index
   * @param col - Tile column index
   * @returns Delay in milliseconds
   */
  getCascadeDelay(row: number, col: number): number {
    const diagonalIndex = row + col;
    return diagonalIndex * this.cascade.diagonalStaggerMs;
  },

  /**
   * Calculate total cascade duration for a grid
   * @param gridSize - Grid dimension (4 for 4x4, 5 for 5x5)
   * @returns Total duration in milliseconds
   */
  getCascadeDuration(gridSize: number): number {
    const maxDiagonal = (gridSize - 1) * 2;
    return maxDiagonal * this.cascade.diagonalStaggerMs + this.cascade.springSettleMs;
  },

  /**
   * Calculate total objectives animation duration
   * @param objectiveCount - Number of objectives
   * @returns Total duration in milliseconds
   */
  getObjectivesDuration(objectiveCount: number): number {
    return objectiveCount * this.objectives.staggerMs + this.objectives.durationMs;
  },

  /**
   * Calculate total title animation duration
   * @returns Total duration in milliseconds
   */
  getTitleDuration(): number {
    return this.title.burstMs + this.title.holdMs + this.title.fadeMs;
  },

  /**
   * Calculate total entry sequence duration
   * @param gridSize - Grid dimension
   * @param objectiveCount - Number of objectives
   * @returns Total duration in milliseconds
   */
  getTotalEntryDuration(gridSize: number, objectiveCount: number): number {
    return (
      this.getCascadeDuration(gridSize) +
      this.getObjectivesDuration(objectiveCount) +
      this.getTitleDuration()
    );
  },
} as const;

// Export individual timing constants for direct import
export const CASCADE_STAGGER_MS = OPTIMIZED_TIMING.cascade.diagonalStaggerMs;
export const CASCADE_SETTLE_MS = OPTIMIZED_TIMING.cascade.springSettleMs;
export const CASCADE_SPRING = OPTIMIZED_TIMING.cascade.spring;

export const OBJECTIVES_STAGGER_MS = OPTIMIZED_TIMING.objectives.staggerMs;
export const OBJECTIVES_DURATION_MS = OPTIMIZED_TIMING.objectives.durationMs;
export const OBJECTIVES_SPRING = OPTIMIZED_TIMING.objectives.spring;

export const TITLE_BURST_MS = OPTIMIZED_TIMING.title.burstMs;
export const TITLE_HOLD_MS = OPTIMIZED_TIMING.title.holdMs;
export const TITLE_FADE_MS = OPTIMIZED_TIMING.title.fadeMs;
export const TITLE_TOTAL_MS = TITLE_BURST_MS + TITLE_HOLD_MS + TITLE_FADE_MS;
