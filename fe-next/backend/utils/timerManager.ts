// Centralized timer management to prevent memory leaks

// ==========================================
// Type Definitions
// ==========================================

type TimerType = 'interval' | 'timeout';

interface TimerEntry {
  type: TimerType;
  id: ReturnType<typeof setTimeout> | ReturnType<typeof setInterval>;
  ref: ReturnType<typeof setTimeout> | ReturnType<typeof setInterval>;
}

// ==========================================
// Timer Manager Class
// ==========================================

class TimerManager {
  private timers: Map<string, TimerEntry>;

  constructor() {
    this.timers = new Map();
  }

  /**
   * Create an interval timer
   */
  setInterval(key: string, callback: () => void, interval: number): string {
    this.clearTimer(key); // Clear existing timer if any

    const id = setInterval(callback, interval);
    this.timers.set(key, {
      type: 'interval',
      id,
      ref: id
    });

    return key;
  }

  /**
   * Create a timeout timer
   */
  setTimeout(key: string, callback: () => void, delay: number): string {
    this.clearTimer(key); // Clear existing timer if any

    const id = setTimeout(callback, delay);
    this.timers.set(key, {
      type: 'timeout',
      id,
      ref: id
    });

    return key;
  }

  /**
   * Clear a specific timer
   */
  clearTimer(key: string): boolean {
    const timer = this.timers.get(key);
    if (!timer) return false;

    if (timer.type === 'interval') {
      clearInterval(timer.ref);
    } else {
      clearTimeout(timer.ref);
    }

    this.timers.delete(key);
    return true;
  }

  /**
   * Clear all timers matching a prefix
   */
  clearTimersWithPrefix(prefix: string): number {
    let count = 0;
    const keysToDelete: string[] = [];

    for (const [key, timer] of this.timers.entries()) {
      if (key.startsWith(prefix)) {
        if (timer.type === 'interval') {
          clearInterval(timer.ref);
        } else {
          clearTimeout(timer.ref);
        }
        keysToDelete.push(key);
        count++;
      }
    }

    keysToDelete.forEach(key => this.timers.delete(key));
    return count;
  }

  /**
   * Clear all timers
   */
  clearAll(): number {
    let count = 0;
    for (const [_key, timer] of this.timers.entries()) {
      if (timer.type === 'interval') {
        clearInterval(timer.ref);
      } else {
        clearTimeout(timer.ref);
      }
      count++;
    }
    this.timers.clear();
    return count;
  }

  /**
   * Check if a timer exists
   */
  hasTimer(key: string): boolean {
    return this.timers.has(key);
  }

  /**
   * Get count of active timers
   */
  getTimerCount(): number {
    return this.timers.size;
  }

  /**
   * Get all timer keys with a specific prefix
   */
  getTimerKeys(prefix: string = ''): string[] {
    if (!prefix) {
      return Array.from(this.timers.keys());
    }
    return Array.from(this.timers.keys()).filter(key => key.startsWith(prefix));
  }

  /**
   * Direct access to timers map for legacy compatibility
   * @deprecated Use class methods instead
   */
  get _timers(): Map<string, TimerEntry> {
    return this.timers;
  }
}

// Singleton instance
const timerManager = new TimerManager();

// Convenience functions for game timers
export const setGameTimer = (gameCode: string, intervalId: ReturnType<typeof setInterval>): void => {
  timerManager._timers.set(`game:${gameCode}`, {
    type: 'interval',
    id: intervalId,
    ref: intervalId
  });
};

export const clearGameTimer = (gameCode: string): boolean => {
  return timerManager.clearTimer(`game:${gameCode}`);
};

export default timerManager;
export { TimerManager };
export type { TimerType, TimerEntry };
