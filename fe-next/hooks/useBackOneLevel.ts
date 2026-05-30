'use client';

/**
 * useBackOneLevel — hierarchy-aware "back" navigation.
 *
 * Returns a callback that navigates exactly ONE level up the URL hierarchy via
 * router.push(parent). It only uses router.back() as an optimization (to
 * preserve scroll/state) when we can prove we arrived from the parent
 * (document.referrer is same-origin and its pathname === the parent). This
 * fixes the long-standing bug where router.back() over-shoots to home on
 * deep-link/refresh.
 *
 * Pass an explicit `parent` for the handful of routes whose URL hierarchy lies
 * (e.g. a results screen that belongs to a lobby).
 */

import { useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { parentRoute } from '@/lib/navigation/parentRoute';

export function useBackOneLevel(parent?: string): () => void {
  const router = useRouter();
  const pathname = usePathname() || '/';

  return useCallback(() => {
    const target = parent || parentRoute(pathname);

    if (typeof document !== 'undefined' && document.referrer) {
      try {
        const ref = new URL(document.referrer);
        if (ref.origin === window.location.origin && ref.pathname === target) {
          router.back();
          return;
        }
      } catch {
        /* malformed referrer — fall through to push */
      }
    }

    router.push(target);
  }, [router, pathname, parent]);
}

export default useBackOneLevel;
