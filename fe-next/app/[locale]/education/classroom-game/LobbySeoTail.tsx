'use client';

/**
 * The crawler-facing copy below the lobby — in the HTML, out of the scroll.
 *
 * This route server-renders a `GamePageSeoContent` block and a for-schools CTA
 * BELOW the client tree. That copy is not decoration: this page is the primary
 * hero CTA of `/education/for-schools`, the $149/year funnel, and the block
 * exists because a crawler previously saw 17 words here under a HowTo that
 * described three unseen steps.
 *
 * It is also 740px tall, and it is what made the lobby page-scroll. Measured
 * live 2026-09-11 at 1440×900: `documentElement.scrollHeight` 1640 against an
 * `innerHeight` of 900, with `body.screen-fit-locked` already applied — the
 * shell was locking itself correctly and this tail was sitting underneath it.
 * (`overflow:hidden` on `<body>` propagates to the viewport rather than
 * clipping the body's own children, so the lock stops the scroll gesture but
 * never stops the height.)
 *
 * So: rendered on the server exactly as before, and removed from the layout the
 * moment the LOBBY is actually up. `isInGame` is that signal and nothing else —
 * `ClassroomGameInner` sets it when it mounts the lobby and clears it on the
 * way out. A crawler, and a logged-out visitor (who is redirected to
 * `/education` before any lobby exists), get the copy untouched.
 *
 * `hidden` rather than a CSS class: the attribute is in the initial server HTML
 * as absent, so the first paint carries the copy, and no stylesheet has to be
 * resolved for the removal to take effect.
 */

import type { ReactNode } from 'react';
import { useNavigation } from '@/contexts/NavigationContext';

export function LobbySeoTail({ children }: { children: ReactNode }) {
  const { isInGame } = useNavigation();
  return <div hidden={isInGame}>{children}</div>;
}

export default LobbySeoTail;
