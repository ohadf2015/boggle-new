'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTeacherPro } from '@/hooks/useTeacherPro';
import { useCheckoutBlockedInApp } from '@/hooks/useCheckoutBlockedInApp';
import { useTeacherProCheckout } from '@/hooks/useTeacherProCheckout';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { TEACHER_PRO_PRICE_USD } from '@/lib/education/freeTierLimits';
import { teacherTrialStatus } from '@/lib/education/trial';
import { TrialStripRecap } from '@/components/teacher/TrialStripRecap';
import { ProFeaturePreview } from '@/components/teacher/pro/ProFeaturePreview';
import {
  trackProGateViewed,
  trackProTrialPreviewUpgradeClicked,
  trackProTrialPreviewViewed,
  trackProUpgradeClicked,
  type ProUpgradeSource,
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
}

const OpenGate = createContext(false);

export function ProGate({ feature, children, active = true, whileChecking = null, lockedTitle = null, ctaKey = 'teacher.proGate.cta' }: ProGateProps) {
  const insideOpenGate = useContext(OpenGate);
  const { t } = useLanguage();
  const { hasPro, loading, accessTrialExpires } = useTeacherPro();
  const [nowMs] = useState(() => Date.now());
  // A live access trial opens every Pro surface (the server-enforced reads honour it too).
  const trial = teacherTrialStatus(accessTrialExpires, nowMs);
  const previewDaysLeft = trial && !trial.isExpired ? trial.daysLeft : null;
  const checkoutSource = `pro_gate_${feature}` as ProUpgradeSource;
  const { pending, start } = useTeacherProCheckout(checkoutSource);
  const blockedInApp = useCheckoutBlockedInApp();

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
          className="mb-4 flex flex-col gap-2 rounded-neo border-neo border-neo-lime bg-neo-navy-light p-3 shadow-hard-sm sm:flex-row sm:items-center sm:justify-between"
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
              void start();
            }}
            className="shrink-0 rounded-neo border-neo bg-neo-cyan px-4 py-2 text-sm font-black text-neo-navy shadow-hard-sm disabled:opacity-60"
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
    <div className="rounded-neo border-neo border-neo-lime bg-neo-navy-light p-4 shadow-hard sm:p-5">
      <div className="grid items-center gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-6">
        {/* Sample data, never the teacher's own rows: a free browser must not receive what the gate sells. */}
        <div data-testid="pro-gate-preview" aria-hidden="true" className="pointer-events-none select-none">
          <ProFeaturePreview feature={feature} />
        </div>
        <div className="text-center md:text-start">
          <span
            data-testid="pro-gate-pill"
            className="mb-2 inline-block rounded-full border-2 border-neo-black bg-neo-lime px-2.5 py-0.5 text-xs font-black uppercase text-neo-black"
          >
            {t('teacher.subscription.proPlanName')}
          </span>
          <h3 className="mb-2 font-neo-display text-xl font-black text-neo-white">
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
            disabled={pending}
            aria-busy={pending || undefined}
            onClick={() => {
              trackGrowthEvent('landing_cta_clicked', { cta: `pro_gate_${feature}` });
              trackProUpgradeClicked({ feature });
              void start();
            }}
            className="inline-block rounded-neo border-neo bg-neo-cyan px-6 py-3 font-black text-neo-navy shadow-hard transition-shadow hover:shadow-hard-lg disabled:opacity-60"
          >
            {t(ctaKey, { price: `$${TEACHER_PRO_PRICE_USD}` })}
          </button>
          <p className="mt-2 text-xs font-bold text-neo-white/60">{t('teacher.subscription.trustCancel')}</p>
          </>)}
        </div>
      </div>
    </div>
    </>
  );
}
