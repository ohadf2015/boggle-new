'use client';

import { m, useReducedMotion } from 'framer-motion';
import { ChevronRight, Minus, Sparkle, TrendingDown, TrendingUp, type LucideIcon } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { cn } from '@/lib/utils';
import type { StudentInsight, StudentTrend } from './classInsights';

const TREND: Record<StudentTrend, { icon: LucideIcon; tone: string }> = {
  up: { icon: TrendingUp, tone: 'text-neo-lime' },
  down: { icon: TrendingDown, tone: 'text-neo-pink' },
  steady: { icon: Minus, tone: 'text-neo-cream/70' },
  new: { icon: Sparkle, tone: 'text-neo-cyan' },
};

function barTone(accuracy: number, goal: number) {
  if (accuracy >= goal) return 'bg-neo-lime';
  if (accuracy >= goal / 2) return 'bg-neo-yellow';
  return 'bg-neo-pink';
}

function StudentRow({
  student,
  name,
  goal,
  index,
  onOpen,
}: {
  student: StudentInsight;
  name: string;
  goal: number;
  index: number;
  onOpen?: () => void;
}) {
  const { t } = useLanguage();
  const reduceMotion = useReducedMotion();
  const trend = TREND[student.trend];
  const TrendIcon = trend.icon;
  const Tag = onOpen ? 'button' : 'div';

  return (
    <m.li
      initial={reduceMotion ? false : { y: 6 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 520, damping: 32, delay: Math.min(index, 8) * 0.03 }}
    >
      <Tag
        {...(onOpen ? { type: 'button' as const, onClick: onOpen } : {})}
        data-testid="report-student-row"
        className={cn(
          'grid w-full grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-x-2.5 rounded-neo border-2 bg-neo-navy px-2.5 py-2 text-start',
          student.belowGoal ? 'border-neo-pink' : 'border-neo-cream/50',
          onOpen &&
            'transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-hard-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-cyan active:translate-y-0 motion-reduce:transition-none',
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            'grid size-8 place-items-center rounded-neo border-2 border-black font-neo-display text-sm font-black text-neo-black',
            student.belowGoal ? 'bg-neo-pink' : 'bg-neo-lime',
          )}
        >
          {name.trim().charAt(0).toUpperCase() || '?'}
        </span>
        <span className="min-w-0">
          <span className="flex min-w-0 items-center gap-1.5">
            <span dir="auto" className="truncate font-neo-display text-base font-bold text-neo-white">
              {name}
            </span>
            <TrendIcon className={cn('size-4 shrink-0', trend.tone)} aria-label={t(`eg2Rep.report.trend.${student.trend}`)} />
          </span>
          <span className="relative mt-1 block h-2 overflow-hidden rounded-full bg-neo-white/10">
            <m.span
              aria-hidden="true"
              className={cn('absolute inset-y-0 start-0 rounded-full', barTone(student.accuracy, goal))}
              initial={reduceMotion ? false : { width: 0 }}
              animate={{ width: `${Math.max(3, student.accuracy)}%` }}
              transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1], delay: 0.08 + Math.min(index, 8) * 0.04 }}
            />
            <span aria-hidden="true" className="absolute inset-y-0 w-0.5 bg-neo-white/70" style={{ insetInlineStart: `${goal}%` }} />
          </span>
          {student.missedWords.length > 0 ? (
            <span className="mt-1 flex flex-wrap items-center gap-1">
              <span className="sr-only">{t('eg2Rep.report.missesLabel')}</span>
              {student.missedWords.map((w) => (
                <span
                  key={w}
                  data-testid="report-student-missed"
                  dir="auto"
                  className="rounded-neo border border-neo-pink bg-neo-navy-light px-1.5 text-[11px] font-bold text-neo-white"
                >
                  {w}
                </span>
              ))}
            </span>
          ) : (
            <span className="mt-1 block text-[11px] font-bold text-neo-lime">{t('eg2Rep.report.noMisses')}</span>
          )}
        </span>
        <span className="flex items-center gap-1">
          <span className="font-neo-display text-lg font-black text-neo-white tabular-nums">{student.accuracy}%</span>
          {onOpen && <DirectionalIcon icon={ChevronRight} className="size-4 text-neo-cream/60" />}
        </span>
      </Tag>
    </m.li>
  );
}

export function StudentInsightList({
  students,
  names,
  goal,
  fallbackName,
  onStudentClick,
}: {
  students: StudentInsight[];
  names: Record<string, string>;
  goal: number;
  fallbackName: string;
  onStudentClick?: (studentId: string, name: string) => void;
}) {
  const { t } = useLanguage();
  const below = students.filter((s) => s.belowGoal);
  const onTrack = students.filter((s) => !s.belowGoal);
  const nameOf = (id: string) => names[id] ?? fallbackName;

  const group = (list: StudentInsight[], offset: number) => (
    <ol className="grid gap-1.5 sm:grid-cols-2">
      {list.map((s, i) => (
        <StudentRow
          key={s.studentId}
          student={s}
          name={nameOf(s.studentId)}
          goal={goal}
          index={offset + i}
          onOpen={onStudentClick ? () => onStudentClick(s.studentId, nameOf(s.studentId)) : undefined}
        />
      ))}
    </ol>
  );

  return (
    <div data-testid="report-student-list" className="space-y-3">
      {below.length > 0 && (
        <section className="space-y-1.5">
          <h4 className="text-xs font-black uppercase tracking-wide text-neo-pink">
            {t('eg2Rep.report.belowGoal', { goal, count: below.length })}
          </h4>
          {group(below, 0)}
        </section>
      )}
      {onTrack.length > 0 && (
        <section className="space-y-1.5">
          <h4 className="text-xs font-black uppercase tracking-wide text-neo-lime">
            {t('eg2Rep.report.onTrack', { count: onTrack.length })}
          </h4>
          {group(onTrack, below.length)}
        </section>
      )}
    </div>
  );
}
