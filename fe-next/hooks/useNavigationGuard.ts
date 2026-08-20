'use client';

import { useEffect, useRef } from 'react';
import { registerNavigationGuard } from '@/lib/navigation/navigationGuardRegistry';

interface UseNavigationGuardOptions {
  /** Whether navigation should be guarded (typically when game is active) */
  enabled: boolean;
  /** Message to show in native browser dialog (for beforeunload) */
  message?: string;
  /** Callback when user attempts to navigate away - return true to allow, false to block */
  onNavigationAttempt?: () => boolean | void;
  /** Optional analytics callback fired whenever a back-button abandon attempt is intercepted. */
  onAbandonAttempt?: () => void;
  /**
   * Set true the instant the consumer starts an intentional client navigation
   * away (e.g. quit confirmed → `router.push('/daily')`). This disables the
   * guard AND tells its teardown NOT to pop the phantom history entry: a
   * `go(-1)` racing the in-flight push cancels it — on web the user is stuck in
   * the game, on native the WebView blanks to BLACK (the "exit mid-game → black
   * screen" report). Leave false/undefined when the guard disables while
   * STAYING on the page (game over → results); then the phantom is popped so the
   * back button behaves normally.
   */
  leaving?: boolean;
}

/**
 * Hook to prevent accidental navigation away from an active game.
 *
 * Handles:
 * - Tab close / page refresh (beforeunload event - shows native browser dialog)
 * - Browser back button (popstate event - triggers callback)
 *
 * @example
 * useNavigationGuard({
 *   enabled: gameActive,
 *   message: 'Are you sure you want to leave? You will lose your progress.',
 *   onNavigationAttempt: () => {
 *     setShowExitConfirm(true);
 *     return false; // Block navigation, let modal handle it
 *   }
 * });
 */
/**
 * Phantom pops this module has fired and not yet seen come back.
 *
 * The teardown below removes its own history entry with `history.go(-1)`, which
 * is ASYNCHRONOUS: the popstate can land after the next round's guard has
 * mounted, and that guard reads it as a back-button press. In Quick Play that
 * meant word hunt opened "Leave the Hunt?" the moment the board appeared, with
 * the grid unclickable behind it. Module scope, not per-hook: the guard that
 * fires the pop is usually already unmounted when it lands.
 */
let pendingPhantomPops = 0;
/** A pop that never arrives must not swallow a real back press later. */
const PHANTOM_POP_TTL_MS = 1000;

/**
 * Test seam. The counter is module state that outlives a single `renderHook`,
 * so a test whose guard unmounts leaves a claim behind that would swallow the
 * NEXT test's synthetic popstate. Production has no equivalent: there the pop
 * really does arrive (or the TTL drops it).
 */
export function resetPhantomPopStateForTests(): void {
  pendingPhantomPops = 0;
}

