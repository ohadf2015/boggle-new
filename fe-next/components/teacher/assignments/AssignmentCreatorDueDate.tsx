'use client';

import { Calendar } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

/** YYYY-MM-DD on the teacher's own calendar; toISOString would hand back the UTC day. */
export function localDayPlus(days: number, from = new Date()): string {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + days);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const QUICK = [
  { days: 0, key: 'teacher.assignment.today' },
  { days: 1, key: 'teacher.assignment.tomorrow' },
  { days: 7, key: 'teacher.assignment.nextWeek' },
  { days: 30, key: 'teacher.assignment.nextMonth' },
] as const;

export function AssignmentCreatorDueDate({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t, language } = useLanguage();
  const quick = QUICK.map((q) => ({ ...q, day: localDayPlus(q.days) }));
  const custom = value !== '' && !quick.some((q) => q.day === value);
  const shown = value
    ? new Date(`${value}T12:00:00`).toLocaleDateString(language, { weekday: 'short', day: 'numeric', month: 'short' })
    : t('teacher.assignment.selectDate');

  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 text-sm font-neo-body text-neo-white">
        <Calendar className="size-4 shrink-0" aria-hidden="true" />
        {value ? <time dateTime={value}>{shown}</time> : <span className="text-neo-pink">{shown}</span>}
        <span data-testid="due-date-required" aria-hidden="true" className="font-black text-neo-pink">
          *
        </span>
        <span className="sr-only">{t('eduPro.assign.required')}</span>
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {quick.map(({ key, day }) => {
          const active = value === day;
          return (
            <button
              key={key}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(day)}
              className={cn(
                'min-h-11 rounded-neo border-2 px-2 font-neo-body text-sm font-bold transition-[transform,box-shadow] active:translate-y-0.5 motion-reduce:transition-none',
                active
                  ? 'border-black bg-neo-lime text-neo-black shadow-hard-sm'
                  : 'border-neo-cyan/70 bg-neo-cyan/10 text-neo-cyan hover:bg-neo-cyan/20',
              )}
            >
              {t(key)}
            </button>
          );
        })}
      </div>
      <label className="mt-2 flex items-center gap-2 text-xs text-neo-white/80">
        <span className="shrink-0">{t('teacher.assignment.customDate')}</span>
        <input
          type="date"
          value={custom ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          aria-label={t('teacher.assignment.customDate')}
          className={cn(
            'min-h-10 w-full rounded-neo border-2 bg-neo-navy p-2 text-sm text-neo-white',
            custom ? 'border-neo-lime' : 'border-neo-cream/40',
          )}
        />
      </label>
    </div>
  );
}

/** Why the submit is disabled, or null when it is not. */
export function assignmentSubmitHintKey(hasLesson: boolean, hasDate: boolean): string | null {
  if (!hasLesson && !hasDate) return 'eduPro.assign.needLessonAndDate';
  if (!hasLesson) return 'eduPro.assign.needLesson';
  if (!hasDate) return 'eduPro.assign.needDate';
  return null;
}
