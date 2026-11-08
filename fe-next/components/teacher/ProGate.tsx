'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { Crown } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { useTeacherPro } from '@/hooks/useTeacherPro';
import { useCheckoutBlockedInApp } from '@/hooks/useCheckoutBlockedInApp';
import { useTeacherProCheckout } from '@/hooks/useTeacherProCheckout';
import { useStartTeacherProTrial } from '@/hooks/useStartTeacherProTrial';
import { polarTrialUx } from '@/lib/education/polarTrial';
import { TEACHER_PRO_TRIAL_DAYS } from '@/lib/education/pro/trialDays';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { TEACHER_PRO_PRICE_USD } from '@/lib/education/freeTierLimits';
import { teacherTrialStatus } from '@/lib/education/trial';
import { TrialStripRecap } from '@/components/teacher/TrialStripRecap';
import { ProFeaturePreview } from '@/components/teacher/pro/ProFeaturePreview';
import { EduMascot } from '@/components/education/EduMascot';
import { GAME_CARD } from '@/components/teacher/home/homeStyles';
import { rememberCheckoutOrigin } from '@/lib/education/checkoutReturn';
import { PRO_COPY_PARAMS } from '@/lib/education/proFeatures';
import {
  trackProGateViewed,
  trackProTrialPreviewUpgradeClicked,
  trackProTrialPreviewViewed,
  trackProUpgradeClicked,
  type ProUpgradeSource,
  type TrialCtaSource,
} from '@/lib/education/proFunnelTelemetry';

/**
 * Renders a Teacher Pro surface, or an upsell in its place for a free teacher.
 *
 * Until this existed, `has_pro` gated the two free-tier COUNTS and nothing else, so every
 * feature the Pro card advertised was already free. The count caps only bind at the moment a
 * teacher onboards a class — before they have seen the product work. This gate binds later,
 * once they have a class playing and want to know how it went, which is when $9 is an easy
 * yes rather than a toll booth.
 *
 * `feature` names the copy block AND is what lib/education/__tests__/tierLimits.parity.test.ts
 * matches Pro's advertised bullets against — a bullet nothing here can refuse is a bullet we
 * are not actually selling.
 */
/**
 * Every Pro surface this gate can stand in front of.
 *
 * ENFORCEMENT TRUTH — This array defines what is actually locked in code.
 * These are the ONLY features a Free teacher cannot access. Never advertise
 * a feature in app/[locale]/teacher/upgrade/PageClient.tsx unless it appears here.
 *
 * Current enforcement:
 * - `analytics`: /teacher/classroom/[id]/analytics (per-classroom progress dashboard)
 * - `reports`: /teacher/reports (printable class reports + post-game details)
 * - `pressureDials`: the lobby's calm-mode dials (leaderboard / timer / speed-scoring
 *   per launch). A free teacher keeps the default hyped game-show; Pro unlocks
 *   de-gameifying for anxious students. Gated inline in LobbyPressureDials —
 *   the full-page gate below would evict the whole settings sheet.
 * - `mastery`: the per-word mastery report (hardest words + student x word
 *   heatmap). Refused server-side (402) by /api/education/classroom/[id]/word-mastery,
 *   whose 402 body still carries the top 3 words and class totals as a preview.
 * - `missedPractice`: one-click spaced rounds (+1/+3/+7 days) of the class's
 *   missed words. Refused server-side (402) by .../missed-practice.
 *
 * NOT here (and never locked):
 * - customLists: free teachers create vocab lessons (19 active in prod)
 * - noAds: ad-free play is free
 * - duels: dead feature (0 usage ever) — removed from all tier lists
 *
 * A runtime array, not a bare type union, because the keys below are built
 * dynamically (`teacher.proGate.${feature}.title`) and a TYPE is erased before
 * any test can see it. A static key scan cannot find a template-literal key
 * either. `proGateCopy.contract.test.ts` iterates THIS array, so adding a
 * feature here fails that test until its copy exists in all six locales.
 */
export const PRO_FEATURES = ['analytics', 'reports', 'pressureDials', 'mastery', 'missedPractice'] as const;

export type ProFeature = (typeof PRO_FEATURES)[number];

