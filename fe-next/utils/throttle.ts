/**
 * Throttle Utility
 * Performance-optimized throttling for event handlers
 */

/**
 * Creates a throttled function that only invokes `fn` at most once per `wait` milliseconds.
 * Uses requestAnimationFrame for smoother execution on 60fps displays.
 *
 * @param fn - The function to throttle
 * @param wait - The number of milliseconds to wait between invocations (default: 100ms)
 * @returns A throttled version of the function
 *
 * @example
 * const handleResize = throttle(() => {
 *   console.log('Resized!');
 * }, 100);
 *
 * window.addEventListener('resize', handleResize);
 */
export function throttle<T extends (...args: unknown[]) => void>(
  fn: T,
  wait: number = 100
): T & { cancel: () => void } {
  let lastCall = 0;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let rafId: number | null = null;

  const throttled = function (this: unknown, ...args: Parameters<T>) {
    const now = performance.now();
    const remaining = wait - (now - lastCall);

    if (remaining <= 0) {
      // Enough time has passed, execute immediately
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      lastCall = now;
      fn.apply(this, args);
    } else if (!timeoutId) {
      // Schedule for later using RAF for smoother execution
      timeoutId = setTimeout(() => {
        rafId = requestAnimationFrame(() => {
          lastCall = performance.now();
          timeoutId = null;
          rafId = null;
          fn.apply(this, args);
        });
      }, remaining);
    }
  } as T & { cancel: () => void };

  throttled.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    lastCall = 0;
  };

  return throttled;
}

/**
 * Creates a debounced function that delays invoking `fn` until after `wait` milliseconds
 * have elapsed since the last time the debounced function was invoked.
 *
 * @param fn - The function to debounce
 * @param wait - The number of milliseconds to delay (default: 100ms)
 * @returns A debounced version of the function
 *
 * @example
 * const handleSearch = debounce((query: string) => {
 *   searchAPI(query);
 * }, 300);
 *
 * input.addEventListener('input', (e) => handleSearch(e.target.value));
 */
export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  wait: number = 100
): T & { cancel: () => void; flush: () => void } {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;
  let lastThis: unknown = null;

  const debounced = function (this: unknown, ...args: Parameters<T>) {
    lastArgs = args;
    lastThis = this;

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      timeoutId = null;
      fn.apply(lastThis, lastArgs!);
    }, wait);
  } as T & { cancel: () => void; flush: () => void };

  debounced.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    lastArgs = null;
    lastThis = null;
  };

  debounced.flush = () => {
    if (timeoutId && lastArgs) {
      clearTimeout(timeoutId);
      timeoutId = null;
      fn.apply(lastThis, lastArgs);
    }
  };

  return debounced;
}

export default throttle;
