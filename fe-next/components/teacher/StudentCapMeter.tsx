/**
 * Per-classroom student count vs the free-tier cap, plus the Teacher Pro ask
 * when that classroom has actually engaged.
 *
 * The dashboard used to show a raw roster number with no limit, and the only
 * Pro strip was a dismissible banner that never named student count. The
 * conversion lever is a teacher who can see they are at (or past) the wall.
 *
 * CTA fires at the existing engagement milestone (>=3 students) OR at the
 * hard cap (`FREE_TIER_LIMITS.studentsPerClass`). Polar checkout stays on
 * /teacher/upgrade — do not POST /api/subscription/checkout from here.
 */
'use client';

import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTeacherPro } from '@/hooks/useTeacherPro';
import { FREE_TIER_LIMITS, TEACHER_PRO_PRICE_USD } from '@/lib/education/freeTierLimits';
import { TEACHER_PRO_MILESTONE_MIN_STUDENTS } from '@/lib/education/teacherProMilestone';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { cn } from '@/lib/utils';

export function shouldShowStudentCapUpgradeCta(studentCount: number, hasPro: boolean): boolean {
  if (hasPro) return false;
  const count = studentCount ?? 0;
  return count >= TEACHER_PRO_MILESTONE_MIN_STUDENTS || count >= FREE_TIER_LIMITS.studentsPerClass;
}

export interface StudentCapMeterProps {
  studentCount: number;
  className?: string;
  /** Distinguishes dashboard vs classroom-card impressions. */
  source?: 'dashboard' | 'classroom_card';
}

export function StudentCapMeter({
  studentCount,
  className,
  source = 'dashboard',
}: StudentCapMeterProps) {
  const { t, language } = useLanguage();
  const { hasPro, loading } = useTeacherPro();
  const count = studentCount ?? 0;
  const limit = FREE_TIER_LIMITS.studentsPerClass;
  const atCap = !hasPro && count >= limit;
  const showCta = !loading && shouldShowStudentCapUpgradeCta(count, hasPro);

  return (
    <div
      data-testid="student-cap-meter"
      data-at-cap={atCap ? 'true' : 'false'}
      className={cn(
        'rounded-neo border-2 border-black bg-neo-cream px-3 py-2 text-black shadow-hard-sm',
        className,
      )}
    >
      <p
        data-testid="student-cap-count"
        className="font-neo-display text-sm font-black uppercase tracking-wide tabular-nums"
      >
        {hasPro
          ? t('teacher.classroom.studentCountPro', '{{count}} students', { count: String(count) })
          : t('teacher.classroom.studentCap', '{{count}} / {{limit}} students', {
              count: String(count),
              limit: String(limit),
            })}
      </p>
      {showCta ? (
        <Link
          href={`/${language}/teacher/upgrade`}
          data-testid="student-cap-upgrade-cta"
          className="mt-2 inline-flex min-h-11 items-center justify-center rounded-neo border-2 border-black bg-neo-cyan px-3 py-2 font-neo-display text-xs font-black uppercase text-black shadow-hard-sm transition-all hover:-translate-y-0.5 hover:shadow-hard"
          onClick={() =>
            trackGrowthEvent('landing_cta_clicked', {
              cta: 'teacher_pro',
              source: `student_cap_${source}`,
              studentCount: count,
              limit,
              atCap,
            })
          }
        >
          {t('teacher.proGate.cta', { price: `$${TEACHER_PRO_PRICE_USD}` })}
        </Link>
      ) : null}
    </div>
  );
}

export default StudentCapMeter;
