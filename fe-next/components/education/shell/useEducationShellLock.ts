'use client';

import { useEffect } from 'react';

/**
 * The body lock behind `EducationShell`.
 *
 * `<body>` ships `.screen-fit` — `min-height:100dvh; overflow-y:auto` — so the
 * document scrolls app-wide by default. A shell subtree that is exactly one
 * viewport tall is not enough on its own: anything the page adds below it
 * (a portal, a toast dock, safe-area padding) still grows the body. This class
 * closes that off. `body.edu-shell-locked` beats `.screen-fit` on specificity,
 * so the two can coexist.
 *
 * Deliberately NOT `screen-fit-locked`. That class is the `isInGameSurface()`
 * signal (`lib/inGameSurface.ts`) — it hides the feedback launcher and
 * suppresses the ad banner — and `NavigationContext` re-adds `.screen-fit`
 * whenever `isInGame` flips false. A shell that wrote the same class would be
 * the second writer of a value with two owners (pitfall class 1): navigate
 * teacher → multiplayer → back and the provider's effect would silently undo
 * the lock.
 *
 * Ref-counted because React remounts: during a route transition the next
 * screen's shell mounts before the previous one unmounts, and a plain
 * add/remove pair would leave the page unlocked for a frame (and, under
 * StrictMode's double-invoke, forever).
 */
export const EDUCATION_SHELL_LOCK_CLASS = 'edu-shell-locked';

let lockCount = 0;

export function acquireEducationShellLock(): () => void {
  if (typeof document === 'undefined') return () => {};
  lockCount += 1;
  document.body.classList.add(EDUCATION_SHELL_LOCK_CLASS);
  let released = false;
  return () => {
    if (released) return;
    released = true;
    lockCount = Math.max(0, lockCount - 1);
    if (lockCount === 0) {
      document.body.classList.remove(EDUCATION_SHELL_LOCK_CLASS);
    }
  };
}

export function useEducationShellLock(): void {
  useEffect(() => acquireEducationShellLock(), []);
}
