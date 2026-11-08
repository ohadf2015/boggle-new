'use client';

import { NB_BLOCK, NB_SMALL } from './nb/nbStyles';
import { cn } from '@/lib/utils';
import { useEffect, useLayoutEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTeacherPro } from '@/hooks/useTeacherPro';
import {
  GRANT_POLL_INTERVAL_MS,
  GRANT_POLL_MAX_TRIES,
  checkoutReturnPhase,
  clearCheckoutRedirect,
  clearReturnIntent,
  forgetCheckoutOriginAwayFrom,
  isCheckoutSuccessSearch,
  markCheckoutRedirect,
  readReturnIntent,
  rememberReturnIntent,
  takeCheckoutOrigin,
} from '@/lib/education/checkoutReturn';
import { trackEduProCheckoutReturnLanded } from '@/lib/education/proFunnelTelemetry';
import { ProWelcomeCelebration } from '@/components/teacher/ProWelcomeCelebration';
import { TeacherTrialWelcome } from '@/components/teacher/TeacherTrialWelcome';
import { polarCheckoutWelcomeKind, type PolarCheckoutWelcomeKind } from '@/lib/education/polarTrial';

const TEACHER_HOME = /^\/[a-z]{2}\/teacher\/?$/;

/**
 * Records a Polar return before TeacherGate can redirect, then shows whether
 * the webhook grant has landed. Mounted from the /teacher layout so
 * /teacher and /teacher/upgrade both see `?checkout=success`.
 *
 * Does not grant. `useTeacherPro` only GETs /api/subscription/status.
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
      rememberReturnIntent(window.sessionStorage);
      trackEduProCheckoutReturnLanded();
      const origin = takeCheckoutOrigin(window.sessionStorage, {
        locale: language,
        currentPath: `${window.location.pathname}${search}`,
      });
      if (origin) {
        markCheckoutRedirect(window.sessionStorage, origin);
        router.replace(origin, { scroll: false });
      }
      setActive(true);
      return;
    }
    if (readReturnIntent(window.sessionStorage)) setActive(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the landing is read once per mount
  }, []);

  if (!active) return null;
  return <CheckoutReturnBanner />;
}

function CheckoutReturnBanner() {
  const { t, language } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const pro = useTeacherPro();
  const refreshPro = pro.refresh;
  const [attempts, setAttempts] = useState(0);
  const [pollGen, setPollGen] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const offHome = !!pathname && !TEACHER_HOME.test(pathname);

  useEffect(() => {
    if (offHome) clearCheckoutRedirect(window.sessionStorage);
  }, [offHome]);

  useEffect(() => {
    if (dismissed || pro.hasPro) return;
    let tries = 0;
    const id = setInterval(() => {
      tries += 1;
      setAttempts(tries);
      void refreshPro();
      if (tries >= GRANT_POLL_MAX_TRIES) clearInterval(id);
    }, GRANT_POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [dismissed, pro.hasPro, refreshPro, pollGen]);

  const phase = checkoutReturnPhase({
    active: !dismissed,
    hasPro: pro.hasPro,
    loading: pro.loading && attempts === 0,
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
    success: ['teacher.checkoutReturn.successTitle', 'teacher.checkoutReturn.successBody'],
    failure: ['teacher.checkoutReturn.failureTitle', 'teacher.checkoutReturn.failureBody'],
  }[phase];

  const dismiss = () => {
    setDismissed(true);
    clearReturnIntent(window.sessionStorage);
    const url = new URL(window.location.href);
    url.searchParams.delete('checkout');
    const next = `${pathname || url.pathname}${url.search ? url.search : ''}`;
    router.replace(next, { scroll: false });
  };

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
            className={cn(NB_SMALL, 'bg-neo-navy text-neo-cream')}
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
  }, []);
  return kind === 'trial' ? <TeacherTrialWelcome trialExpires={trialExpires} onReturnPage /> : <ProWelcomeCelebration grant={null} paid onReturnPage />;
}
