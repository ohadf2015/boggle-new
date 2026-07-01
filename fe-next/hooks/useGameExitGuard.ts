'use client';

/**
 * useGameExitGuard — one place to make "leave an active game?" behave the same
 * across game modes and across the three back mechanisms (in-app back button,
 * browser popstate, Capacitor Android hardware back).
 *
 * Before this, singleplayer/daily each inlined a useNavigationGuard + a
 * showQuitConfirm state, while Blast and Connections had NO guard at all — back
 * mid-game silently dropped the run/puzzle. This bundles the guard, the confirm
 * flag and a `requestExit` for the in-app back button so a mode just supplies
 * "is a losable game active?" and "how to actually leave".
 *
 *   const active = phase === 'playing' && score > 0;
 *   const { showConfirm, setShowConfirm, requestExit, confirmQuit } =
 *     useGameExitGuard({ active, onQuit: handleQuit, message: t(...) });
 *   // wire the in-app back button to requestExit, render a ConfirmationDialog
 *   // bound to showConfirm/setShowConfirm/confirmQuit.
 */

import { useCallback, useState } from 'react';
import { useNavigationGuard } from './useNavigationGuard';

interface UseGameExitGuardOptions {
  /** True while a game is in progress AND leaving would lose real progress. */
  active: boolean;
  /** Perform the actual navigation away (e.g. router.push(home)). */
  onQuit: () => void;
  /** Message for the native beforeunload dialog (tab close / refresh). */
  message?: string;
}

interface UseGameExitGuardResult {
  showConfirm: boolean;
  setShowConfirm: (open: boolean) => void;
  /** Wire the in-app back button here: confirms when active, else quits. */
  requestExit: () => void;
  /** Wire the confirm dialog's confirm action here. */
  confirmQuit: () => void;
  quitting: boolean;
}

export function useGameExitGuard({
  active,
  onQuit,
  message,
}: UseGameExitGuardOptions): UseGameExitGuardResult {
  const [showConfirm, setShowConfirm] = useState(false);
  // Once true, the guard disables AND its teardown skips the phantom-history
  // pop — a go(-1) racing the in-flight router.push blanks a Capacitor WebView.
  const [quitting, setQuitting] = useState(false);

  useNavigationGuard({
    enabled: active && !quitting,
    leaving: quitting,
    message,
    onNavigationAttempt: () => {
      setShowConfirm(true);
      return false; // block the back nav; the dialog drives the real exit
    },
  });

  const confirmQuit = useCallback(() => {
    setShowConfirm(false);
    setQuitting(true);
    onQuit();
  }, [onQuit]);

  const requestExit = useCallback(() => {
    if (active) {
      setShowConfirm(true);
    } else {
      onQuit();
    }
  }, [active, onQuit]);

  return { showConfirm, setShowConfirm, requestExit, confirmQuit, quitting };
}

export default useGameExitGuard;
