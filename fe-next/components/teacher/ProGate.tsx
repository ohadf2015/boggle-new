'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Lock } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTeacherPro } from '@/hooks/useTeacherPro';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { TEACHER_PRO_PRICE_USD } from '@/lib/education/freeTierLimits';

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
 * A runtime array, not a bare type union, because the keys below are built
 * dynamically (`teacher.proGate.${feature}.title`) and a TYPE is erased before
 * any test can see it. A static key scan cannot find a template-literal key
 * either — which is exactly how `teacher.proGate.analytics.title` and `.body`
 * came to render as raw key paths on the live Assignments screen while every
 * i18n guard in the repo stayed green. `proGateCopy.contract.test.ts` iterates
 * THIS array, so adding a feature here fails that test until its copy exists in
 * all six locales.
 */
export const PRO_FEATURES = ['analytics'] as const;

export type ProFeature = (typeof PRO_FEATURES)[number];

interface ProGateProps {
  feature: ProFeature;
  children: React.ReactNode;
}

export function ProGate({ feature, children }: ProGateProps) {
  const { t, language } = useLanguage();
  const { hasPro, loading } = useTeacherPro();

  useEffect(() => {
    if (!loading && !hasPro) {
      trackGrowthEvent('iap_viewed', { source: `pro_gate_${feature}` });
    }
  }, [loading, hasPro, feature]);

  // Neither branch while the entitlement is unresolved: painting the surface then removing it
  // is the flash, painting the upsell tells a paying teacher they are not paying.
  if (loading) return null;
  if (hasPro) return <>{children}</>;

  return (
    <div className="rounded-neo border-neo border-neo-lime bg-neo-navy-light p-6 text-center shadow-hard">
      {/* The shape of what is locked. A bare heading-and-price card read as an
          empty panel in the live audit — nothing said there were per-student
          rows behind it. Placeholders, not the real rows: blur is not a security
          boundary and a free teacher's browser should not receive the data the
          gate sells. */}
      <div
        data-testid="pro-gate-preview"
        aria-hidden="true"
        className="pointer-events-none mx-auto mb-5 max-w-md select-none space-y-2 blur-[3px]"
      >
        {[0, 1].map((row) => (
          <div
            key={row}
            data-testid="pro-gate-preview-row"
            className="flex items-center gap-3 rounded-neo border-2 border-black/40 bg-neo-navy px-3 py-2"
          >
            <span className="h-3 w-8 shrink-0 rounded-full bg-neo-cyan/60" />
            <span className="h-3 flex-1 rounded-full bg-neo-white/25" />
            <span className="h-3 w-10 shrink-0 rounded-full bg-neo-lime/60" />
          </div>
        ))}
      </div>

      <Lock className="mx-auto mb-3 h-6 w-6 text-neo-lime" aria-hidden="true" />
      <h3 className="mb-2 font-neo-display text-xl font-black text-neo-white">
        {t(`teacher.proGate.${feature}.title`)}
      </h3>
      <p className="mx-auto mb-5 max-w-md text-sm font-bold leading-relaxed text-neo-white/80">
        {t(`teacher.proGate.${feature}.body`)}
      </p>
      <Link
        href={`/${language}/teacher/upgrade`}
        onClick={() => trackGrowthEvent('landing_cta_clicked', { cta: `pro_gate_${feature}` })}
        className="inline-block rounded-neo border-neo bg-neo-cyan px-6 py-3 font-black text-neo-navy shadow-hard transition-shadow hover:shadow-hard-lg"
      >
        {t('teacher.proGate.cta', { price: String(TEACHER_PRO_PRICE_USD) })}
      </Link>
    </div>
  );
}
