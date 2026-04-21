'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { isNative } from '@/utils/platform';

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

function stripLocale(pathname: string): string {
  const segment = pathname.split('/')[1];
  if ((SUPPORTED_LOCALES as readonly string[]).includes(segment)) {
    return pathname.slice(`/${segment}`.length) || '/';
  }
  return pathname;
}

/**
 * NativeColdStartGuard
 *
 * On Android/iOS cold start (first render of this session), redirect to the
 * locale home when the WebView landed on a "dead-end" route like a legal
 * document. This covers two regressions:
 *   1. External privacy-policy links (e.g., Play Store listing) opening the
 *      installed app directly at /legal/privacy instead of the landing page.
 *   2. The WebView restoring a stale URL from a previous session where the
 *      user had drilled into /legal/* before backgrounding the app.
 *
 * A sessionStorage flag ensures this only fires once per app session, so
 * navigating to a legal page from within the app still works normally.
 */
export function NativeColdStartGuard(): null {
  const pathname = usePathname();
  const router = useRouter();

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
    if (!isForbidden) return;

    const locale = parseLocale(path);
    router.replace(`/${locale}`);
  }, [pathname, router]);

  return null;
}

export default NativeColdStartGuard;
