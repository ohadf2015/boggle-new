'use client';

import Image from 'next/image';
import { Check } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { isFirstDayDone, type FirstDayGoal, type FirstDayGoalId } from './firstDayGoals';

interface Props {
  goals: FirstDayGoal[];
  hasClass: boolean;
}

export function FirstDayCard({ goals, hasClass }: Props) {
  const { t } = useLanguage();
  if (isFirstDayDone(goals)) return null;

  const label = (g: FirstDayGoal): string => {
    const keys: Record<FirstDayGoalId, string> = {
      join: t('student.firstDay.join', 'Join your class'),
      stars: t('student.firstDay.stars', 'Earn {count} stars', { count: g.need }),
      flame: t('student.firstDay.flame', 'Light your flame'),
    };
    return keys[g.id];
  };

  return (
    <section
      data-testid="academy-first-day"
      aria-label={t('student.firstDay.title', 'First-day goals')}
      className="pointer-events-auto flex flex-col gap-1 rounded-[14px] border-2 border-neo-black bg-neo-navy/90 p-1.5 text-neo-white shadow-hard-sm"
    >
      <div className="flex items-center gap-2">
        <span className="relative h-9 w-9 shrink-0">
          <Image src="/images/classroom-chests/classroom-chest-common-closed.webp" alt="" aria-hidden="true" fill unoptimized sizes="36px" className="object-contain" />
        </span>
        <ul className="grid min-w-0 flex-1 grid-cols-3 gap-1">
          {goals.map((g) => (
            <li
              key={g.id}
              data-testid={`academy-first-day-${g.id}`}
              data-done={g.done ? 'true' : 'false'}
              className={`flex min-w-0 flex-col gap-0.5 rounded-lg border-2 border-neo-black px-1.5 py-1 font-neo-body text-[11px] font-bold leading-tight ${
                g.done ? 'bg-neo-lime text-neo-black' : 'bg-neo-white/10 text-neo-white'
              }`}
            >
              <span className="flex items-center gap-1">
                {g.done && <Check aria-hidden="true" className="h-3 w-3 shrink-0" strokeWidth={3} />}
                <span className="min-w-0 truncate">{label(g)}</span>
              </span>
              <span className="tabular-nums opacity-80">{`${g.have}/${g.need}`}</span>
            </li>
          ))}
        </ul>
      </div>
      <p className="font-neo-body text-[10px] font-bold uppercase tracking-wide text-neo-yellow">
        {hasClass
          ? t('student.firstDay.classStreakHint', "Today's class game starts your class streak")
          : t('student.firstDay.chestHint', 'Win chests in class games')}
      </p>
    </section>
  );
}
