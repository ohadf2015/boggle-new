'use client';

/**
 * useSafeBack — "return to where you came from" for LEAF pages that have no
 * URL-hierarchy parent (e.g. /[locale]/player/[id], reached from leaderboard,
 * rooms, friends, deep links).
 *
 * Bare `router.back()` / `window.history.back()` overshoot to home — or leave
 * the site — on a true deep-link/fresh load where there's no in-app entry to
 * pop. This pops history only when there IS a prior entry, else pushes an
 * explicit fallback so the user never lands off-site or on a route with no page
 * (there is no /[locale]/player index).
 *
 * NOTE: we deliberately do NOT gate on document.referrer — it is frozen at the
 * initial document load and never updates across SPA (pushState) navigation, so
 * checking it would send every in-app visitor to the fallback instead of back
 * to where they came from. history.length is the signal that survives SPA nav.
 *
 * For pages that DO have a real hierarchy parent, prefer useBackOneLevel.
 */

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';

export function useSafeBack(fallback: string): () => void {
  const router = useRouter();

  return useCallback(() => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
      return;
    }
    router.push(fallback);
  }, [router, fallback]);
}

export default useSafeBack;
