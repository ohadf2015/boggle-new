'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { isNative } from '@/utils/platform';
import {
  LAST_ROUTE_KEY,
  parseSavedRoute,
  resolveColdStartTarget,
  stripLocale,
  type SavedRoute,
} from '@/lib/native/coldStartRestore';

const NATIVE_COLD_START_FLAG = 'lexiclash_native_cold_start_handled';

const SUPPORTED_LOCALES = ['en', 'he', 'sv', 'ja', 'es'] as const;
type Locale = (typeof SUPPORTED_LOCALES)[number];

// Paths users should NEVER land on when opening the app fresh. These are
// dead-ends for a cold-start launch (legal docs reached via external links
// or restored from a stale WebView session). If the app boots onto one of
// these, bounce to the locale home so the user sees the landing page first.
const COLD_START_FORBIDDEN_PREFIXES = ['/legal/'];

function parseLocale(pathname: string): Locale {
  const segment = pathname.split('/')[1];
  return (SUPPORTED_LOCALES as readonly string[]).includes(segment)
    ? (segment as Locale)
    : 'en';
}

function readSavedRoute(): SavedRoute | null {
  if (typeof window === 'undefined') return null;
  try {
    return parseSavedRoute(window.localStorage.getItem(LAST_ROUTE_KEY));
  } catch {
    return null;
  }
}

/**
 * NativeColdStartGuard
 *
 * On Android/iOS cold start (first render of this session) this does two things,
 * once per app session (gated by a sessionStorage flag):
 *
 *   1. Bounce off "dead-end" routes (e.g. /legal/*) reached via an external link
 *      or a stale restored WebView URL, so the user sees the landing page first.
 *   2. Restore the user's last stable location. The app loads JS from a remote
 *      URL, so when Android evicts the process the WebView reloads to home and
 *      the user loses their place. If they were last on an allowlisted, stateless
 *      hub screen recently, send them back there. Gameplay/auth/transient routes
 *      are never restored — their in-memory state is gone and cannot be rebuilt
 *      from a URL, so home is the correct (and safe) landing.
 *
 * Separately, every native navigation persists the current route so the next
 * cold start has something to restore.
 */
export function NativeColdStartGuard(): null {
  const pathname = usePathname();
  const router = useRouter();

  // Capture the PREVIOUS session's saved route during render — before the persist
  // effect below overwrites it with this launch's home path on the same mount.
  const [savedOnMount] = useState<SavedRoute | null>(() => readSavedRoute());

  // Cold-start handling — fires once per app session.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isNative()) return;
    if (sessionStorage.getItem(NATIVE_COLD_START_FLAG)) return;

    sessionStorage.setItem(NATIVE_COLD_START_FLAG, '1');

    const path = pathname ?? '/';
    const withoutLocale = stripLocale(path);

    const isForbidden = COLD_START_FORBIDDEN_PREFIXES.some((prefix) =>
      withoutLocale.startsWith(prefix)
    );
    if (isForbidden) {
      router.replace(`/${parseLocale(path)}`);
      return;
    }

    const target = resolveColdStartTarget({
      currentPath: path,
      saved: savedOnMount,
      now: Date.now(),
    });
    if (target) router.replace(target);
  }, [pathname, router, savedOnMount]);

  // Persist the current route on every native navigation so the next cold start
  // can restore it. Writes unconditionally; the restore side decides eligibility.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isNative()) return;
    if (!pathname) return;
    try {
      window.localStorage.setItem(
        LAST_ROUTE_KEY,
        JSON.stringify({ path: pathname, ts: Date.now() })
      );
    } catch {
      /* storage unavailable — restoration simply won't fire next launch */
    }
  }, [pathname]);

  return null;
}

export default NativeColdStartGuard;
