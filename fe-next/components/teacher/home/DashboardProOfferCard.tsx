'use client';

import { useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTeacherPro } from '@/hooks/useTeacherPro';
import { useStartTeacherProTrial } from '@/hooks/useStartTeacherProTrial';
import { resolveProOffer } from '@/lib/education/pro/proOfferCopy';
import { proCopyLines, proCopyVariant } from '@/lib/education/pro/proCopyExperiment';
import { resultsTrialCopy } from '@/lib/education/pro/trialCtaCopy';
import { reportProOfferClick, reportProOfferImpression } from '@/lib/education/reportProCtaClick';
import { showProCardAsk, trialCardAskTiming } from '@/lib/education/pro/accessTrialCheckout';
import { useProOfferSlot } from '@/lib/education/pro/useProOfferSlot';
import { useUpsellImpression } from '@/lib/education/useUpsellImpression';
import { ProOfferCompactLink } from '@/components/education/results/ProOfferCompactLink';
import { DashboardClassInsightLink } from './DashboardClassInsightLink';
import { PRO_BANNER_CTA, ProBanner, ProShine } from '../pro/ProBanner';

type T = (key: string, params?: Record<string, string | number>) => string;

/** Cookie-free server twin `source`. Same name the dashboard offer used before it stopped mounting. */
export const DASHBOARD_PRO_PLACEMENT = 'dashboard' as const;

/**
 * Teacher Home's Pro offer. Mounting it is what fires `edu_pro_offer_rendered`;
 * half on screen fires `edu_pro_offer_impression`. The button starts Polar
 * checkout (trial or $9/mo — resolveProOffer decides, never a second trial).
 */
export interface DashboardClassInsight {
  classroomId: string;
  className: string;
  /** Distinct games this class ran in the last 7 days; absent or 0 keeps the generic title. */
  weekGames?: number;
}

export function DashboardProOfferCard({ language, t, insight }: { language: string; t: T; insight?: DashboardClassInsight }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const { loading, known, trialUsed, accessTrialExpires, accessTrialEnded } = useTeacherPro();
  // No card ask while the free access window has days to spare: the measured
  // conversion of that ask is 0% (both Oct 2026 trial checkouts abandoned at
  // the card wall minutes after approval). The ask returns for the last days.
  const cardAskOpen = showProCardAsk(trialCardAskTiming(accessTrialExpires));
  const proOffer = resolveProOffer(language, { known, trialUsed, accessTrialExpires, accessTrialEnded }, resultsTrialCopy(language));
  const variant = proCopyVariant(userId);
  const lines = proCopyLines(language, variant, proOffer, { accessTrialExpires, placement: DASHBOARD_PRO_PLACEMENT });
  const slot = useProOfferSlot(userId, !loading && known);
  const full = slot === 'full';
  const cardRef = useRef<HTMLDivElement>(null);
  const offerRef = useRef({ placement: DASHBOARD_PRO_PLACEMENT, locale: language, cta: proOffer.cta, offer: proOffer.offer });
  offerRef.current = { placement: DASHBOARD_PRO_PLACEMENT, locale: language, cta: proOffer.cta, offer: proOffer.offer };
  const trial = useStartTeacherProTrial(t, language, 'dashboard_trial_offer', { trial: proOffer.checkoutTrial });

  useEffect(() => {
    if (!full || !cardAskOpen) return;
    reportProOfferImpression({ ...offerRef.current, stage: 'rendered' }, { userId });
  }, [full, userId, cardAskOpen]);
  useUpsellImpression(
    cardRef,
    full && cardAskOpen ? { cta: proOffer.cta, placement: DASHBOARD_PRO_PLACEMENT } : null,
    { locale: language },
    () => reportProOfferImpression({ ...offerRef.current, stage: 'viewed' }, { userId }),
  );

  if (!cardAskOpen) return null;

  if (!full) {
    if (slot !== 'compact') return null;
    return (
      <ProOfferCompactLink
        label={proOffer.label}
        placement={DASHBOARD_PRO_PLACEMENT}
        language={language}
        cta={proOffer.cta}
        offer={proOffer.offer}
        userId={userId}
        variant={variant}
        pending={trial.pending}
        onActivate={() => void trial.start()}
      />
    );
  }

  return (
    <div ref={cardRef}>
      <ProBanner
        testId="dashboard-pro-offer"
        proLabel={t('eduShell.nav.pro')}
        title={
          insight?.weekGames
            ? t('teacher.weekInsight.homeTitleGames', { name: `\u2068${insight.className}\u2069`, count: insight.weekGames })
            : lines.title
        }
        body={lines.body}
        data={{ 'data-placement': DASHBOARD_PRO_PLACEMENT, 'data-offer': proOffer.offer, 'data-variant': variant }}
      >
        <button
          type="button"
          data-testid="dashboard-pro-offer-cta"
          disabled={trial.pending}
          aria-busy={trial.pending || undefined}
          onClick={() => {
            try {
              reportProOfferClick(offerRef.current);
            } catch {
              /* analytics must never block the till */
            }
            void trial.start();
          }}
          className={`${PRO_BANNER_CTA} mt-3 w-full whitespace-normal px-3 text-sm leading-tight`}
        >
          <ProShine />
          {trial.pending ? <Loader2 className="relative size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : null}
          <span className="relative">{proOffer.label}</span>
        </button>
        {insight ? (
          <DashboardClassInsightLink classroomId={insight.classroomId} language={language} label={t('teacher.weekInsight.homeCta')} />
        ) : null}
      </ProBanner>
    </div>
  );
}
