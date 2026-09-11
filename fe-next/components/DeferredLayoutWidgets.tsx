'use client';

import nextDynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { isStudentJoinPath } from '@/components/education/join/joinRoutes';

/**
 * Post-hydration-only chrome mounted by the locale layout: install prompts,
 * cookie banner, version checker, churn tracker, seasonal countdown. None of
 * them render anything server-side — they all gate on `window`/localStorage —
 * so `ssr: false` is both correct and what actually keeps them out of the
 * layout's entry chunk. `next/dynamic` with the default `ssr: true` does not:
 * the module stays in the initial load so hydration can match, which is how a
 * New Year countdown ended up shipping on every route in August.
 *
 * `ssr: false` is rejected inside a Server Component, and `app/[locale]/layout.tsx`
 * is one — hence this client wrapper. Guarded by
 * `components/__tests__/DeferredLayoutWidgets.test.tsx`.
 */

const VersionChecker = nextDynamic(
  () => import('@/components/VersionChecker'),
  { ssr: false, loading: () => null }
);
const AndroidAppRedirect = nextDynamic(
  () => import('@/components/AndroidAppRedirect'),
  { ssr: false, loading: () => null }
);
const AndroidAppInstallPromo = nextDynamic(
  () => import('@/components/AndroidAppInstallPromo'),
  { ssr: false, loading: () => null }
);
const AndroidInstallPill = nextDynamic(
  () => import('@/components/android-install/AndroidInstallPill'),
  { ssr: false, loading: () => null }
);
const PWAInstallPrompt = nextDynamic(
  () => import('@/components/PWAInstallPrompt'),
  { ssr: false, loading: () => null }
);
const PushNotificationPrompt = nextDynamic(
  () => import('@/components/notifications/PushNotificationPrompt'),
  { ssr: false, loading: () => null }
);
const NewYearCountdown = nextDynamic(
  () => import('@/components/celebration/NewYearCountdown'),
  { ssr: false, loading: () => null }
);
const CookieConsent = nextDynamic(
  () => import('@/components/CookieConsent'),
  { ssr: false, loading: () => null }
);
const ChurnSignalTracker = nextDynamic(
  () => import('@/components/engagement/ChurnSignalTracker').then((m) => ({ default: m.ChurnSignalTracker })),
  { ssr: false, loading: () => null }
);
const ReferralCodeClaimer = nextDynamic(
  () => import('@/components/referral/ReferralCodeClaimer'),
  { ssr: false, loading: () => null }
);

/** Mount inside the providers — VersionChecker and the prompts read LanguageContext. */
export default function DeferredLayoutWidgets() {
  // The student join screen is the one surface where these are not "chrome"
  // but an obstacle: a 390px capture of `/join/<code>` showed the cookie sheet
  // sitting ON the six code cells, and `AndroidAppRedirect` sends an Android
  // visitor to the Play Store — off the lesson their teacher just started.
  // The consent ask is DEFERRED, not skipped: non-essential scripts remain
  // gated on a decision nobody has made, and the sheet mounts on the very next
  // screen (`/multiplayer`), which is this same layout under another path.
  // The silent widgets (version check, churn telemetry, referral attribution)
  // keep running — this is about what covers the field, not a blackout.
  const quietJoinScreen = isStudentJoinPath(usePathname());

  return (
    <>
      <VersionChecker />
      {!quietJoinScreen && (
        <>
          <AndroidAppRedirect />
          <AndroidAppInstallPromo />
          <AndroidInstallPill />
          <PWAInstallPrompt />
          <PushNotificationPrompt />
          <NewYearCountdown />
          <CookieConsent />
        </>
      )}
      <ChurnSignalTracker />
      <ReferralCodeClaimer />
    </>
  );
}
