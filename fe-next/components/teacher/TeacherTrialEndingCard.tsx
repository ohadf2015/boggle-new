'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTeacherPro } from '@/hooks/useTeacherPro';
import { PRO_BANNER_CTA, ProBanner, ProCountdownTile, ProShine } from '@/components/teacher/pro/ProBanner';
import { TEACHER_PRO_CHECKOUT_PATH } from '@/components/education/TeacherProCheckoutCta';
import { accessTrialLive } from '@/lib/education/pro/keepAfterTrialCopy';
import { resolveProOffer } from '@/lib/education/pro/proOfferCopy';
import { resultsTrialCopy, TRIAL_COPY_RTL, trialCopyBase } from '@/lib/education/pro/trialCtaCopy';
import {
  TRIAL_ENDING_CARD_PLACEMENT,
  trialEndingEndedCopy,
  trialEndingLiveCopy,
  trialEndingNeverCopy,
} from '@/lib/education/pro/trialEndingCardCopy';
import { reportProCtaClick, reportProOfferClick, reportProOfferImpression } from '@/lib/education/reportProCtaClick';
import { useUpsellImpression } from '@/lib/education/useUpsellImpression';
import { trackTeacherProUpgradeClick } from '@/lib/education/proFunnelTelemetry';
import type { TrialStatus } from '@/lib/education/trial';

/**
 * Teacher Home card for the free access trial: days left and keep class reports
 * for $9/mo, linking to the Teacher Pro checkout. Placement `trial_ending_card`.
 * In-trial wording never offers a second trial; an ended trial goes straight
 * to $9/mo; a teacher who never had a trial gets the 14-day trial.
 *
 * The dashboard only mounts this for a live or ended access trial (PageClient).
 */
export function TeacherTrialEndingCard({ trial }: { trial?: TrialStatus | null }) {
  const { language, t } = useLanguage();
  const { user } = useAuth();
  const { hasPro, loading, known, trialUsed, accessTrialExpires, accessTrialEnded } = useTeacherPro();
  const userId = user?.id ?? null;
  const live = accessTrialLive(accessTrialExpires);
  const ended = accessTrialEnded === true && !live;
  const copy =
    live && accessTrialExpires
      ? trialEndingLiveCopy(language, trial?.daysLeft ?? 0, accessTrialExpires)
      : ended
        ? trialEndingEndedCopy(language)
        : trialEndingNeverCopy(language);
  const proOffer = resolveProOffer(
    language,
    { known, trialUsed, accessTrialExpires, accessTrialEnded },
    resultsTrialCopy(language),
  );
  const visible = !loading && !hasPro && known && (live || ended);
  const cardRef = useRef<HTMLDivElement>(null);
  const offerRef = useRef({
    placement: TRIAL_ENDING_CARD_PLACEMENT,
    locale: language,
    cta: proOffer.cta,
    offer: proOffer.offer,
  });
  offerRef.current = {
    placement: TRIAL_ENDING_CARD_PLACEMENT,
    locale: language,
    cta: proOffer.cta,
    offer: proOffer.offer,
  };
  const renderedRef = useRef(false);
  useEffect(() => {
    if (!visible || renderedRef.current) return;
    renderedRef.current = true;
    reportProOfferImpression({ ...offerRef.current, stage: 'rendered' }, { userId });
  }, [visible, userId]);
  useUpsellImpression(
    cardRef,
    visible ? { cta: proOffer.cta, placement: TRIAL_ENDING_CARD_PLACEMENT } : null,
    { locale: language },
    () => reportProOfferImpression({ ...offerRef.current, stage: 'viewed' }, { userId }),
  );

  if (!visible) return null;

  const href = `/${language}${TEACHER_PRO_CHECKOUT_PATH}?source=${TRIAL_ENDING_CARD_PLACEMENT}`;
  const dir = TRIAL_COPY_RTL.has(trialCopyBase(language)) ? 'rtl' : undefined;
  const daysLeft = trial?.daysLeft ?? 0;
  const urgent = ended || (live && daysLeft <= 3);

  return (
    <div
      ref={cardRef}
      dir={dir}
      data-testid="teacher-trial-ending-card"
      data-offer={proOffer.offer}
      data-placement={TRIAL_ENDING_CARD_PLACEMENT}
    >
      <ProBanner
        testId="teacher-trial-ending"
        tone={urgent ? 'urgent' : 'calm'}
        proLabel={t('eduShell.nav.pro')}
        title={copy.title}
        body={
          <>
            <span>{copy.body}</span>
            {copy.note ? <span className="mt-1 block font-semibold text-neo-cream/70">{copy.note}</span> : null}
          </>
        }
        lead={
          live && daysLeft > 0 ? (
            <div aria-hidden="true">
              <ProCountdownTile count={daysLeft} unit="" tone={urgent ? 'urgent' : 'calm'} />
            </div>
          ) : undefined
        }
        action={
          <Link
            href={href}
            data-testid="teacher-trial-ending-cta"
            onClick={() => {
              try {
                trackTeacherProUpgradeClick({
                  page: typeof window !== 'undefined' ? window.location.pathname : `/${language}/teacher`,
                  locale: language,
                  placement: TRIAL_ENDING_CARD_PLACEMENT,
                });
                reportProCtaClick({
                  placement: TRIAL_ENDING_CARD_PLACEMENT,
                  locale: language,
                  cta: proOffer.cta,
                });
                reportProOfferClick(offerRef.current);
              } catch {
                /* analytics must never block */
              }
            }}
            className={PRO_BANNER_CTA}
          >
            <ProShine />
            {copy.cta}
          </Link>
        }
      />
    </div>
  );
}

export default TeacherTrialEndingCard;
