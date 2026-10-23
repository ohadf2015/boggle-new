'use client';

import { Users } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { FREE_TIER_LIMITS } from '@/lib/education/freeTierLimits';

export interface UpgradeClassSummary {
  id: string;
  name: string;
  member_count: number;
}

const SHOWN = 3;

export function UpgradeYourClasses({ classes }: { classes: UpgradeClassSummary[] }) {
  const { t } = useLanguage();
  if (classes.length === 0) return null;

  const shown = classes.slice(0, SHOWN);
  const more = classes.length - shown.length;

  return (
    <section
      data-testid="upgrade-your-classes"
      className="mt-4 rounded-neo border-2 border-neo-cream/40 bg-neo-navy-light p-3"
    >
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-neo-display text-base font-black text-neo-white">{t('eduPro.yourClasses.title')}</h2>
        <p data-testid="upgrade-class-cap" className="text-xs font-bold text-neo-white/70">
          {t('eduPro.yourClasses.classCap', { used: classes.length, limit: FREE_TIER_LIMITS.classes })}
        </p>
      </div>
      <ul className="flex flex-col gap-1.5">
        {shown.map((c) => (
          <li
            key={c.id}
            data-testid="upgrade-your-class"
            className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 rounded-neo border-2 border-neo-black bg-neo-navy px-2 py-1.5"
          >
            <Users className="size-4 shrink-0 text-neo-cyan" strokeWidth={2.5} aria-hidden />
            <span className="min-w-0 shrink truncate font-neo-display text-sm font-black text-neo-white">{c.name}</span>
            <span className="w-full min-w-0 text-xs font-bold text-neo-lime sm:ms-auto sm:w-auto sm:text-end">
              {c.member_count > 0
                ? t('eduPro.yourClasses.proAddsStudents', { count: c.member_count })
                : t('eduPro.yourClasses.proAddsEmpty')}
            </span>
          </li>
        ))}
      </ul>
      {more > 0 ? (
        <p data-testid="upgrade-your-classes-more" className="mt-1.5 text-xs font-bold text-neo-white/70">
          {t('eduPro.yourClasses.more', { count: more })}
        </p>
      ) : null}
    </section>
  );
}
