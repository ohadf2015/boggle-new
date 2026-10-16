'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Crown, Loader2, Lock, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EduMascot } from '@/components/education/EduMascot';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { trackTrialCtaView } from '@/lib/education/proFunnelTelemetry';
import { useStartTeacherProTrial } from '@/hooks/useStartTeacherProTrial';
import { TEACHER_PRO_PRICE_USD } from '@/lib/education/freeTierLimits';
import { PANEL } from './homeStyles';

type T = (key: string, params?: Record<string, string | number>) => string;

export type HomeProOfferKind = 'trial' | 'upgrade';

export interface HomeProCardProps {
  /** `trial` starts the 14-day Polar trial in place; `upgrade` opens the plans page. */
  kind: HomeProOfferKind;
  href: string;
  onDismiss: () => void;
  /** False when the route client already logged this impression for the ask it picked. */
  trackImpression: boolean;
  language: string;
  t: T;
}

const CTA =
  'inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-neo border-[3px] border-neo-black bg-neo-yellow px-4 font-neo-display text-base font-black text-neo-black shadow-hard-sm transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-hard active:scale-[0.97] disabled:opacity-60 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy';

/** The one Pro ask on Home (free teachers only): what Pro shows after a game, blurred behind a lock. */
export function HomeProCard({ kind, href, onDismiss, trackImpression, language, t }: HomeProCardProps) {
  const trial = useStartTeacherProTrial(t, language, 'dashboard_trial_offer');
  useEffect(() => {
    if (!trackImpression) return;
    trackGrowthEvent('iap_viewed', { product: 'teacher_pro', source: 'home_rail', event_type: 'impression' });
    if (kind === 'trial') trackTrialCtaView({ source: 'dashboard_trial_offer' });
  }, [trackImpression, kind]);

  return (
    <section data-testid="home-pro-card" data-kind={kind} aria-labelledby="home-pro-title" className={cn(PANEL, 'relative overflow-hidden border-neo-yellow p-4')}>
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
            {t('eduShell.pro.title')}
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

      <div aria-hidden="true" className="relative mt-3 rounded-neo border-[2px] border-neo-cream/60 bg-neo-navy p-2">
        <div className="flex flex-col gap-1.5 blur-[3px]">
          {[72, 54, 38].map((w) => (
            <div key={w} className="flex items-center gap-2">
              <span className="size-5 rounded-full bg-neo-cyan/60" />
              <span className="h-2 flex-1 rounded-full bg-neo-cream/15">
                <span className="block h-2 rounded-full bg-neo-pink/70" style={{ width: `${w}%` }} />
              </span>
            </div>
          ))}
        </div>
        <span className="absolute inset-0 grid place-items-center">
          <Lock className="size-5 text-neo-yellow" />
        </span>
      </div>

      <div className="mt-3">
        {kind === 'trial' ? (
          <button type="button" data-testid="home-pro-cta" disabled={trial.pending} aria-busy={trial.pending || undefined} onClick={() => void trial.start()} className={CTA}>
            {trial.pending ? <Loader2 className="size-5 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Crown className="size-5" aria-hidden="true" />}
            {t('eduShell.pro.trialCta')}
          </button>
        ) : (
          <Link href={href} data-testid="home-pro-cta" className={CTA}>
            <Crown className="size-5" aria-hidden="true" />
            {t('eduShell.pro.cta')}
          </Link>
        )}
        {kind === 'trial' ? <p className="mt-1.5 text-center font-neo-body text-xs text-neo-cream/70">{t('eduShell.pro.trialFine', { price: `$${TEACHER_PRO_PRICE_USD}` })}</p> : null}
      </div>
    </section>
  );
}

export default HomeProCard;
