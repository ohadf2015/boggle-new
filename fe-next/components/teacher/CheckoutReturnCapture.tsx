'use client';

import { useEffect, useLayoutEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTeacherPro } from '@/hooks/useTeacherPro';
import {
  GRANT_POLL_INTERVAL_MS,
  GRANT_POLL_MAX_TRIES,
  checkoutReturnPhase,
  clearReturnIntent,
  isCheckoutSuccessSearch,
  readReturnIntent,
  rememberReturnIntent,
  takeCheckoutOrigin,
} from '@/lib/education/checkoutReturn';
import { trackEduProCheckoutReturnLanded } from '@/lib/education/proFunnelTelemetry';
import { ProWelcomeCelebration } from '@/components/teacher/ProWelcomeCelebration';

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

  useLayoutEffect(() => {
    const search = window.location.search;
    if (isCheckoutSuccessSearch(search)) {
      rememberReturnIntent(window.sessionStorage);
      trackEduProCheckoutReturnLanded();
      const origin = takeCheckoutOrigin(window.sessionStorage, {
        locale: language,
        currentPath: `${window.location.pathname}${search}`,
      });
      if (origin) router.replace(origin, { scroll: false });
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
  const [attempts, setAttempts] = useState(0);
  const [pollGen, setPollGen] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (dismissed || pro.hasPro) return;
    let tries = 0;
    const id = setInterval(() => {
      tries += 1;
      setAttempts(tries);
      void pro.refresh();
      if (tries >= GRANT_POLL_MAX_TRIES) clearInterval(id);
    }, GRANT_POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [dismissed, pro.hasPro, pro.refresh, pollGen]);

  const phase = checkoutReturnPhase({
    active: !dismissed,
    hasPro: pro.hasPro,
    loading: pro.loading && attempts === 0,
    attempts,
  });
  if (phase === 'idle') return null;
  // Off the home page nobody else celebrates the upgrade, so the unlocked page does.
  if (phase === 'success' && pathname && !TEACHER_HOME.test(pathname)) return <PaidOnThisPage />;

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

  const tone = phase === 'failure' ? 'bg-neo-pink' : phase === 'success' ? 'bg-neo-lime' : 'bg-neo-cyan';

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="checkout-return-status"
      data-phase={phase}
      dir={language === 'he' ? 'rtl' : 'ltr'}
      className={`fixed inset-x-0 top-0 z-[120] border-b-[3px] border-black px-4 py-3 text-black ${tone}`}
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="font-black">{t(copy[0])}</p>
          <p className="text-sm font-bold">{t(copy[1])}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          {phase === 'failure' ? (
            <button
              type="button"
              data-testid="checkout-return-retry"
              className="border-2 border-black bg-neo-cream px-3 py-1.5 text-sm font-black"
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
            className="border-2 border-black bg-white px-3 py-1.5 text-sm font-black"
            onClick={dismiss}
          >
            {t('teacher.checkoutReturn.close')}
          </button>
        </div>
      </div>
    </div>
  );
}

function PaidOnThisPage() {
  useEffect(() => {
    clearReturnIntent(window.sessionStorage);
  }, []);
  return <ProWelcomeCelebration grant={null} paid />;
}
