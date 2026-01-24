/**
 * Console Override Utility
 *
 * In production, this overrides console.error and console.warn to:
 * 1. Send errors/warnings to Sentry for monitoring
 * 2. Prevent them from appearing in the browser console
 *
 * This catches ALL console.error/warn calls throughout the app,
 * even those not using the logger utility.
 */

import * as Sentry from "@sentry/nextjs";

const isProduction = typeof window !== 'undefined' && process.env.NODE_ENV === 'production';

/**
 * Patterns for non-critical errors that should be silently ignored
 * These are expected on some devices/browsers and don't indicate bugs
 */
const IGNORED_ERROR_PATTERNS = [
  // Audio decoding failures - common on mobile devices, non-critical feature
  /Decoding audio data failed/i,
  /Failed to load.*Track/i,
  /\[AdventureMusic\].*Failed to load/i,
  /\[AdventureMusic\].*Failed to play/i,
  // React hydration warnings - handled by React itself
  /Hydration failed/i,
  /Text content does not match/i,
  // Browser extension interference
  /ResizeObserver loop/i,
  // Recharts dimension warnings - occur briefly during mobile layout, non-critical
  /width\(-?\d+\) and height\(-?\d+\) of chart should be greater than 0/i,
  // Socket.IO user-facing errors - handled gracefully with toast messages
  /Game code already in use/i,
  /already in use/i,
] as const;

// Store original console methods
const originalConsole = {
  error: console.error,
  warn: console.warn,
};

/**
 * Initialize console overrides in production
 * Call this early in app initialization (e.g., in _app.tsx or layout.tsx)
 */
export function initConsoleOverride(): void {
  // Only override in production browser environment
  if (!isProduction || typeof window === 'undefined') {
    return;
  }

  // Override console.error
  console.error = (...args: unknown[]): void => {
    // Check if this error should be ignored
    const message = args.map(arg =>
      typeof arg === 'string' ? arg : String(arg)
    ).join(' ');

    const shouldIgnore = IGNORED_ERROR_PATTERNS.some(pattern => pattern.test(message));
    if (shouldIgnore) {
      // Silently ignore non-critical errors
      return;
    }

    const firstArg = args[0];

    if (firstArg instanceof Error) {
      // If it's an Error object, capture it properly
      Sentry.captureException(firstArg, {
        contexts: {
          console_error: {
            additional_args: args.slice(1).map(arg => String(arg)),
            source: 'console.error'
          }
        }
      });
    } else {
      // Otherwise, capture as a message
      const message = args.map(arg =>
        typeof arg === 'string' ? arg : JSON.stringify(arg)
      ).join(' ');

      Sentry.captureMessage(message, {
        level: 'error',
        contexts: {
          console_error: {
            args: args.map(arg => String(arg)),
            source: 'console.error'
          }
        }
      });
    }

    // In production, we DON'T call the original console.error
    // This prevents the error from appearing in the browser console
  };

  // Override console.warn
  console.warn = (...args: unknown[]): void => {
    const message = args.map(arg =>
      typeof arg === 'string' ? arg : JSON.stringify(arg)
    ).join(' ');

    Sentry.captureMessage(message, {
      level: 'warning',
      contexts: {
        console_warn: {
          args: args.map(arg => String(arg)),
          source: 'console.warn'
        }
      }
    });

    // In production, we DON'T call the original console.warn
    // This prevents the warning from appearing in the browser console
  };
}

/**
 * Restore original console methods
 * Useful for testing or debugging
 */
export function restoreConsole(): void {
  console.error = originalConsole.error;
  console.warn = originalConsole.warn;
}

/**
 * Get the original console methods
 * Useful if you need to log something that shouldn't go to Sentry
 */
export function getOriginalConsole() {
  return originalConsole;
}
