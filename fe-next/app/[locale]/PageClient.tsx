'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { retryImport } from '@/utils/retryImport';
import { LoadingDancer } from '@/components/ui/LoadingDancer';
import { isReturningVisitor, savePendingRoomInvite } from '@/utils/onboardingStorage';
import { detectCrazyGamesSync } from '@/components/CrazyGamesSDK';
import { trackInviteLanded, trackInviteRedirectFired, trackGrowthEvent } from '@/utils/growthTracking';
import { isOnboardingAllowedRoute } from '@/lib/onboarding/allowedRoutes';
import { isQrScanArrival } from '@/utils/utmCapture';
import { isCrawler } from '@/lib/seo/isCrawler';
import { LandingView } from '@/components/landing';
import { useExperiment } from '@/hooks/useExperiment';
import { useLanguage } from '@/contexts/LanguageContext';
import type { LandingInitialData } from '@/lib/landing/fetchLandingData';

// Denylist: allow only Latin/accented/Hebrew/Hiragana/Katakana + space/apostrophe/hyphen
const HOST_NAME_ALLOWED = /[^A-Za-z0-9 '\-À-ɏ֐-׿぀-ヿ]/g;

const sanitizeHostName = (raw: string): string => {
  if (!raw) return '';
  return raw.replace(HOST_NAME_ALLOWED, '').trim().slice(0, 24);
};

// `retryImport` hardens the lazy chunk load: a flaky network or a stale chunk
// hash after a deploy used to leave the bare-navy `loading` fallback on screen
// forever — reported as "black backdrop, no popup" on the homepage. The loading
// fallback now shows a spinner so a slow load reads as loading, not a stuck screen.
const OnboardingFlow = dynamic(
  retryImport(() => import('@/components/onboarding/OnboardingFlow')),
  {
    ssr: false,
    loading: () => (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-neo-navy" role="status" aria-live="polite">
        {/* A dancing cube greets the player while the onboarding chunk loads —
            a brief, high-visibility first impression beats a bare spinner. Uses
            the light static-pose + CSS-dance loader (not the heavy animated WebP)
            so the new-user path stays featherweight on the critical boot. */}
        <LoadingDancer styleKey="arcade" className="h-28 w-28 sm:h-32 sm:w-32" />
        <span className="sr-only">Loading…</span>
      </div>
    ),
  }
);

interface HomePageClientProps {
  initialData?: LandingInitialData;
}

/**
 * Gate: returning users → LandingView (no CTA). New users → LandingView with
 * onStartOnboarding (PLAY); OnboardingFlow mounts in quick play only after they
 * click it. Detection is localStorage-based (`isReturningVisitor`), no viewport
 * branching.
 */
export default function HomePageClient({ initialData }: HomePageClientProps): React.JSX.Element {
  // Synchronous check: determine if user is new and parse URL invite params.
  // Kept synchronous (in useState initializer) so invite is saved before any
  // child effects that might redirect to /multiplayer read it.
  // Returning users with an invite link must skip LandingView (which surfaces
  // the friends activity feed) and drop straight into the MP lobby. New users
  // still flow through FTUE — `useInviteOnboardingMode` consumes the invite
  // from sessionStorage and routes after profile completion.
  const [initialState] = useState<{ isNewUser: boolean; inviteRedirectUrl: string | null; inviteRoomCode: string | null; qrRedirectUrl: string | null }>(() => {
    if (typeof window === 'undefined') return { isNewUser: false, inviteRedirectUrl: null, inviteRoomCode: null, qrRedirectUrl: null };
    const returning = isReturningVisitor();
    const params = new URLSearchParams(window.location.search);
    const roomCode = params.get('room');
    let inviteRedirectUrl: string | null = null;
    if (roomCode) {
      const rawHost = params.get('host') ?? '';
      const hostName = sanitizeHostName(rawHost) || undefined;
      savePendingRoomInvite(roomCode, hostName);
      sessionStorage.setItem('invite_landed_ts', String(Date.now()));
      trackInviteLanded({
        roomCode,
        hasHostName: !!hostName,
        isFirstTimeUser: !returning,
      });
      if (returning) {
        const localeMatch = window.location.pathname.match(/^\/([a-z]{2})(\/|$)/);
        const locale = localeMatch?.[1] || 'en';
        const redirectParams = new URLSearchParams({ room: roomCode });
        if (hostName) redirectParams.set('host', hostName);
        inviteRedirectUrl = `/${locale}/multiplayer?${redirectParams.toString()}`;
      }
    }

    // Printed QR / barcode landing (`?utm_source=barcode`) → warp straight to the
    // daily challenge with a witty "you scanned in" welcome. A live room invite
    // always wins (a QR could also be an invite poster), so only route to /daily
    // when there's no invite in play. UTM is already persisted to localStorage by
    // initUtmCapture (essential-providers) on load, so attribution still reaches
    // the admin dashboard even though we navigate away from the landing URL.
    let qrRedirectUrl: string | null = null;
    if (!roomCode && isQrScanArrival()) {
      const localeMatch = window.location.pathname.match(/^\/([a-z]{2})(\/|$)/);
      const locale = localeMatch?.[1] || 'en';
      qrRedirectUrl = `/${locale}/daily?from=qr`;
    }

    return { isNewUser: !returning, inviteRedirectUrl, inviteRoomCode: roomCode, qrRedirectUrl };
  });
  const { isNewUser, inviteRedirectUrl, inviteRoomCode, qrRedirectUrl } = initialState;

  const { variant: clarityVariant, trackExposure: trackClarityExposure } = useExperiment('exp-invite-arrival-clarity-v1');
  const { t } = useLanguage();

  // Same-origin relative path captured from `?next=` so a play surface
  // (e.g. /practice) can redirect first-timers here, finish FTUE, then route
  // back. Validated client-side: starts with `/`, no protocol-relative `//`.
  const [pendingNext] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const next = new URLSearchParams(window.location.search).get('next');
    if (!next || !next.startsWith('/') || next.startsWith('//')) return null;
    return next;
  });

  // Fires once per bounce so PostHog can measure whether these sessions ever
  // resume the original destination (see ftue_redirect_resumed below) — this
  // step previously had zero telemetry despite being a rage-click hotspot.
  useEffect(() => {
    if (!pendingNext) return;
    trackGrowthEvent('ftue_redirect_landed', { destination: pendingNext });
  }, [pendingNext]);

  // Fresh visitors land on the scrollable fresh homepage; OnboardingFlow opens
  // when they press PLAY (homepage gauntlet SPEC §8 — the auto-opened overlay
  // trapped them: scroll p50 0%). Only HIGH-INTENT arrivals still auto-open:
  //   - ?room= invite: FTUE owns the invite hand-off (useInviteOnboardingMode)
  //   - ?next= bounce from a play surface: finish FTUE, then route back
  //   - CrazyGames portal traffic: intends to play immediately
  // Returning users (same predicate as the pre-paint tree script) never do.
  //
  // Seeded in an EFFECT, not a useState initializer: this page is statically
  // rendered (SSG), so the server has no localStorage. Reading it in the
  // initializer would make the first CLIENT render diverge from the server HTML.
  //
  // CRAWLERS: Googlebot/Bingbot run this effect with empty localStorage; the
  // isCrawler() guard keeps their rendered snapshot equal to the page every
  // human reaches. See lib/seo/isCrawler.ts for the not-cloaking rationale.
  const [showFTUE, setShowFTUE] = useState<boolean>(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isCrawler()) return;
    if (isReturningVisitor()) return;
    let isCrazyGames = false;
    try {
      isCrazyGames = detectCrazyGamesSync();
    } catch {
      isCrazyGames = false;
    }
    // Any ?next= means a bounce from a play surface, even one whose value is
    // rejected as unsafe (it is then simply not followed after FTUE).
    const bounced = new URLSearchParams(window.location.search).has('next');
    if (inviteRoomCode || bounced || isCrazyGames) setShowFTUE(true);
  }, [inviteRoomCode]); // frozen initial state → runs once

  // Hydration gate for the render-affecting, window-derived branches below
  // (invite spinner, isNewUser CTA). The server (SSG, no window) emits LandingView;
  // these branches must NOT flip the first CLIENT render or React #418 fires (seen
  // in prod on /en?room=… invite links). The side-effects in the initializers above
  // still run synchronously (invite saved before child effects) — only the RENDER
  // waits for mount, same discipline as showFTUE.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Instrument landing page views — fires once after hydration on the real
  // homepage (not redirects, not crawlers). Fills the funnel's top-step gap
  // (landing_view = 0 in PostHog because no call site existed here before).
  //
  // Also fires `return_visit` for returning users (the D1 retention funnel's
  // terminal event). Without this, PostHog cannot compute signup→first-game→D1
  // return — the retention funnel was blank (baseline ~20% D1 measured anecdotally
  // from Supabase, not PostHog). Fires on every landing page view for returning
  // users, so PostHog's retention/trends compute the daily active returning cohort.
  useEffect(() => {
    if (!mounted || inviteRedirectUrl || qrRedirectUrl) return;
    if (isCrawler()) return;
    trackGrowthEvent('landing_view', { is_new_user: isNewUser });
    if (!isNewUser) {
      trackGrowthEvent('return_visit', {});
    }
  }, [mounted, inviteRedirectUrl, qrRedirectUrl, isNewUser]);
  // Defensive route allowlist: FTUE may only render on locale homepage.
  // PageClient is mounted only at /[locale]/page.tsx today, so this is dormant
  // for current users — but guards against a future hoist that would leak the
  // FTUE onto blog/SEO/legal routes (and tank their CWV / SEO).
  const pathname = usePathname();
  const router = useRouter();
  const routeAllowsOnboarding = isOnboardingAllowedRoute(pathname);

  // Fresh-page PLAY → quick play (hero taught the board); auto-opens keep the
  // full flow. CrazyGames via the sync detector, not the late hook (Class 1).
  const [ftueEntry, setFtueEntry] = useState<'quickPlay' | undefined>(undefined);
  // Quick play ends by navigating; a cover stops the homepage flashing back.
  const [leavingForGame, setLeavingForGame] = useState(false);
  useEffect(() => {
    if (!leavingForGame) return; // never strand it: bfcache restore or a dead nav clears it
    const clear = (e: PageTransitionEvent) => e.persisted && setLeavingForGame(false);
    window.addEventListener('pageshow', clear);
    const id = setTimeout(() => setLeavingForGame(false), 30000);
    return () => {
      clearTimeout(id);
      window.removeEventListener('pageshow', clear);
    };
  }, [leavingForGame]);

  const handleStartOnboarding = useCallback(() => {
    if (!routeAllowsOnboarding) return;
    let isCrazyGames = false;
    try {
      isCrazyGames = detectCrazyGamesSync();
    } catch {
      isCrazyGames = false;
    }
    setFtueEntry(isCrazyGames ? undefined : 'quickPlay');
    setShowFTUE(true);
  }, [routeAllowsOnboarding]);
  const handleFTUEComplete = useCallback(() => {
    setShowFTUE(false);
    if (ftueEntry === 'quickPlay') setLeavingForGame(true);
    if (pendingNext) {
      trackGrowthEvent('ftue_redirect_resumed', { destination: pendingNext });
      router.push(pendingNext);
    }
  }, [pendingNext, router, ftueEntry]);

  useEffect(() => {
    if (inviteRedirectUrl && inviteRoomCode) {
      trackClarityExposure();
      trackInviteRedirectFired({ roomCode: inviteRoomCode, variant: clarityVariant });
      router.replace(inviteRedirectUrl);
    }
  }, [inviteRedirectUrl, inviteRoomCode, clarityVariant, trackClarityExposure, router]);

  // QR / barcode arrival → warp to the daily challenge. `replace` (not push) so
  // the barcode-param landing URL never sits in history to loop back onto.
  useEffect(() => {
    if (qrRedirectUrl) {
      trackGrowthEvent('qr_scan_landed', { destination: 'daily' });
      router.replace(qrRedirectUrl);
    }
  }, [qrRedirectUrl, router]);

  // Both clarity variants ('status-card' and control) show the SAME connecting
  // spinner: never a contentless dark screen (reads as a "black screen" bug while
  // the redirect resolves), so the invite hop always has visible, alive feedback.
  if (mounted && inviteRedirectUrl) {
    return (
      <div className="fixed inset-0 bg-neo-navy z-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-4 border-neo-lime border-t-transparent animate-spin" />
          <span className="font-neo-body text-neo-cream text-sm">{t('joinView.connectingToRoom')}</span>
        </div>
      </div>
    );
  }

  // QR/barcode arrival: show alive feedback while router.replace → /daily
  // resolves (never a contentless dark screen, same discipline as the invite hop).
  if (mounted && qrRedirectUrl) {
    return (
      <div className="fixed inset-0 bg-neo-navy z-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-4 border-neo-cyan border-t-transparent animate-spin" />
          <span className="font-neo-body text-neo-cream text-sm">{t('daily.qrWelcome.warping')}</span>
        </div>
      </div>
    );
  }

  // FTUE renders ON TOP of LandingView (opaque z-[100] overlay), NOT instead of
  // it: swapping LandingView out was THE landing CLS regression (field p75 0.98).
  return (
    <>
      <LandingView
        initialData={initialData}
        onStartOnboarding={mounted && isNewUser && routeAllowsOnboarding ? handleStartOnboarding : undefined}
      />
      {showFTUE && routeAllowsOnboarding && (
        <OnboardingFlow onComplete={handleFTUEComplete} entry={ftueEntry} />
      )}
      {leavingForGame && !showFTUE && (
        <div
          data-testid="home-quickplay-cover"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-neo-navy"
          role="status"
          aria-live="polite"
        >
          <LoadingDancer styleKey="arcade" className="h-28 w-28 sm:h-32 sm:w-32" />
          <span className="sr-only">{t('onboarding.loading')}</span>
        </div>
      )}
    </>
  );
}
