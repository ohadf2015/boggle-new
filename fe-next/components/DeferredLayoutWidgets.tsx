'use client';

import nextDynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { isStudentJoinPath } from '@/components/education/join/joinRoutes';
import { isQuietChromeSurface } from '@/components/education/shell/quietChromeRoutes';
import { useOverlayQuietZone } from '@/lib/overlayQuietZone';
import { useOverlayQuietZoneGameWatch } from '@/lib/overlayQuietZoneGameWatch';

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
  // Raise the overlay quiet zone on the game-over transition itself, from the
  // one component that is mounted on every route. Doing it here rather than in
  // each prompt keeps the signal and its consumers in one file: a prompt added
  // to the list below inherits the rule by construction.
  useOverlayQuietZoneGameWatch();
  // The runtime half of the route list below. `isQuietChromeSurface` covers the
  // teacher's own screens by path; this covers every surface that declares
  // itself uncoverable at runtime — a live board in any mode, a lobby, the
  // round-end recap, the projector results — plus the grace window after a
  // round ends. Route lists never converged; a claim is raised by the surface.
  const overlayQuietZone = useOverlayQuietZone();
  // The student join screen is the one surface where these are not "chrome"
  // but an obstacle: a 390px capture of `/join/<code>` showed the cookie sheet
  // sitting ON the six code cells, and `AndroidAppRedirect` sends an Android
  // visitor to the Play Store — off the lesson their teacher just started.
  // The consent ask is DEFERRED, not skipped: non-essential scripts remain
  // gated on a decision nobody has made, and the sheet mounts on the very next
  // screen (`/multiplayer`), which is this same layout under another path.
  // The silent widgets (version check, churn telemetry, referral attribution)
  // keep running — this is about what covers the field, not a blackout.
  const pathname = usePathname();
  const quietJoinScreen = isStudentJoinPath(pathname);
  // The teacher's own screens and every projected surface. Each is sized to the
  // viewport with nowhere left to scroll, and `PWAInstallPrompt` (z-[100]) and
  // `PushNotificationPrompt` (z-50) both dock on top of `TeacherLiveControls`
  // (z-[70]) — i.e. over START GAME, in front of a class. The consent sheet is
  // NOT in this group: it keeps mounting and re-ranks itself instead.
  const quietChrome = quietJoinScreen || isQuietChromeSurface(pathname) || overlayQuietZone;

  return (
    <>
      <VersionChecker />
      {!quietChrome && (
        <>
          <AndroidAppRedirect />
          <AndroidAppInstallPromo />
          <AndroidInstallPill />
          <PWAInstallPrompt />
          <PushNotificationPrompt />
          <NewYearCountdown />
        </>
      )}
      {!quietJoinScreen && <CookieConsent />}
      <ChurnSignalTracker />
      <ReferralCodeClaimer />
    </>
  );
}
