'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Lock } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTeacherPro } from '@/hooks/useTeacherPro';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { TEACHER_PRO_PRICE_USD } from '@/lib/education/freeTierLimits';
import AnalyticsDashboardPreview from './analytics/AnalyticsDashboardPreview';

/**
 * Renders a Teacher Pro surface, or an upsell in its place for a free teacher.
 *
 * Until this existed, `has_pro` gated the two free-tier COUNTS and nothing else, so every
 * feature the Pro card advertised was already free. The count caps only bind at the moment a
 * teacher onboards a class — before they have seen the product work. This gate binds later,
 * once they have a class playing and want to know how it went, which is when $9 is an easy
 * yes rather than a toll booth.
 *
 * In preview mode, instead of a lock card, renders a REAL preview of the feature showing
 * the teacher's actual data truncated/limited — enough to be valuable and desirable,
 * without showing the full deep views. This removes the "dead end" problem: a free teacher
 * now sees their own data and can decide if the full version is worth $9.
 *
 * The preview is HONEST: paid content (student tables, charts, heatmaps) are genuinely
 * absent from the DOM, not hidden with CSS. Free teachers get only headline metrics that
 * are genuinely useful but incomplete without the full version.
 *
 * `feature` names the copy block AND is what lib/education/__tests__/tierLimits.parity.test.ts
 * matches Pro's advertised bullets against — a bullet nothing here can refuse is a bullet we
 * are not actually selling.
 */
export type ProFeature = 'analytics';

interface ProGateProps {
  feature: ProFeature;
  children: React.ReactNode;
  /** When true, render a preview of the feature for free teachers instead of a lock card. */
  preview?: boolean;
  /** Classroom ID - required when preview=true and feature='analytics' */
  classroomId?: string;
  /** Callback when viewing filtered students - passed to preview */
  onViewStudents?: (filter: 'struggling') => void;
  /** Callback when creating review lesson - passed to preview */
  onCreateReviewLesson?: (words: string[]) => void;
}

export function ProGate({
  feature,
  children,
  preview = false,
  classroomId,
  onViewStudents,
  onCreateReviewLesson,
}: ProGateProps) {
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

  // Preview mode: show the teacher's real data with the upsell below/after
  if (preview) {
    return (
      <div className="space-y-6">
        {/* Real preview of the feature - headline metrics only, no paid content */}
        {feature === 'analytics' && classroomId && (
          <AnalyticsDashboardPreview
            classroomId={classroomId}
            onViewStudents={onViewStudents}
            onCreateReviewLesson={onCreateReviewLesson}
          />
        )}

        {/* Upsell card below the preview */}
        <div className="rounded-neo border-neo border-neo-lime bg-neo-navy-light p-6 text-center shadow-hard">
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
      </div>
    );
  }

  // Default mode: lock card only (no preview)
  return (
    <div className="rounded-neo border-neo border-neo-lime bg-neo-navy-light p-6 text-center shadow-hard">
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
