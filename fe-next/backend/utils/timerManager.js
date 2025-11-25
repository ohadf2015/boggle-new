// Centralized timer management to prevent memory leaks

class TimerManager {
  constructor() {
    this.timers = new Map(); // key -> { type, id, ref }
  }

  /**
   * Create an interval timer
   * @param {string} key - Unique key for this timer
   * @param {Function} callback - Function to execute
   * @param {number} interval - Interval in milliseconds
   * @returns {string} - Timer key
   */
  setInterval(key, callback, interval) {
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
   * @param {string} key - Unique key for this timer
   * @param {Function} callback - Function to execute
   * @param {number} delay - Delay in milliseconds
   * @returns {string} - Timer key
   */
  setTimeout(key, callback, delay) {
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
   * @param {string} key - Timer key to clear
   * @returns {boolean} - True if timer was found and cleared
   */
  clearTimer(key) {
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
   * @param {string} prefix - Key prefix to match
   * @returns {number} - Number of timers cleared
   */
  clearTimersWithPrefix(prefix) {
    let count = 0;
    const keysToDelete = [];

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
   * @returns {number} - Number of timers cleared
   */
  clearAll() {
    let count = 0;
    for (const [key, timer] of this.timers.entries()) {
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
   * @param {string} key - Timer key
   * @returns {boolean}
   */
  hasTimer(key) {
    return this.timers.has(key);
  }

  /**
   * Get count of active timers
   * @returns {number}
   */
  getTimerCount() {
    return this.timers.size;
  }

  /**
   * Get all timer keys with a specific prefix
   * @param {string} prefix - Key prefix
   * @returns {string[]}
   */
  getTimerKeys(prefix = '') {
    if (!prefix) {
      return Array.from(this.timers.keys());
    }
    return Array.from(this.timers.keys()).filter(key => key.startsWith(prefix));
  }
}

// Singleton instance
const timerManager = new TimerManager();

// Convenience functions for game timers
const setGameTimer = (gameCode, intervalId) => {
  timerManager.timers.set(`game:${gameCode}`, {
    type: 'interval',
    id: intervalId,
    ref: intervalId
  });
};

const clearGameTimer = (gameCode) => {
  return timerManager.clearTimer(`game:${gameCode}`);
};

module.exports = timerManager;
module.exports.setGameTimer = setGameTimer;
module.exports.clearGameTimer = clearGameTimer;
