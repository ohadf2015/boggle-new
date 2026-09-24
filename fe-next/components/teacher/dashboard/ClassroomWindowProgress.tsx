/**
 * ClassroomWindowProgress — 7d/30d completion + accuracy on the dashboard.
 *
 * Free teachers get the real numbers (same honesty as last-lesson digest) and
 * a Polar CTA to /{locale}/teacher/upgrade. Full printable history stays on
 * /teacher/reports behind ProGate.
 */
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Lock, Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTeacherPro } from '@/hooks/useTeacherPro';
import { useClassroomWindowProgress } from '@/hooks/useClassroomWindowProgress';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { TEACHER_PRO_PRICE_USD } from '@/lib/education/freeTierLimits';
import { TEACHER_PRO_CHECKOUT_PATH } from '@/components/education/TeacherProCheckoutCta';
import { Stat } from '@/components/ui/Stat';
import { cn } from '@/lib/utils';
import type { ProgressWindowDays } from '@/lib/education/windowedClassroomProgress';

export interface ClassroomWindowProgressProps {
  classroomId: string;
  classroomName: string;
  className?: string;
}

export function ClassroomWindowProgress({
  classroomId,
  classroomName,
  className,
}: ClassroomWindowProgressProps) {
  const { t, language } = useLanguage();
  const { hasPro, loading: proLoading } = useTeacherPro();
  const [windowDays, setWindowDays] = useState<ProgressWindowDays>(7);
  const { progress, isLoading, error, refresh } = useClassroomWindowProgress(classroomId, windowDays);

  return (
    <section
      data-testid="classroom-window-progress"
      aria-label={t('teacher.windowProgress.regionLabel', { classroom: classroomName })}
      className={cn('space-y-3', className)}
    >
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-neo-display text-lg font-bold text-neo-white">
          {t('teacher.windowProgress.title')}
        </h2>
        <div role="group" aria-label={t('teacher.windowProgress.windowLabel')} className="flex gap-1">
          {([7, 30] as const).map((days) => (
            <button
              key={days}
              type="button"
              data-testid={`window-progress-${days}d`}
              aria-pressed={windowDays === days}
              onClick={() => setWindowDays(days)}
              className={cn(
                'min-h-11 rounded-neo border-2 px-3 font-neo-display text-xs font-black uppercase',
                windowDays === days
                  ? 'border-black bg-neo-cyan text-black shadow-hard'
                  : 'border-neo-cream/50 bg-neo-navy-light text-neo-white',
              )}
            >
              {t(days === 7 ? 'teacher.windowProgress.days7' : 'teacher.windowProgress.days30')}
            </button>
          ))}
        </div>
      </header>

      {isLoading ? (
        <div
          data-testid="window-progress-loading"
          aria-busy="true"
          className="flex min-h-20 items-center justify-center gap-2 rounded-neo border-2 border-neo-cream/50 bg-neo-navy-light text-neo-cream/80"
        >
          <Loader2 className="size-5 animate-spin" aria-hidden="true" />
          <span>{t('teacher.windowProgress.loading')}</span>
        </div>
      ) : error ? (
        <div data-testid="window-progress-error" className="rounded-neo border-2 border-neo-cream/50 p-4 text-center">
          <p className="font-bold text-neo-white">{t('teacher.windowProgress.loadError')}</p>
          <button
            type="button"
            onClick={() => void refresh()}
            className="mt-3 inline-flex min-h-11 items-center rounded-neo border-2 border-black bg-neo-cyan px-4 font-neo-display text-sm font-black text-black shadow-hard"
          >
            {t('teacher.windowProgress.retry')}
          </button>
        </div>
      ) : !progress || progress.rosterCount === 0 ? (
        <p
          data-testid="window-progress-empty"
          className="rounded-neo border-2 border-dashed border-neo-cream/50 p-4 text-center text-neo-cream/80"
        >
          {t('teacher.windowProgress.emptyNoRoster')}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Stat
              value={progress.completionPct != null ? `${progress.completionPct}%` : '—'}
              label={t('teacher.windowProgress.completion')}
              size="lg"
              className="w-full"
            />
            <Stat
              value={progress.accuracyPct != null ? `${progress.accuracyPct}%` : '—'}
              label={t('teacher.windowProgress.accuracy')}
              size="lg"
              className="w-full"
            />
          </div>
          <p className="text-xs font-bold text-neo-cream/70">
            {t('teacher.windowProgress.activeLine', {
              active: String(progress.activeCount),
              roster: String(progress.rosterCount),
            })}
          </p>
          <ul data-testid="window-progress-students" className="max-h-48 space-y-1 overflow-y-auto">
            {progress.students.slice(0, 12).map((s) => (
              <li
                key={s.studentId}
                className="flex items-center justify-between gap-2 rounded-neo border border-neo-cream/50 bg-neo-navy-light px-3 py-2 text-sm"
              >
                <span className="truncate font-bold text-neo-white">{s.name}</span>
                <span className="shrink-0 tabular-nums text-neo-cream/80">
                  {s.completed
                    ? t('teacher.windowProgress.studentStat', {
                        sessions: String(s.sessionsCompleted),
                        accuracy: s.accuracyPct != null ? `${s.accuracyPct}%` : '—',
                      })
                    : t('teacher.windowProgress.noPlay')}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      {!proLoading && !hasPro && (
        <div data-testid="window-progress-pro-cta" className="rounded-neo border-2 border-neo-lime bg-neo-navy-light p-4 text-center shadow-hard">
          <Lock className="mx-auto mb-2 h-5 w-5 text-neo-lime" aria-hidden="true" />
          <p className="mb-3 text-sm font-bold text-neo-white/85">{t('teacher.windowProgress.proCtaHint')}</p>
          <Link
            href={`/${language}${TEACHER_PRO_CHECKOUT_PATH}`}
            data-testid="window-progress-pro-link"
            onClick={() => trackGrowthEvent('landing_cta_clicked', { cta: 'window_progress_teacher_pro' })}
            className="inline-flex min-h-11 items-center rounded-neo border-2 border-black bg-neo-cyan px-5 py-2 font-black text-neo-navy shadow-hard"
          >
            {t('teacher.proGate.cta', { price: `$${TEACHER_PRO_PRICE_USD}` })}
          </Link>
        </div>
      )}
    </section>
  );
}
