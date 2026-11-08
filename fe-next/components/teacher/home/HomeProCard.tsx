'use client';

import { useEffect, useRef } from 'react';
import { Crown, Loader2, X } from 'lucide-react';
import { EduMascot } from '@/components/education/EduMascot';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { trackTrialCtaView } from '@/lib/education/proFunnelTelemetry';
import { useStartTeacherProTrial } from '@/hooks/useStartTeacherProTrial';
import { useTeacherPro } from '@/hooks/useTeacherPro';
import { resolveProOffer } from '@/lib/education/pro/proOfferCopy';
import { proCopyLines, proCopyVariant } from '@/lib/education/pro/proCopyExperiment';
import { useAuth } from '@/contexts/AuthContext';
import { resultsTrialCopy } from '@/lib/education/pro/trialCtaCopy';
import { reportProOfferClick, reportProOfferImpression } from '@/lib/education/reportProCtaClick';
import { useUpsellImpression } from '@/lib/education/useUpsellImpression';
import { useProOfferSlot } from '@/lib/education/pro/useProOfferSlot';
import { ProOfferCompactLink } from '@/components/education/results/ProOfferCompactLink';
import { cn } from '@/lib/utils';
import { NB_PANEL } from '../nb/nbStyles';
import { PRO_BANNER_CTA, ProShine } from '../pro/ProBanner';

type T = (key: string, params?: Record<string, string | number>) => string;

export type HomeProOfferKind = 'trial' | 'upgrade';

/** `source` on the cookie-free rendered / viewed / clicked server events. */
export const DASHBOARD_PRO_PLACEMENT = 'dashboard' as const;

export interface HomeProCardProps {
  /** Which ask picked the card (browser funnel only); the wording comes from resolveProOffer. */
  kind: HomeProOfferKind;
  onDismiss: () => void;
  /** False when the route client already logged this impression for the ask it picked. */
  trackImpression: boolean;
  language: string;
  t: T;
}

const CTA = cn(PRO_BANNER_CTA, 'w-full whitespace-normal px-3 text-sm leading-tight');

/**
 * The one Pro ask on Home (free teachers only). Same single-trial rules as the
 * class-ready card, results card and access-success button (resolveProOffer):
 * inside the free access trial -> keep Pro after it ($9/mo from the trial's end);
 * access trial ended -> straight $9/mo; never trialed -> the 14-day trial.
 * Every ask goes straight to Polar checkout (the server caps trial days).
 */
export function HomeProCard({ kind, onDismiss, trackImpression, language, t }: HomeProCardProps) {
  const { loading, known, trialUsed, accessTrialExpires, accessTrialEnded } = useTeacherPro();
  const proOffer = resolveProOffer(language, { known, trialUsed, accessTrialExpires, accessTrialEnded }, resultsTrialCopy(language));
  // A/B (`edu_pro_copy_v1`): the heading leads with class reports (a) or the trial (b).
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const variant = proCopyVariant(user?.id);
  // Session cap (proOfferSession.ts): the full card only if no other placement showed it this session.
  // Waits for the entitlement read: before it lands every teacher looks never-trialed, so the card
  // flashed "Start your 14-day trial" at teachers inside their free access trial and the once-per-session
  // rendered/viewed twins locked in offer=trial (every dashboard impression, Nov 2026).
  const slot = useProOfferSlot(userId, !loading);
  const full = slot === 'full';
  const lines = proCopyLines(language, variant, proOffer, { accessTrialExpires, placement: DASHBOARD_PRO_PLACEMENT });
  const trial = useStartTeacherProTrial(t, language, 'dashboard_trial_offer', { trial: proOffer.checkoutTrial });
  const cardRef = useRef<HTMLElement>(null);
  const offerRef = useRef({ placement: DASHBOARD_PRO_PLACEMENT, locale: language, cta: proOffer.cta, offer: proOffer.offer });
  offerRef.current = { placement: DASHBOARD_PRO_PLACEMENT, locale: language, cta: proOffer.cta, offer: proOffer.offer };
  useEffect(() => {
    if (!trackImpression || !full) return;
    trackGrowthEvent('iap_viewed', { product: 'teacher_pro', source: 'home_rail', event_type: 'impression' });
    if (kind === 'trial') trackTrialCtaView({ source: 'dashboard_trial_offer' });
  }, [trackImpression, kind, full]);
  // Cookie-free server twins (browser PostHog is consent-gated): rendered once the full card
  // shows, viewed at 50% on screen; each at most once per session (proOfferSession.ts).
  useEffect(() => {
    if (!full) return;
    reportProOfferImpression({ ...offerRef.current, stage: 'rendered' }, { userId });
  }, [full, userId]);
  useUpsellImpression(cardRef, full ? { cta: proOffer.cta, placement: DASHBOARD_PRO_PLACEMENT } : null, { locale: language }, () =>
    reportProOfferImpression({ ...offerRef.current, stage: 'viewed' }, { userId }),
  );

  if (slot === null) return null;
  if (!full) {
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
        className="text-neo-cream"
      />
    );
  }

  return (
    <section ref={cardRef} data-testid="home-pro-card" data-kind={kind} data-offer={proOffer.offer} data-variant={variant} aria-labelledby="home-pro-title" className={cn(NB_PANEL, 'relative mt-3 p-3 pt-5')}>
      <span aria-hidden="true" className="edu-stripes pointer-events-none absolute inset-x-0 top-0 h-2 rounded-t-[13px] bg-neo-yellow" />
      <button
        type="button"
        data-testid="home-pro-dismiss"
        onClick={onDismiss}
        aria-label={t('eduShell.pro.dismiss')}
        className="absolute end-0.5 top-2 z-10 grid size-11 place-items-center rounded-neo text-neo-cream/70 transition-colors hover:bg-neo-cream/10 hover:text-neo-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-cream"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
      <span data-testid="home-pro-badge" className="absolute -top-3.5 start-3 inline-flex -rotate-3 items-center gap-1 rounded-neo border-[3px] border-neo-black bg-neo-yellow px-2 py-0.5 font-neo-display text-xs font-black uppercase text-neo-black shadow-hard">
        <Crown className="size-3.5" aria-hidden="true" />
        {t('eduShell.nav.pro')}
      </span>
      <div className="flex items-center gap-3 pe-9">
        <EduMascot moment="pro" size={48} className="size-12 shrink-0 animate-edu-bob max-lg:hidden" />
        <h2 id="home-pro-title" className="min-w-0 font-neo-display text-base font-black leading-snug text-neo-cream">
          {lines.title}
        </h2>
      </div>
      <div className="mt-3 flex flex-col gap-1.5">
        <button
          type="button"
          data-testid="home-pro-cta"
          data-offer={proOffer.offer}
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
          className={CTA}
        >
          <ProShine />
          {trial.pending ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : null}
          {proOffer.label}
        </button>
        <p data-testid="home-pro-note" className="text-center font-neo-body text-xs font-semibold text-neo-cream/70">{proOffer.note}</p>
      </div>
    </section>
  );
}

export default HomeProCard;
