'use client';

import { useEffect, useRef } from 'react';
import { Crown, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EduMascot } from '@/components/education/EduMascot';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { trackTrialCtaView } from '@/lib/education/proFunnelTelemetry';
import { useStartTeacherProTrial } from '@/hooks/useStartTeacherProTrial';
import { useTeacherPro } from '@/hooks/useTeacherPro';
import { resolveProOffer } from '@/lib/education/pro/proOfferCopy';
import { resultsTrialCopy } from '@/lib/education/pro/trialCtaCopy';
import { reportProOfferClick, reportProOfferImpression } from '@/lib/education/reportProCtaClick';
import { useUpsellImpression } from '@/lib/education/useUpsellImpression';
import { PANEL } from './homeStyles';

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

const CTA =
  'inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-neo border-[3px] border-neo-black bg-neo-yellow px-4 font-neo-display text-base font-black text-neo-black shadow-hard-sm transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-hard active:scale-[0.97] disabled:opacity-60 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy';

/**
 * The one Pro ask on Home (free teachers only). Same single-trial rules as the
 * class-ready card, results card and access-success button (resolveProOffer):
 * inside the free access trial -> keep Pro after it ($9/mo from the trial's end);
 * access trial ended -> straight $9/mo; never trialed -> the 14-day trial.
 * Every ask goes straight to Polar checkout (the server caps trial days).
 */
export function HomeProCard({ kind, onDismiss, trackImpression, language, t }: HomeProCardProps) {
  const { known, trialUsed, accessTrialExpires, accessTrialEnded } = useTeacherPro();
  const proOffer = resolveProOffer(language, { known, trialUsed, accessTrialExpires, accessTrialEnded }, resultsTrialCopy(language));
  const trial = useStartTeacherProTrial(t, language, 'dashboard_trial_offer', { trial: proOffer.checkoutTrial });
  const cardRef = useRef<HTMLElement>(null);
  const offerRef = useRef({ placement: DASHBOARD_PRO_PLACEMENT, locale: language, cta: proOffer.cta, offer: proOffer.offer });
  offerRef.current = { placement: DASHBOARD_PRO_PLACEMENT, locale: language, cta: proOffer.cta, offer: proOffer.offer };
  useEffect(() => {
    if (!trackImpression) return;
    trackGrowthEvent('iap_viewed', { product: 'teacher_pro', source: 'home_rail', event_type: 'impression' });
    if (kind === 'trial') trackTrialCtaView({ source: 'dashboard_trial_offer' });
  }, [trackImpression, kind]);
  // Cookie-free server twins (browser PostHog is consent-gated): rendered on mount, viewed at 50% on screen.
  useEffect(() => {
    reportProOfferImpression({ ...offerRef.current, stage: 'rendered' });
  }, []);
  useUpsellImpression(cardRef, { cta: proOffer.cta, placement: DASHBOARD_PRO_PLACEMENT }, { locale: language }, () =>
    reportProOfferImpression({ ...offerRef.current, stage: 'viewed' }),
  );

  return (
    <section ref={cardRef} data-testid="home-pro-card" data-kind={kind} data-offer={proOffer.offer} aria-labelledby="home-pro-title" className={cn(PANEL, 'relative overflow-hidden border-neo-yellow p-4')}>
      <button
        type="button"
        data-testid="home-pro-dismiss"
        onClick={onDismiss}
        aria-label={t('eduShell.pro.dismiss')}
        className="absolute end-1.5 top-1.5 z-10 grid size-10 place-items-center rounded-neo text-neo-cream/70 transition-colors hover:bg-neo-cream/10 hover:text-neo-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-cyan"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
      <div className="flex items-start gap-3 pe-6">
        <EduMascot moment="pro" size={80} className="size-20 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="inline-flex items-center gap-1 font-neo-display text-xs font-black uppercase tracking-wide text-neo-yellow">
            <Crown className="size-3.5" aria-hidden="true" />
            {t('eduShell.nav.pro')}
          </p>
          <h2 id="home-pro-title" className="mt-1 font-neo-display text-xl font-black leading-tight text-neo-cream">
            {proOffer.title ?? t('eduShell.pro.title')}
          </h2>
        </div>
      </div>
      <ul className="mt-2 flex flex-col gap-1 font-neo-body text-sm text-neo-cream/85">
        {(['struggled', 'reteach', 'classes'] as const).map((k) => (
          <li key={k} className="flex gap-2">
            <span aria-hidden="true" className="mt-1.5 size-1.5 shrink-0 rounded-full bg-neo-yellow" />
            {t(`eduShell.pro.points.${k}`)}
          </li>
        ))}
      </ul>

      <div className="mt-3">
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
          {trial.pending ? <Loader2 className="size-5 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Crown className="size-5" aria-hidden="true" />}
          {proOffer.label}
        </button>
        <p data-testid="home-pro-note" className="mt-1.5 text-center font-neo-body text-xs text-neo-cream/70">{proOffer.note}</p>
      </div>
    </section>
  );
}

export default HomeProCard;