interface ProGateProps {
  feature: ProFeature;
  children: React.ReactNode;
  /**
   * Whether the gate is actually on screen. A closed `<details>` still renders
   * its children, so on the dashboard's Tools drawer the impression fired for
   * teachers who never opened it. Defaults to true for always-visible mounts.
   */
  active?: boolean;
  /** Shown while the entitlement resolves, for pages where the gate is the whole body. */
  whileChecking?: React.ReactNode;
  /** Page heading above the lock, for pages where the gate is the whole body. */
  lockedTitle?: React.ReactNode;
  /** Upgrade button copy; takes `{{price}}`. */
  ctaKey?: string;
  /** Offer a never-trialed teacher the Polar trial instead of the paid checkout. */
  polarTrialPlacement?: TrialCtaSource;
  /** Every tone wears the chunky panel, PRO sticker and lime CTA; `calm`/`arcade` pick the trial copy, `arcade` adds the game card and mascot. */
  tone?: 'default' | 'calm' | 'arcade';
}

const OpenGate = createContext(false);

export function ProGate({ feature, children, active = true, whileChecking = null, lockedTitle = null, ctaKey = 'teacher.proGate.cta', polarTrialPlacement, tone = 'default' }: ProGateProps) {
  const arcade = tone === 'arcade';
  const calm = tone !== 'default';
  const insideOpenGate = useContext(OpenGate);
  const { t, language } = useLanguage();
  const { hasPro, loading, accessTrialExpires, accessTrialEnded, known, status, source, trialUsed } = useTeacherPro();
  const [nowMs] = useState(() => Date.now());
  // A live access trial opens every Pro surface (the server-enforced reads honour it too).
  const trial = teacherTrialStatus(accessTrialExpires, nowMs);
  const previewDaysLeft = trial && !trial.isExpired ? trial.daysLeft : null;
  const trialOver = accessTrialEnded === true || trial?.isExpired === true;
  const checkoutSource = `pro_gate_${feature}` as ProUpgradeSource;
  const paid = useTeacherProCheckout(checkoutSource);
  const polarTrial = useStartTeacherProTrial(t, language, polarTrialPlacement ?? 'reports_teaser');
  const offerTrial =
    polarTrialPlacement !== undefined &&
    known === true &&
    polarTrialUx({ hasPro, status: status ?? 'active', source, trialUsed: trialUsed === true }).offerTrial;
  const { pending, start } = paid;
  const lockAction = offerTrial ? polarTrial : paid;
  const blockedInApp = useCheckoutBlockedInApp();
  const startFromHere = (begin: () => Promise<void> | void) => {
    rememberCheckoutOrigin(window.sessionStorage, `${window.location.pathname}${window.location.search}`);
    void begin();
  };

  useEffect(() => {
    if (insideOpenGate || !active || loading || hasPro) return;
    if (previewDaysLeft !== null) {
      trackProTrialPreviewViewed({ feature, days_left: previewDaysLeft });
      return;
    }
    trackGrowthEvent('iap_viewed', { source: `pro_gate_${feature}` });
    trackProGateViewed({ feature });
  }, [insideOpenGate, active, loading, hasPro, feature, previewDaysLeft]);

  if (insideOpenGate) return <>{children}</>;

  // Neither branch while the entitlement is unresolved: painting the surface then removing it
  // is the flash, painting the upsell tells a paying teacher they are not paying.
  if (loading) return <>{whileChecking}</>;
  if (hasPro) return <OpenGate.Provider value>{children}</OpenGate.Provider>;
  if (previewDaysLeft !== null) {
    return (
      <>
        <div
          data-testid="pro-trial-preview"
          role="status"
          className={cn(
            'mb-4 flex flex-col gap-2 rounded-neo p-3 sm:flex-row sm:items-center sm:justify-between',
            'rounded-neo-lg border-[3px] border-neo-cream/50 bg-neo-navy-light shadow-hard-lg',
          )}
        >
          <div className="min-w-0">
            <p className="text-sm font-bold text-neo-white">{t('teacher.proGate.trialPreview', { days: previewDaysLeft })}</p>
            <TrialStripRecap />
          </div>
          {blockedInApp ? null : <button
            type="button"
            data-testid="pro-trial-preview-upgrade"
            disabled={pending}
            onClick={() => {
              trackProTrialPreviewUpgradeClicked({ feature, days_left: previewDaysLeft });
              startFromHere(start);
            }}
            className={cn(
              'shrink-0 rounded-neo px-4 py-2 text-sm font-black disabled:opacity-60',
              'border-2 border-neo-cream text-neo-cream hover:bg-neo-cream/10',
            )}
          >
            {t('teacher.proGate.trialPreviewCta')}
          </button>}
        </div>
        <OpenGate.Provider value>{children}</OpenGate.Provider>
      </>
    );
  }

  return (
    <>
    {lockedTitle}
    <div
      data-testid="pro-gate-lock"
      className={cn(
        arcade ? cn(GAME_CARD, 'p-4 sm:p-6') : 'rounded-neo p-4 sm:p-5',
        !arcade && 'rounded-neo-xl border-[3px] border-neo-cream/50 bg-neo-navy-light shadow-hard-xl',
      )}
    >
      <div className="grid items-center gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-6">
        {/* Sample data, never the teacher's own rows: a free browser must not receive what the gate sells. */}
        <div data-testid="pro-gate-preview" aria-hidden="true" className={cn('pointer-events-none relative select-none', arcade && 'md:pt-8')}>
          <ProFeaturePreview feature={feature} calm arcade={arcade} />
          {arcade ? (
            <EduMascot moment="pro" size={112} className="absolute -top-7 left-1/2 size-20 -translate-x-1/2 animate-edu-bob max-md:hidden" />
          ) : null}
        </div>
        {/* Phones: the pitch and its button lead, the sample sits under them instead of pushing the button off screen. */}
        <div data-testid="pro-gate-pitch" className="text-center max-md:order-first md:text-start">
          <span
            data-testid="pro-gate-pill"
            className={cn(
              'mb-2 inline-flex items-center gap-1 rounded-neo bg-neo-yellow text-neo-black',
              arcade ? 'px-1.5 py-px text-[11px] font-black sm:-rotate-2 sm:border-[3px] sm:border-neo-black sm:px-2.5 sm:py-0.5 sm:font-neo-display sm:text-sm sm:shadow-hard' : 'px-1.5 py-px text-[11px] font-black',
            )}
          >
            <Crown className="size-3" aria-hidden="true" />
            {t('eduShell.nav.pro')}
          </span>
          <h3 className={cn('mb-2 font-neo-display font-black text-neo-white', arcade ? 'text-xl sm:text-2xl' : 'text-xl')}>
            {t(`teacher.proGate.${feature}.title`)}
          </h3>
          <p className="mb-4 text-sm font-bold leading-relaxed text-neo-white/80">
            {t(`teacher.proGate.${feature}.body`)}
          </p>
          {blockedInApp ? (
            <p data-testid="pro-gate-not-in-app" className="text-sm font-bold text-neo-white/80">{t('teacher.subscription.notInApp')}</p>
          ) : (<>
          <button
            type="button"
            data-testid={`pro-gate-upgrade-${feature}`}
            disabled={lockAction.pending}
            aria-busy={lockAction.pending || undefined}
            onClick={() => {
              trackGrowthEvent('landing_cta_clicked', { cta: `pro_gate_${feature}` });
              if (!offerTrial) trackProUpgradeClicked({ feature });
              startFromHere(lockAction.start);
            }}
            className={cn(
              'inline-block rounded-neo border-neo px-6 py-3 font-black text-neo-navy shadow-hard transition-shadow hover:shadow-hard-lg disabled:opacity-60 max-sm:w-full',
              'bg-neo-lime',
              arcade && 'animate-edu-shine font-neo-display sm:text-lg hover:-translate-y-0.5 motion-reduce:hover:translate-y-0',
            )}
          >
            {offerTrial
              ? t(calm ? 'eduPlans.reports.startTrialCta' : 'eduPlans.reports.trialCta', { days: TEACHER_PRO_TRIAL_DAYS })
              : t(ctaKey, { price: `$${TEACHER_PRO_PRICE_USD}` })}
          </button>
          <p className="mt-2 text-xs font-bold text-neo-white/60">
            {offerTrial
              ? t('eduPlans.reports.trialFine', { days: TEACHER_PRO_TRIAL_DAYS, price: `$${TEACHER_PRO_PRICE_USD}` })
              : t('teacher.subscription.trustCancel')}
          </p>
          </>)}
          <p data-testid="pro-gate-honest-line" className="mt-2 text-xs font-bold text-neo-cream/80">
            {trialOver ? t('teacher.proGate.trialEnded') : t('teacher.proGate.freeKeeps', { modes: PRO_COPY_PARAMS.modes })}
          </p>
        </div>
      </div>
    </div>
    </>
  );
}
