/**
 * One ref-counted claim on "hide the global bottom nav", shared by every
 * miss-gap surface that needs it.
 *
 * `NavigationContext.setIsInGame` is a plain `useState<boolean>` with no ref
 * count, and the student homework route has TWO writers of it: the route's
 * `MissGapShellLock chromeFree` (held for the whole visit) and `MissGapGame`
 * (held only while the student is playing). An unconditional
 * `setIsInGame(false)` in the game's cleanup therefore un-hid the nav the
 * moment the student tapped X — while the route lock was still mounted and
 * still believed it held the nav down.
 *
 * That is not cosmetic. `html.has-global-bottom-nav body` carries
 * `padding-bottom: var(--bottom-stack-height)`, so the nav returning brings
 * back the body HEIGHT that made the pre-start screen overflow 844 by 59px —
 * the measurement the critic disqualified the round on. Closing the game
 * dropped the student straight back onto the screen that scrolls.
 *
 * Two owners of one value where the last writer wins is pitfalls Class 1; two
 * paths to the same state that do not behave identically is Class 3. The fix
 * for both is the same shape the education shell lock already uses: a module
 * level count, `true` written when it goes 0→1 and `false` only when it
 * returns to 0. Nested claims nest; an over-release (StrictMode's double
 * invoke, an overlapping route transition) clamps at zero instead of going
 * negative and desyncing the next real claim.
 *
 * Module-level state is correct here rather than a context: the setter itself
 * is app-global, these surfaces never render twice in one tree, and a cold
 * share link may mount no NavigationProvider at all — in which case
 * `useHideNavigation` is a no-op and the count is simply harmless bookkeeping.
 */
'use client';

import { useEffect } from 'react';
import { useHideNavigation } from '@/contexts/NavigationContext';

let count = 0;

type NavSetter = (value: boolean) => void;

/**
 * Claim the lock. Returns the matching release.
 *
 * `setIsInGame` is passed in rather than read here so the module stays free of
 * React context and remains callable from a test or an imperative path.
 */
export function acquireMissGapNavLock(setIsInGame: NavSetter): () => void {
  count += 1;
  if (count === 1) setIsInGame(true);
  let released = false;
  return () => {
    if (released) return;
    released = true;
    count = Math.max(0, count - 1);
    if (count === 0) setIsInGame(false);
  };
}

/**
 * Diagnostic surface, deliberately NOT a way to release the lock.
 *
 * `__drainForTest` decrements without ever writing `setIsInGame(false)` —
 * correct for draining a count between tests, catastrophic in app code (the
 * nav would stay hidden with no claimant left to bring it back). Named so it
 * cannot be mistaken for the release that `acquireMissGapNavLock` returns,
 * which is the only supported way to let go.
 */
Object.defineProperty(acquireMissGapNavLock, 'count', {
  get: () => count,
});
acquireMissGapNavLock.__drainForTest = () => {
  count = Math.max(0, count - 1);
};

/**
 * Hold the lock for as long as this component is mounted.
 *
 * `active=false` never touches the nav at all: the teacher's compose card is a
 * dashboard tool and keeps the chrome it arrived with.
 */
export function useMissGapNavLock(active: boolean = true): void {
  const setIsInGame = useHideNavigation();
  useEffect(() => {
    if (!active) return undefined;
    return acquireMissGapNavLock(setIsInGame);
  }, [active, setIsInGame]);
}
