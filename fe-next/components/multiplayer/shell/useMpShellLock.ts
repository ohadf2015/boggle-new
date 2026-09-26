'use client';

import { useEffect } from 'react';

/**
 * The document-scroll lock behind `MpScreen` (same pattern as the education
 * shell's `useEducationShellLock`).
 *
 * `<body>` ships `.screen-fit` (`min-height:100dvh; overflow-y:auto`), so the
 * multiplayer entry scrolled the whole document. `body.mp-shell-locked` bounds
 * the body to the viewport so MpScreen's grid gives the ONE inner region the
 * scrollbar. It is its own class — never `screen-fit-locked`, which
 * NavigationContext owns (isInGame) — so there is exactly one writer of each
 * value (pitfall class 1).
 *
 * Ref-counted: during a phase change the next screen mounts before the
 * previous one unmounts, and a plain add/remove would unlock for a frame.
 */
export const MP_SHELL_LOCK_CLASS = 'mp-shell-locked';

let lockCount = 0;

export function acquireMpShellLock(): () => void {
  if (typeof document === 'undefined') return () => {};
  lockCount += 1;
  document.body.classList.add(MP_SHELL_LOCK_CLASS);
  let released = false;
  return () => {
    if (released) return;
    released = true;
    lockCount = Math.max(0, lockCount - 1);
    if (lockCount === 0) document.body.classList.remove(MP_SHELL_LOCK_CLASS);
  };
}

export function useMpShellLock(): void {
  useEffect(() => acquireMpShellLock(), []);
}