export function useNavigationGuard({
  enabled,
  message = 'Are you sure you want to leave? You will lose your progress in the current game.',
  onNavigationAttempt,
  leaving = false,
  onAbandonAttempt,
}: UseNavigationGuardOptions): void {
  // Track if we're handling a back navigation
  const isHandlingBackRef = useRef(false);
  // Mirror `leaving` in a ref, updated DURING RENDER (not in an effect). The
  // teardown below reads it during the SAME commit that disables the guard;
  // render strictly precedes that commit's cleanup, so a render-time write is
  // current when the cleanup runs — an effect-time write would land too late.
  const leavingRef = useRef(leaving);
  leavingRef.current = leaving;
  // Track the current history state to detect back navigation
  const historyPushedRef = useRef(false);
  // True once the page is actually unloading (hard nav / tab close). The
  // teardown go(-1) must NOT fire then — racing an in-flight navigation can
  // blank a Capacitor WebView (black screen on quit).
  const unloadingRef = useRef(false);
  // URL where the phantom entry was pushed. On teardown we only pop it (go(-1))
  // if we're STILL on that URL — i.e. the guard was disabled while staying
  // (game over → results). If we've navigated away (quit → router.push), the
  // URLs differ and popping would bounce the user back. Avoids that race.
  const phantomHrefRef = useRef('');
  // Store callbacks in refs to avoid effect re-runs when references change
  const onNavigationAttemptRef = useRef(onNavigationAttempt);
  const onAbandonAttemptRef = useRef(onAbandonAttempt);

  // Keep callback refs updated without triggering effects
  useEffect(() => {
    onNavigationAttemptRef.current = onNavigationAttempt;
    onAbandonAttemptRef.current = onAbandonAttempt;
  });

  // Advertise this guard to the Capacitor Android back handler while enabled.
  // On Android the hardware back never fires popstate, so without this signal
  // the "leave game?" confirm below is silently skipped (web/iOS get it). The
  // handler consults isNavigationGuardActive() and routes back through history
  // so our popstate handler fires. Registered on the `enabled` lifecycle (not
  // render) so StrictMode's double-invoke nets zero.
  useEffect(() => {
    if (!enabled) return;
    return registerNavigationGuard();
  }, [enabled]);

  // Handle beforeunload (tab close / refresh)
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Standard way to trigger browser's native "Leave site?" dialog
      e.preventDefault();
      // Some browsers require returnValue to be set
      e.returnValue = message;
      return message;
    };

    const handlePageHide = () => {
      unloadingRef.current = true;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [enabled, message]);

  // Handle browser back button via popstate
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    // Push a dummy state to history so we can intercept back button
    if (!historyPushedRef.current) {
      phantomHrefRef.current = window.location.href;
      window.history.pushState({ gameGuard: true }, '', window.location.href);
      historyPushedRef.current = true;
    }

    const handlePopState = () => {
      // Our own teardown's go(-1) coming home — not the user pressing back.
      if (pendingPhantomPops > 0) {
        pendingPhantomPops--;
        return;
      }
      // Prevent rapid-fire handling
      if (isHandlingBackRef.current) return;
      isHandlingBackRef.current = true;

      // Fire analytics callback — caller-supplied, never blocks UX
      try { onAbandonAttemptRef.current?.(); } catch { /* analytics never block UX */ }
      // Call the navigation attempt handler via ref (always gets latest)
      const shouldAllow = onNavigationAttemptRef.current?.();

      if (shouldAllow !== true) {
        // Block navigation - push state back to keep user on page
        window.history.pushState({ gameGuard: true }, '', window.location.href);
      }

      // Reset handling flag after a brief delay
      setTimeout(() => {
        isHandlingBackRef.current = false;
      }, 100);
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      const phantomHref = phantomHrefRef.current;
      const wasPushed = historyPushedRef.current;
      historyPushedRef.current = false;
      if (!wasPushed) return;
      // Skip the phantom pop when we're navigating AWAY. A go(-1) here races an
      // in-flight client navigation (quit → router.push, fired in the same
      // handler that flips `leaving`/disables the guard) OR a hard unload
      // (pagehide). The back-nav wins and cancels the forward nav: on web the
      // user is stuck in the game, on native the WebView fails to repaint and
      // blanks to BLACK (the "exit mid-daily-challenge → black screen" report).
      // `leaving` is the deterministic signal — unlike reading location.href,
      // which is still the game URL at cleanup time because router.push is async.
      if (leavingRef.current || unloadingRef.current) return;
      // Otherwise the guard disabled while STAYING (game over → results on the
      // same URL): pop the phantom so the back button behaves normally after.
      // Defensive: only pop if we're genuinely still on the phantom URL.
      if (typeof window !== 'undefined' && window.location.href === phantomHref) {
        pendingPhantomPops++;
        window.history.go(-1);
        // If the browser never delivers it (navigated away first), drop the
        // claim so a later real back press is still guarded.
        setTimeout(() => {
          if (pendingPhantomPops > 0) pendingPhantomPops--;
        }, PHANTOM_POP_TTL_MS);
      }
    };
  }, [enabled]); // Only re-run when enabled changes, not when callback changes
}

export default useNavigationGuard;
