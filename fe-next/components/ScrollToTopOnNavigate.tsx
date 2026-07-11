'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Pins the page to the top on every client-side route change.
 *
 * The app's scroll container is `<body class="screen-fit">` (overflow-y:auto).
 * Because `html { overflow: visible }`, the viewport propagates the body's
 * overflow — so the element the browser treats as "the scroller" varies by
 * platform. On navigation a stale scroll offset can persist, or a newly mounted
 * child's auto-scroll (e.g. a chat list, a game board) drags the document down,
 * landing the user at the footer — the documented "page opens at the footer" bug.
 *
 * Explicitly resetting every candidate scroll container to the top on each
 * pathname change guarantees new pages always start at the top, independent of
 * which element the browser scrolls and of whether Next.js's own scroll handling
 * fired against the propagated body scroller.
 *
 * Anchor navigations (URL with a `#hash`) are left untouched so anchor links
 * still jump to their target rather than being yanked back to the top.
 */
export default function ScrollToTopOnNavigate(): null {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Respect in-page anchor jumps — don't override a hash-targeted scroll.
    if (window.location.hash) return;

    window.scrollTo(0, 0);
    // Reset both the propagated body scroller and the documentElement so the
    // reset lands regardless of which one the UA is actually scrolling.
    if (document.scrollingElement) document.scrollingElement.scrollTop = 0;
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
  }, [pathname]);

  return null;
}
