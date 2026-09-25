'use client';

/**
 * The student's education achievements as a wall of painted badges in the
 * Academy frame. Same data and tier rules as `AchievementGrid` (the teacher-side
 * and profile component); only the skin and the layout differ: the category
 * chips sit in the frame's toolbar and the badges scroll inside the panel.
 */

import { Lock } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Achievement } from '@/components/education/achievements/AchievementGrid';
import type { AchievementCategory } from '@/lib/supabase/education/types';
import { getTierProgress, getTierDisplay } from '@/utils/achievementTiers';
import { Medallion, INK_TEXT, toneStyle } from '@/components/student/academy/chrome';
import { cn } from '@/lib/utils';

export type AwardsFilter = 'all' | AchievementCategory;

export const AWARD_FILTERS: { key: AwardsFilter; labelKey: string }[] = [
  { key: 'all', labelKey: 'education.achievements.all' },
  { key: 'progress', labelKey: 'education.achievements.categories.progress' },
  { key: 'skill', labelKey: 'education.achievements.categories.skill' },
  { key: 'consistency', labelKey: 'education.achievements.categories.consistency' },
  { key: 'exploration', labelKey: 'education.achievements.categories.exploration' },
];

type T = (k: string, fallback?: string, params?: Record<string, unknown>) => string;

/** Earned first (highest count on top), then the ones still to win. */
export function orderAwards(entries: [string, Achievement][]): [string, Achievement][] {
  return [...entries].sort(([, a], [, b]) => Number(b.count > 0) - Number(a.count > 0) || b.count - a.count);
}

export function AwardsFilterBar({ active, onChange, compact }: { active: AwardsFilter; onChange: (f: AwardsFilter) => void; compact?: boolean }) {
  const { t } = useLanguage();
  return (
    <div role="tablist" className="flex flex-wrap gap-1.5">
      {AWARD_FILTERS.map(({ key, labelKey }) => {
        const on = key === active;
        return (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(key)}
            className={cn(
              'shrink-0 whitespace-nowrap rounded-full border-2 border-neo-black font-neo-display font-black outline-none transition-transform active:translate-y-[2px] focus-visible:ring-2 focus-visible:ring-neo-yellow',
              compact ? 'h-8 px-2.5 text-xs' : 'h-9 px-2.5 text-xs sm:h-10 sm:px-3 sm:text-sm',
              on ? 'text-neo-black' : 'text-neo-white',
            )}
            style={on ? toneStyle('lime', { shadow: 2, trim: 1 }) : { background: 'rgba(255,255,255,0.08)', boxShadow: 'inset 0 0 0 1.5px rgba(245,197,66,0.55)' }}
          >
            {t(labelKey)}
          </button>
        );
      })}
    </div>
  );
}

function AwardCard({ id, a, t }: { id: string; a: Achievement; t: T }) {
  const earned = a.count > 0;
  const tier = getTierProgress(a.count);
  const display = getTierDisplay(tier.currentTier);
  const name = a.isSecret && !earned ? '???' : t(a.nameKey);
  return (
    <li
      data-testid="student-award"
      data-award={id}
      className="flex flex-col items-center gap-1.5 rounded-[16px] border-3 border-neo-black p-2.5 text-center"
      style={toneStyle(earned ? 'plum' : 'night', { shadow: 3, trim: 2 })}
    >
      <Medallion tone={earned ? 'gold' : 'night'} size={56} shadow={2} className={earned ? undefined : 'grayscale'}>
        <span className={cn('text-[28px] leading-none', !earned && 'opacity-60')} aria-hidden="true">
          {a.isSecret && !earned ? '?' : a.icon}
        </span>
      </Medallion>
      <span dir="auto" className={cn('line-clamp-2 min-h-[2.4em] font-neo-display text-sm font-black leading-tight text-neo-white', INK_TEXT)}>
        {name}
      </span>
      {tier.isMaxTier ? (
        <span className="rounded-full border-2 border-neo-black px-2 py-0.5 font-neo-display text-[11px] font-black text-neo-black" style={toneStyle('gold', { shadow: 0, trim: 1 })}>
          {t('academy.pages.maxTier', 'MAX')}
        </span>
      ) : tier.currentTier ? (
        <span
          className="rounded-full border-2 border-neo-black px-2 py-0.5 font-neo-display text-[11px] font-black"
          style={{ backgroundColor: display?.colors.bg, color: display?.colors.text }}
        >
          {display?.icon} {tier.currentTier}
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 font-neo-display text-[11px] font-black text-neo-white/80">
          <Lock className="h-3 w-3" aria-hidden="true" />
          {t('education.achievements.locked')}
        </span>
      )}
      {!tier.isMaxTier && tier.nextThreshold ? (
        <span className="flex w-full items-center gap-1.5" aria-label={`${a.count}/${tier.nextThreshold}`}>
          <span className="h-2.5 flex-1 overflow-hidden rounded-full border-2 border-neo-black bg-black/40">
            <span
              className="block h-full rounded-full motion-safe:transition-[width] motion-safe:duration-700"
              style={{ width: `${Math.max(0, Math.min(100, tier.progress))}%`, backgroundImage: 'linear-gradient(90deg,#fff27a,#ffcf3a)' }}
            />
          </span>
          <span className="shrink-0 font-neo-body text-[11px] font-bold text-neo-white/85">
            {a.count}/{tier.nextThreshold}
          </span>
        </span>
      ) : null}
    </li>
  );
}

export function AwardsGrid({ achievements, filter }: { achievements: Record<string, Achievement>; filter: AwardsFilter }) {
  const { t } = useLanguage() as unknown as { t: T };
  const entries = orderAwards(Object.entries(achievements).filter(([, a]) => filter === 'all' || a.category === filter));
  if (entries.length === 0) {
    return (
      <p dir="auto" className="py-10 text-center font-neo-body text-sm font-bold text-neo-white/85">
        {t('academy.pages.noAwards', 'Play a lesson to start earning awards.')}
      </p>
    );
  }
  const noneYet = !Object.values(achievements).some((a) => a.count > 0);
  return (
    <>
      {noneYet && (
        <p
          dir="auto"
          data-testid="student-awards-first"
          className="mb-3 rounded-[14px] border-2 border-neo-black px-3 py-2 font-neo-display text-sm font-black text-neo-black"
          style={toneStyle('gold', { shadow: 2, trim: 1 })}
        >
          {t('academy.pages.firstAward', 'Finish a lesson to win your first award!')}
        </p>
      )}
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
        {entries.map(([id, a]) => (
          <AwardCard key={id} id={id} a={a} t={t} />
        ))}
      </ul>
    </>
  );
}
