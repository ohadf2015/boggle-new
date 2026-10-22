'use client';

import { useEffect, useState } from 'react';
import { Flame } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { classStreakStatus, type ClassStreak } from '@/lib/education/classroomHub';

const COPY = {
  kept: { one: 'teacher.classStreak.keptOne', many: 'teacher.classStreak.kept' },
  atRisk: { one: 'teacher.classStreak.atRiskOne', many: 'teacher.classStreak.atRisk' },
} as const;

/** The class streak the students see, told to their teacher; hidden until it is read and non-zero. */
export function ClassStreakLine({ classroomId, className }: { classroomId: string; className?: string }) {
  const { t } = useLanguage();
  const [streak, setStreak] = useState<ClassStreak | null>(null);

  useEffect(() => {
    let cancelled = false;
    setStreak(null);
    fetch(`/api/education/classroom/${classroomId}/streak`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`streak ${res.status}`);
        return (await res.json()) as ClassStreak;
      })
      .then((s) => { if (!cancelled) setStreak(s); })
      .catch(() => { if (!cancelled) setStreak(null); });
    return () => { cancelled = true; };
  }, [classroomId]);

  if (!streak) return null;
  const status = classStreakStatus(streak);
  if (status === 'none') return null;
  const copy = COPY[status];

  return (
    <p
      data-testid="hq-class-streak"
      data-state={status}
      className={cn(
        'inline-flex min-w-0 items-center gap-1.5 rounded-neo border-2 border-neo-black px-2 py-1 font-neo-body text-xs font-bold text-neo-black shadow-hard-sm',
        status === 'atRisk' ? 'bg-neo-orange' : 'bg-neo-cream',
        className,
      )}
    >
      <Flame
        aria-hidden="true"
        className={cn('size-4 shrink-0', status === 'atRisk' ? 'text-neo-black' : 'text-neo-orange')}
        strokeWidth={3}
      />
      <span className="min-w-0">
        {streak.streak === 1 ? t(copy.one) : t(copy.many, { count: streak.streak })}
      </span>
    </p>
  );
}

export default ClassStreakLine;
