/**
 * Velocity Tracker
 * Tracks touch/mouse movement velocity for swipe detection.
 * Extracted from useGridInteraction to simplify state management.
 */

// Number of position samples to average for velocity calculation
const VELOCITY_SAMPLES = 3;

interface TouchPoint {
  x: number;
  y: number;
  time: number;
}

/**
 * Creates a velocity tracker instance for tracking swipe speed.
 * Use this to create a mutable tracker object that persists across renders.
 */
export function createVelocityTracker() {
  const history: TouchPoint[] = [];
  let currentVelocity = 0;

  return {
    /**
     * Record a new touch position
     */
    recordPosition(x: number, y: number): void {
      history.push({ x, y, time: Date.now() });

      // Keep only recent samples
      if (history.length > VELOCITY_SAMPLES * 2) {
        history.splice(0, history.length - VELOCITY_SAMPLES);
      }

      // Update velocity
      currentVelocity = this.calculate();
    },

    /**
     * Calculate velocity from recent touch history.
     * Returns normalized value 0-1 where 0.5+ is fast.
     */
    calculate(): number {
      if (history.length < 2) return 0;

      const recent = history.slice(-VELOCITY_SAMPLES);
      if (recent.length < 2) return 0;

      const first = recent[0];
      const last = recent[recent.length - 1];
      const timeDiff = last.time - first.time;

      if (timeDiff === 0) return 0;

      const distance = Math.sqrt(
        Math.pow(last.x - first.x, 2) + Math.pow(last.y - first.y, 2)
      );

      // Pixels per millisecond, normalized to 0-1 scale
      return Math.min(1, distance / timeDiff / 2);
    },

    /**
     * Get current velocity without recalculating
     */
    getVelocity(): number {
      return currentVelocity;
    },

    /**
     * Reset tracker state
     */
    reset(): void {
      history.length = 0;
      currentVelocity = 0;
    },

    /**
     * Initialize with a starting position
     */
    start(x: number, y: number): void {
      this.reset();
      this.recordPosition(x, y);
    },
  };
}

export type VelocityTracker = ReturnType<typeof createVelocityTracker>;
