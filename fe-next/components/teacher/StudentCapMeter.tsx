/**
 * Per-classroom student count vs the free-tier cap, plus the Teacher Pro ask
 * when that classroom has actually engaged.
 *
 * The dashboard used to show a raw roster number with no limit, and the only
 * Pro strip was a dismissible banner that never named student count. The
 * conversion lever is a teacher who can see they are at (or past) the wall.
 *
 * Below the hard cap the CTA still links to /teacher/upgrade. At the cap it
 * opens the usage-gate sheet, which POSTs the same Polar checkout as the HQ
 * trial countdown.
 */
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTeacherPro } from '@/hooks/useTeacherPro';
import { FREE_TIER_LIMITS, TEACHER_PRO_PRICE_USD } from '@/lib/education/freeTierLimits';
import { hasProAccess, isFreePlanUsageBlocked } from '@/lib/education/teacherPlanGate';
import { TEACHER_PRO_MILESTONE_MIN_STUDENTS } from '@/lib/education/teacherProMilestone';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { cn } from '@/lib/utils';
import ClassLimitUpsellModal from '@/components/teacher/ClassLimitUpsellModal';

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
  const pro = useTeacherPro();
  const [nowMs] = useState(() => Date.now());
  const hasPro = hasProAccess(pro, nowMs);
  const count = studentCount ?? 0;
  const limit = FREE_TIER_LIMITS.studentsPerClass;
  const atCap = isFreePlanUsageBlocked(hasPro, count, limit);
  const showCta = !pro.loading && shouldShowStudentCapUpgradeCta(count, hasPro);
  const [gateOpen, setGateOpen] = useState(false);

  const ctaClass = 'inline-flex min-h-10 shrink-0 items-center justify-center rounded-neo border-2 border-neo-cream/60 px-3 font-neo-display text-xs font-bold text-neo-cream transition hover:border-neo-cream hover:bg-neo-cream/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-cream';
  const ctaLabel = t('academy.classes.proCta', 'Get Pro: {{price}}/mo', { price: `$${TEACHER_PRO_PRICE_USD}` });

  return (
    <div
      data-testid="student-cap-meter"
      data-at-cap={atCap ? 'true' : 'false'}
      className={cn('flex flex-col gap-1 rounded-neo border-2 border-neo-cream/35 px-3 py-1.5 text-neo-cream', className)}
    >
      <div className="flex min-h-10 flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <p data-testid="student-cap-count" className="font-neo-body text-sm font-bold tabular-nums text-neo-cream/85">
          {hasPro
            ? t('teacher.classroom.studentCountPro', '{{count}} students', { count: String(count) })
            : t('teacher.classroom.studentCap', '{{count}} / {{limit}} students', {
                count: String(count),
                limit: String(limit),
              })}
        </p>
        {showCta ? (
          atCap ? (
            <button
              type="button"
              data-testid="student-cap-upgrade-cta"
              className={ctaClass}
              onClick={() => {
                trackGrowthEvent('landing_cta_clicked', {
                  cta: 'teacher_pro',
                  source: `student_cap_${source}`,
                  studentCount: count,
                  limit,
                  atCap: true,
                });
                setGateOpen(true);
              }}
            >
              {ctaLabel}
            </button>
          ) : (
            <Link
              href={`/${language}/teacher/upgrade`}
              data-testid="student-cap-upgrade-cta"
              className={ctaClass}
              onClick={() =>
                trackGrowthEvent('landing_cta_clicked', {
                  cta: 'teacher_pro',
                  source: `student_cap_${source}`,
                  studentCount: count,
                  limit,
                  atCap: false,
                })
              }
            >
              {ctaLabel}
            </Link>
          )
        ) : null}
      </div>
      {showCta ? (
        <p data-testid="student-cap-pro-unlocks" className="flex items-start gap-1.5 font-neo-body text-xs font-semibold text-neo-cream/75">
          <span
            data-testid="student-cap-pro-badge"
            className="shrink-0 rounded-full border-2 border-neo-black bg-neo-yellow px-1.5 font-neo-display text-[0.65rem] font-black leading-4 text-neo-black"
          >
            {t('teacher.lastGame.proBadge')}
          </span>
          <span className="min-w-0">{t('academy.classes.proUnlocks', 'Pro adds class analytics + printable reports')}</span>
        </p>
      ) : null}
      <ClassLimitUpsellModal
        isOpen={gateOpen}
        onClose={() => setGateOpen(false)}
        currentCount={count}
        limit={limit}
        reason="student_limit"
      />
    </div>
  );
}

export default StudentCapMeter;
