/**
 * navigationGuardRegistry — a process-wide count of active navigation guards.
 *
 * Why: `useNavigationGuard` intercepts the browser BACK button via `popstate`
 * to show a "leave game?" confirm. On Capacitor Android the hardware back
 * button never fires `popstate` — `useAndroidBackButton` handles it directly and
 * (on root routes) does double-tap-to-exit. That means the confirm dialog which
 * web/iOS users see was silently SKIPPED on Android for exactly the modes that
 * have it (singleplayer, daily, multiplayer).
 *
 * This registry lets the Android handler ask "is a game guard active right now?"
 * and, if so, route the back press through the browser history so the guard's
 * popstate handler fires — restoring parity across platforms.
 */

let activeGuardCount = 0;

/** Register an active guard. Returns an idempotent unregister callback. */
export function registerNavigationGuard(): () => void {
  activeGuardCount += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    activeGuardCount = Math.max(0, activeGuardCount - 1);
  };
}

/** True when at least one navigation guard is currently intercepting back. */
export function isNavigationGuardActive(): boolean {
  return activeGuardCount > 0;
}

/** Test-only: reset the counter between cases. */
export function __resetNavigationGuardsForTest(): void {
  activeGuardCount = 0;
}
