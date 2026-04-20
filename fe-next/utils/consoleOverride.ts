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
  /Game not found/i,
  // Expected game behavior — Word Hunt elimination, host kicking, game lifecycle
  /You have been eliminated/i,
  /You have been kicked from this room/i,
  /Game is not in progress/i,
  // Speech synthesis - non-critical TTS feature failure on some devices (JAVASCRIPT-NEXTJS-G2)
  /Speech synthesis error/i,
  // Share API failures - expected when Web Share API unavailable (JAVASCRIPT-NEXTJS-1Y)
  /Share failed/i,
  // Virtuoso scroll warnings - benign virtual list behavior (JAVASCRIPT-NEXTJS-3A, 3B)
  /Failed to scroll to index/i,
  /smooth.*scroll behavior.*not fully supported/i,
  // LogRocket duplicate init - benign race condition (JAVASCRIPT-NEXTJS-1X)
  /LogRocket has already been loaded/i,
  // Gifts network errors - transient errors with automatic retry (JAVASCRIPT-NEXTJS-8A, JAVASCRIPT-NEXTJS-74)
  /\[Gifts\].*Network error.*will retry/i,
  // Realtime leaderboard connection retries - transient, auto-recovers (JAVASCRIPT-NEXTJS-31)
  /\[Realtime\].*Leaderboard connection failed.*retrying/i,
  // Socket not connected on join - transient state during page load (JAVASCRIPT-NEXTJS-35)
  /\[JOIN\].*Cannot join.*socket not connected/i,
  // Supabase auth lock timeout - React Strict Mode race condition (JAVASCRIPT-NEXTJS-Q1)
  /Lock.*was not released within.*Forcefully acquiring/i,
  // Clipboard copy failures - browser permission issue, not a bug (JAVASCRIPT-NEXTJS-NJ)
  /Clipboard copy failed/i,
  // PWA service worker registration - expected failure on some browsers (JAVASCRIPT-NEXTJS-32)
  /\[PWA\].*Service worker registration failed/i,
  // Duplicate completeLevel - defensive guard, not a bug (JAVASCRIPT-NEXTJS-PN)
  /\[ProgressionContext\].*Skipping duplicate completeLevel/i,
  // Notification channel subscription - transient Supabase realtime error (JAVASCRIPT-NEXTJS-FB)
  /Error subscribing to notifications channel/i,
  // SPAM warnings - expected rate limiting behavior (JAVASCRIPT-NEXTJS-HN)
  /\[SPAM\].*Warning received/i,
  // Word submission rejected during game state transitions (JAVASCRIPT-NEXTJS-HE)
  /\[WORD\].*Word submission rejected.*game state/i,
  // Game state mismatch - auto-recovers by querying server (JAVASCRIPT-NEXTJS-HH)
  /\[SOCKET\.IO\].*Game state mismatch/i,
  // HintGenerator timeout - transient, graceful fallback exists (JAVASCRIPT-NEXTJS-K6)
  /\[HintGenerator\].*Request timed out/i,
  // Adventure state 404 - transient cold start, uses initial state fallback (JAVASCRIPT-NEXTJS-W9)
  /\[ProgressionContext\].*\/api\/adventure\/state returned 404/i,
  // Matter.js delta warning — physics engine perf hint, not a bug (JAVASCRIPT-NEXTJS-Y1)
  /Matter\.Engine\.update.*delta argument/i,
  // CrazyGames SDK errors — expected when not running on CrazyGames platform (JAVASCRIPT-NEXTJS-XV)
  /CrazySDK is not initialized/i,
  /Failed to check adblock/i,
  /Error checking CrazyGames user/i,
  /Failed to load CrazyGames friends/i,
  // Supabase auth lock contention — concurrent requests steal navigator lock (JAVASCRIPT-NEXTJS-10W, 10Q, XR)
  /Lock.*released because another request stole it/i,
  /Lock broken by another request/i,
  // Cross-tab session refresh error — downstream of lock contention (JAVASCRIPT-NEXTJS-11A)
  /Error handling cross-tab session refresh/i,
  // HTML5 SDK requestInProgress — third-party SDK noise (JAVASCRIPT-NEXTJS-117)
  /requestInProgress/i,
  // shadowroot/route-announcer — browser extension noise (JAVASCRIPT-NEXTJS-116)
  /shadowroot.*NEXT-ROUTE-ANNOUNCER/i,
] as const;

// Store original console methods
const originalConsole = {
  error: console.error,
  warn: console.warn,
  debug: console.debug,
};

/**
 * Noisy debug-level logs emitted by Capacitor's native-bridge.js
 * (unconditional `console.debug('Removing listener', plugin, event)` on every
 * listener cleanup). These are not actionable — suppress in all environments.
 */
const IGNORED_DEBUG_PATTERNS = [
  /^Removing listener$/,
] as const;

/**
 * Filter Capacitor bridge debug noise ("Removing listener ...") from the
 * browser console on every platform. Safe to run once at startup.
 */
export function initCapacitorLogFilter(): void {
  if (typeof window === 'undefined') return;
  const original = originalConsole.debug.bind(console);
  console.debug = (...args: unknown[]): void => {
    const first = typeof args[0] === 'string' ? args[0] : '';
    if (IGNORED_DEBUG_PATTERNS.some((p) => p.test(first))) return;
    original(...args);
  };
}

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
    // Check if this warning should be ignored (same as console.error)
    // Fixes JAVASCRIPT-NEXTJS-1V (Recharts dimension warnings during mobile layout)
    const message = args.map(arg =>
      typeof arg === 'string' ? arg : String(arg)
    ).join(' ');

    const shouldIgnore = IGNORED_ERROR_PATTERNS.some(pattern => pattern.test(message));
    if (shouldIgnore) {
      // Silently ignore non-critical warnings
      return;
    }

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
