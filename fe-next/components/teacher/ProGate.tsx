'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTeacherPro } from '@/hooks/useTeacherPro';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { TEACHER_PRO_PRICE_USD } from '@/lib/education/freeTierLimits';
import { ProFeaturePreview } from '@/components/teacher/pro/ProFeaturePreview';

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
}

export function ProGate({ feature, children, active = true }: ProGateProps) {
  const { t, language } = useLanguage();
  const { hasPro, loading } = useTeacherPro();

  useEffect(() => {
    if (active && !loading && !hasPro) {
      trackGrowthEvent('iap_viewed', { source: `pro_gate_${feature}` });
    }
  }, [active, loading, hasPro, feature]);

  // Neither branch while the entitlement is unresolved: painting the surface then removing it
  // is the flash, painting the upsell tells a paying teacher they are not paying.
  if (loading) return null;
  if (hasPro) return <>{children}</>;

  return (
    <div className="rounded-neo border-neo border-neo-lime bg-neo-navy-light p-4 shadow-hard sm:p-5">
      <div className="grid items-center gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-6">
        {/* Sample data, never the teacher's own rows: a free browser must not receive what the gate sells. */}
        <div data-testid="pro-gate-preview" aria-hidden="true" className="pointer-events-none select-none">
          <ProFeaturePreview feature={feature} />
        </div>
        <div className="text-center md:text-start">
          <h3 className="mb-2 font-neo-display text-xl font-black text-neo-white">
            {t(`teacher.proGate.${feature}.title`)}
          </h3>
          <p className="mb-4 text-sm font-bold leading-relaxed text-neo-white/80">
            {t(`teacher.proGate.${feature}.body`)}
          </p>
          <Link
            href={`/${language}/teacher/upgrade`}
            onClick={() => trackGrowthEvent('landing_cta_clicked', { cta: `pro_gate_${feature}` })}
            className="inline-block rounded-neo border-neo bg-neo-cyan px-6 py-3 font-black text-neo-navy shadow-hard transition-shadow hover:shadow-hard-lg"
          >
            {t('teacher.proGate.cta', { price: `$${TEACHER_PRO_PRICE_USD}` })}
          </Link>
          <p className="mt-2 text-xs font-bold text-neo-white/60">{t('teacher.subscription.trustCancel')}</p>
        </div>
      </div>
    </div>
  );
}
