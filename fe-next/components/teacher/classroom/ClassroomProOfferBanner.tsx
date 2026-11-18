'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTeacherPro } from '@/hooks/useTeacherPro';
import { useTeacherLiveGameRunning } from '@/hooks/useTeacherLiveGameRunning';
import { ProOfferCompactLink } from '@/components/education/results/ProOfferCompactLink';
import {
  checkoutFailureKey,
  goToPolarCheckout,
  postTeacherProCheckout,
} from '@/lib/education/postTeacherProCheckout';
import { classroomProOfferCopy } from '@/lib/education/pro/classroomProOfferCopy';
import { resolveProOffer } from '@/lib/education/pro/proOfferCopy';
import { useProOfferSlot } from '@/lib/education/pro/useProOfferSlot';
import { resultsTrialCopy } from '@/lib/education/pro/trialCtaCopy';
import { reportProOfferClick, reportProOfferImpression } from '@/lib/education/reportProCtaClick';
import { hasProAccess } from '@/lib/education/teacherPlanGate';
import { useUpsellImpression } from '@/lib/education/useUpsellImpression';
import { PRO_BANNER_CTA, ProBanner, ProShine } from '../pro/ProBanner';

/** Polar checkout `source` and offer-funnel placement for the class page. */
export const CLASSROOM_PAGE_PLACEMENT = 'classroom_page';

const DISMISS_KEY = 'lexi:classroomProOffer:dismissed';

function dismissedThisSession(): boolean {
  try {
    return window.sessionStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Teacher Pro offer on the class page, where an engaged teacher actually is.
 * Non-blocking: it never replaces the class, the roster, or Start a game.
 * Hidden for Pro (including a live access trial), while the entitlement is
 * unknown, and while a class is live — a mid-lesson tap does not convert.
 * Unknown live status fails open so a broken check never hides the offer.
 */
export function ClassroomProOfferBanner({ live }: { live: boolean | null }) {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const { loading, known, hasPro, status, trialUsed, accessTrialExpires, accessTrialEnded } = useTeacherPro();
  const [nowMs] = useState(() => Date.now());
  // Dismiss is session-only. Read it after mount so SSR and the first client
  // paint agree (a useState(sessionStorage) initializer hydration-mismatches).
  const [dismissed, setDismissed] = useState(false);
  const [dismissReady, setDismissReady] = useState(false);
  const [pending, setPending] = useState(false);
  const copy = classroomProOfferCopy(language);
  useEffect(() => {
    setDismissed(dismissedThisSession());
    setDismissReady(true);
  }, []);
  // past_due is a dunning problem (update the card), not a new checkout.
  const free =
    dismissReady &&
    !dismissed &&
    !loading &&
    known === true &&
    status !== 'past_due' &&
    !hasProAccess({ hasPro, accessTrialExpires }, nowMs);
  const show = free && live !== true;
  // Unknown live status shows the offer (fail open) but must not spend the
  // session's one full card — a later "live" answer would hide it and leave
  // every other placement compact.
  const slot = useProOfferSlot(userId, free && live === false);
  const full = live === null || slot === 'full';
  const proOffer = resolveProOffer(
    language,
    { known: known === true, trialUsed, accessTrialExpires, accessTrialEnded },
    resultsTrialCopy(language),
  );
  const cardRef = useRef<HTMLDivElement>(null);
  const offerRef = useRef({
    placement: CLASSROOM_PAGE_PLACEMENT,
    locale: language,
    cta: proOffer.cta,
    offer: proOffer.offer,
  });
  offerRef.current = {
    placement: CLASSROOM_PAGE_PLACEMENT,
    locale: language,
    cta: proOffer.cta,
    offer: proOffer.offer,
  };

  useEffect(() => {
    if (!full) return;
    reportProOfferImpression({ ...offerRef.current, stage: 'rendered' }, { userId });
  }, [full, userId]);
  useUpsellImpression(
    cardRef,
    full ? { cta: proOffer.cta, placement: CLASSROOM_PAGE_PLACEMENT } : null,
    { locale: language },
    () => reportProOfferImpression({ ...offerRef.current, stage: 'viewed' }, { userId }),
  );

  const start = useCallback(async () => {
    if (pending || !show) return;
    setPending(true);
    try {
      const result = await postTeacherProCheckout(fetch, {
        trial: proOffer.checkoutTrial,
        locale: language,
        placement: CLASSROOM_PAGE_PLACEMENT,
        source: CLASSROOM_PAGE_PLACEMENT,
      });
      if (!result.ok) {
        toast.error(t(checkoutFailureKey(result)));
        return;
      }
      goToPolarCheckout(result.url);
    } catch {
      toast.error(t('teacher.subscription.checkoutError'));
    } finally {
      setPending(false);
    }
  }, [show, language, pending, proOffer.checkoutTrial, t]);

  if (!show || (live === false && slot === null)) return null;

  const title = proOffer.title ?? copy.title;
  const dismiss = () => {
    try {
      window.sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* private mode: hide for this mount only */
    }
    setDismissed(true);
  };

  if (!full) {
    return (
      <div dir={copy.dir} data-testid="classroom-pro-offer">
        <ProOfferCompactLink
          label={proOffer.label}
          placement={CLASSROOM_PAGE_PLACEMENT}
          language={language}
          cta={proOffer.cta}
          offer={proOffer.offer}
          userId={userId}
          pending={pending}
          onActivate={() => void start()}
        />
      </div>
    );
  }

  return (
    <div ref={cardRef} dir={copy.dir} data-testid="classroom-pro-offer">
      <ProBanner
        testId="classroom-pro-offer-card"
        tone="calm"
        proLabel={t('eduShell.nav.pro')}
        title={title}
        body={copy.body}
        onDismiss={dismiss}
        dismissLabel={copy.dismiss}
        dismissTestId="classroom-pro-offer-dismiss"
        data={{ 'data-placement': CLASSROOM_PAGE_PLACEMENT, 'data-offer': proOffer.offer }}
        action={
          <button
            type="button"
            data-testid="classroom-pro-offer-cta"
            disabled={pending}
            aria-busy={pending || undefined}
            onClick={() => {
              try {
                reportProOfferClick(offerRef.current);
              } catch {
                /* analytics must never block the till */
              }
              void start();
            }}
            className={PRO_BANNER_CTA}
          >
            <ProShine />
            {pending ? <Loader2 className="relative size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : null}
            <span className="relative">{pending ? t('common.loading') : proOffer.label}</span>
          </button>
        }
      />
    </div>
  );
}

/** Class-page mount. Live status is read here so the page stays free of the hook. */
export function ClassroomProOffer() {
  const live = useTeacherLiveGameRunning(true);
  return <ClassroomProOfferBanner live={live} />;
}
