'use client';

import { NB_BLOCK, NB_SMALL } from './nb/nbStyles';
import { cn } from '@/lib/utils';
import { useEffect, useLayoutEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { usePathname, useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTeacherPro } from '@/hooks/useTeacherPro';
import {
  GRANT_POLL_INTERVAL_MS,
  GRANT_POLL_MAX_TRIES,
  checkoutIdFromSearch,
  checkoutReturnPhase,
  clearCheckoutRedirect,
  clearPendingReturnCheckout,
  clearReturnIntent,
  forgetCheckoutOriginAwayFrom,
  isCheckoutSuccessSearch,
  isFreshCheckoutLanding,
  markCheckoutRedirect,
  pendingReturnCheckoutId,
  readPendingReturnCheckout,
  readReturnIntent,
  rememberPendingReturnCheckout,
  rememberReturnIntent,
  takeCheckoutOrigin,
} from '@/lib/education/checkoutReturn';
import { claimCheckoutReturn, checkoutReturnBeaconPromise, trackEduProCheckoutReturnLanded } from '@/lib/education/proFunnelTelemetry';
import { ProWelcomeCelebration } from '@/components/teacher/ProWelcomeCelebration';
import { TeacherTrialWelcome } from '@/components/teacher/TeacherTrialWelcome';
import { polarCheckoutWelcomeKind, type PolarCheckoutWelcomeKind } from '@/lib/education/polarTrial';

const AuthModal = dynamic(() => import('@/components/auth/AuthModal'), { ssr: false });

const TEACHER_HOME = /^\/[a-z]{2}\/teacher\/?$/;

/**
 * Records a Polar return before TeacherGate can redirect, then shows whether
 * Teacher Pro has been unlocked. Mounted from the /teacher layout so
 * /teacher and /teacher/upgrade both see `?checkout=success`.
 *
 * The return beacon grants when Polar already says the checkout succeeded
 * and the teacher is signed in. If the session expired on Polar, this keeps
 * the checkout id and asks them to sign in — it never grants to a visitor
 * who is still signed out.
 */
export function CheckoutReturnCapture() {
  const [active, setActive] = useState(false);
  const { language } = useLanguage();
  const router = useRouter();
  const currentPathname = usePathname();

  useEffect(() => {
    if (!currentPathname || isCheckoutSuccessSearch(window.location.search)) return;
    forgetCheckoutOriginAwayFrom(window.sessionStorage, currentPathname);
  }, [currentPathname]);

  useLayoutEffect(() => {
    const search = window.location.search;
    if (isCheckoutSuccessSearch(search)) {
      const id = checkoutIdFromSearch(search);
      if (id) rememberPendingReturnCheckout(window.localStorage, id);
      rememberReturnIntent(window.sessionStorage);
      if (isFreshCheckoutLanding(window.localStorage, search)) {
        trackEduProCheckoutReturnLanded();
        const origin = takeCheckoutOrigin(window.sessionStorage, {
          locale: language,
          currentPath: `${window.location.pathname}${search}`,
        });
        if (origin) {
          markCheckoutRedirect(window.sessionStorage, origin);
          router.replace(origin, { scroll: false });
        }
      }
      setActive(true);
      return;
    }
    if (readReturnIntent(window.sessionStorage) || readPendingReturnCheckout(window.localStorage)) setActive(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the landing is read once per mount
  }, []);

  if (!active) return null;
  return <CheckoutReturnBanner />;
}

function CheckoutReturnBanner() {
  const { t, language } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const pro = useTeacherPro();
  const refreshPro = pro.refresh;
  const [attempts, setAttempts] = useState(0);
  const [pollGen, setPollGen] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [fresh] = useState(
    () => typeof window === 'undefined' || isFreshCheckoutLanding(window.localStorage, window.location.search),
  );
  const offHome = !!pathname && !TEACHER_HOME.test(pathname);
  const needsSignIn = !authLoading && !user;

  useEffect(() => {
    if (offHome) clearCheckoutRedirect(window.sessionStorage);
  }, [offHome]);

  useEffect(() => {
    if (pro.hasPro) clearPendingReturnCheckout(window.localStorage);
  }, [pro.hasPro]);

  useEffect(() => {
    if (dismissed || pro.hasPro || needsSignIn || authLoading) return;
    let cancelled = false;
    let tries = 0;
    let id: ReturnType<typeof setInterval> | undefined;
    const startPolling = () => {
      if (cancelled) return;
      void refreshPro();
      id = setInterval(() => {
        tries += 1;
        setAttempts(tries);
        void refreshPro();
        if (tries >= GRANT_POLL_MAX_TRIES) clearInterval(id);
      }, GRANT_POLL_INTERVAL_MS);
    };
    const pendingId =
      typeof window === 'undefined'
        ? null
        : pendingReturnCheckoutId(window.location.search, window.localStorage);
    const claim = pendingId ? claimCheckoutReturn(pendingId) : checkoutReturnBeaconPromise();
    if (claim) void claim.finally(startPolling);
    else startPolling();
    return () => {
      cancelled = true;
      if (id) clearInterval(id);
    };
  }, [dismissed, pro.hasPro, needsSignIn, authLoading, refreshPro, pollGen]);

  const dismiss = () => {
    setDismissed(true);
    setShowAuth(false);
    clearReturnIntent(window.sessionStorage);
    clearPendingReturnCheckout(window.localStorage);
    const url = new URL(window.location.href);
    url.searchParams.delete('checkout');
    const next = `${pathname || url.pathname}${url.search ? url.search : ''}`;
    router.replace(next, { scroll: false });
  };

  const finishSignIn = () => {
    setShowAuth(false);
    const pendingId =
      typeof window === 'undefined'
        ? null
        : pendingReturnCheckoutId(window.location.search, window.localStorage);
    void claimCheckoutReturn(pendingId).finally(() => {
      void refreshPro();
    });
  };

  // A stale success URL should not re-open the celebration once Pro is already on.
  if (!fresh && pro.hasPro) return null;

  if (needsSignIn && !dismissed) {
    return (
      <>
        <div
          role="status"
          aria-live="polite"
          data-testid="checkout-return-status"
          data-phase="signin"
          dir={language === 'he' ? 'rtl' : 'ltr'}
          className="fixed inset-x-3 top-3 z-[120] mx-auto max-w-3xl rounded-neo-lg border-[3px] border-neo-black bg-neo-yellow px-4 py-3 text-neo-black shadow-hard-xl"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="font-neo-display text-lg font-black leading-snug">{t('teacher.checkoutReturn.signInTitle')}</p>
              <p className="font-neo-body text-sm font-bold">{t('teacher.checkoutReturn.signInBody')}</p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                data-testid="checkout-return-signin"
                className={cn(NB_SMALL, NB_BLOCK.cream)}
                onClick={() => setShowAuth(true)}
              >
                {t('teacher.checkoutReturn.signInCta')}
              </button>
              <button
                type="button"
                data-testid="checkout-return-dismiss"
                className={cn(NB_SMALL, 'bg-edu-surface text-edu-ink')}
                onClick={dismiss}
              >
                {t('teacher.checkoutReturn.close')}
              </button>
            </div>
          </div>
        </div>
        {showAuth ? (
          <AuthModal
            isOpen
            onClose={() => setShowAuth(false)}
            initialMode="signin"
            audience="teacher"
            onAuthSuccess={finishSignIn}
          />
        ) : null}
      </>
    );
  }

  const phase = checkoutReturnPhase({
    active: !dismissed,
    hasPro: pro.hasPro,
    loading: (pro.loading || authLoading) && attempts === 0,
    attempts,
  });
  if (phase === 'idle') return null;
  // Off the home page nobody else celebrates the upgrade, so the unlocked page does.
  const welcome = polarCheckoutWelcomeKind({ checkoutSuccess: true, hasPro: pro.hasPro, source: pro.source, status: pro.status ?? 'active' });
  if (phase === 'success' && offHome && welcome !== 'none') {
    return <WelcomeOnThisPage kind={welcome} trialExpires={pro.trialExpires ?? pro.periodEnd ?? null} />;
  }

  const copy = {
    activating: ['teacher.checkoutReturn.activatingTitle', 'teacher.checkoutReturn.activatingBody'],
    success: pro.status === 'trialing'
      ? ['teacher.checkoutReturn.trialSuccessTitle', 'teacher.checkoutReturn.trialSuccessBody']
      : ['teacher.checkoutReturn.successTitle', 'teacher.checkoutReturn.successBody'],
    failure: ['teacher.checkoutReturn.failureTitle', 'teacher.checkoutReturn.failureBody'],
  }[phase];

  const tone = phase === 'failure' ? 'bg-neo-pink' : phase === 'success' ? 'bg-neo-lime' : 'bg-neo-yellow';

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="checkout-return-status"
      data-phase={phase}
      dir={language === 'he' ? 'rtl' : 'ltr'}
      className={`fixed inset-x-3 top-3 z-[120] mx-auto max-w-3xl rounded-neo-lg border-[3px] border-neo-black px-4 py-3 text-neo-black shadow-hard-xl ${tone}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="font-neo-display text-lg font-black leading-snug">{t(copy[0])}</p>
          <p className="font-neo-body text-sm font-bold">{t(copy[1])}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          {phase === 'failure' ? (
            <button
              type="button"
              data-testid="checkout-return-retry"
              className={cn(NB_SMALL, NB_BLOCK.cream)}
              onClick={() => {
                setAttempts(0);
                setPollGen((n) => n + 1);
                void pro.refresh();
              }}
            >
              {t('teacher.checkoutReturn.retry')}
            </button>
          ) : null}
          <button
            type="button"
            data-testid="checkout-return-dismiss"
            className={cn(NB_SMALL, 'bg-edu-surface text-edu-ink')}
            onClick={dismiss}
          >
            {t('teacher.checkoutReturn.close')}
          </button>
        </div>
      </div>
    </div>
  );
}

function WelcomeOnThisPage({ kind, trialExpires }: { kind: Exclude<PolarCheckoutWelcomeKind, 'none'>; trialExpires: string | null }) {
  useEffect(() => {
    clearReturnIntent(window.sessionStorage);
    clearPendingReturnCheckout(window.localStorage);
  }, []);
  return kind === 'trial' ? <TeacherTrialWelcome trialExpires={trialExpires} onReturnPage /> : <ProWelcomeCelebration grant={null} paid onReturnPage />;
}
