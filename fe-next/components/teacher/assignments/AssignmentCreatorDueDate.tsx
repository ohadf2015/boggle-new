'use client';

import { useState } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
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
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);

  return (
    <div>
      <label className="mb-2 flex items-center gap-1 text-sm font-neo-body text-neo-white">
        <span>{t('teacher.assignment.dueDate')}</span>
        <span data-testid="due-date-required" aria-hidden="true" className="font-black text-neo-pink">
          *
        </span>
        <span className="sr-only">{t('eduPro.assign.required')}</span>
      </label>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className={cn(
          'w-full p-3 rounded-neo border-neo bg-neo-navy text-neo-white font-neo-body flex items-center justify-between',
          value ? 'border-neo-cream/40' : 'border-neo-pink/70',
        )}
      >
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          <span>{value || t('teacher.assignment.selectDate')}</span>
        </div>
        <ChevronDown className={cn('w-5 h-5 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="mt-2 p-4 bg-neo-navy border-neo border-neo-cream/40 rounded-neo shadow-hard space-y-3">
          <div className="text-sm font-neo-body text-neo-white mb-2">{t('teacher.assignment.quickSelect')}</div>
          <div className="grid grid-cols-2 gap-2">
            {QUICK.map(({ days, key }) => (
              <Button
                key={key}
                onClick={() => {
                  onChange(localDayPlus(days));
                  setOpen(false);
                }}
                className="bg-neo-cyan/20 border-neo border-neo-cyan text-neo-cyan hover:bg-neo-cyan/30 active:translate-y-0.5"
              >
                {t(key)}
              </Button>
            ))}
          </div>
          <div className="border-t border-neo-black/30 pt-3">
            <label className="block text-xs text-neo-white mb-1">{t('teacher.assignment.customDate')}</label>
            <input
              type="date"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              aria-label={t('teacher.assignment.customDate')}
              className="w-full p-2 rounded-neo border-neo border-neo-cream/40 bg-neo-navy text-neo-white text-sm"
            />
          </div>
        </div>
      )}
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
