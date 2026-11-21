'use client';

/**
 * The student's education achievements as a wall of painted badges in the
 * Academy frame. Same data and tier rules as `AchievementGrid` (the teacher-side
 * and profile component); only the skin and the layout differ: the category
 * chips sit in the frame's toolbar and the badges scroll inside the panel.
 */

import { useState } from 'react';
import { ChevronDown, Lock } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Achievement } from '@/components/education/achievements/AchievementGrid';
import type { AchievementCategory } from '@/lib/supabase/education/types';
import { getTierDisplay } from '@/utils/achievementTiers';
import { awardTier, isEarnableAward } from '@/app/[locale]/student/achievements/awardsSummary';
import { pressClasses } from '@/components/education/motion';
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
              "relative shrink-0 whitespace-nowrap rounded-full border-2 border-neo-black font-neo-display font-black outline-none transition-transform after:absolute after:inset-x-0 after:-inset-y-1.5 after:content-[''] active:translate-y-[2px] focus-visible:ring-2 focus-visible:ring-neo-yellow",
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

function AwardCard({ id, a, t, fresh = false }: { id: string; a: Achievement; t: T; fresh?: boolean }) {
  const tier = awardTier(id, a.count);
  const earned = tier.currentTier !== null;
  const display = getTierDisplay(tier.currentTier);
  const name = a.isSecret && !earned ? '???' : t(a.nameKey);
  return (
    <li
      data-testid="student-award"
      data-award={id}
      data-fresh={fresh || undefined}
      className="relative flex flex-col items-center gap-1.5 rounded-[16px] border-3 border-neo-black p-2.5 text-center"
      style={toneStyle(earned ? 'plum' : 'night', { shadow: 3, trim: 2 })}
    >
      {fresh && (
        <span data-testid="award-new" className="absolute -top-2 end-2 rounded-full border-2 border-neo-black px-2 py-0.5 font-neo-display text-xs font-black text-neo-black" style={toneStyle('lime', { shadow: 2, trim: 1 })}>
          {t('academy.pages.awardNew', 'New!')}
        </span>
      )}
      <Medallion tone={earned ? 'gold' : 'night'} size={56} shadow={2} className={earned ? undefined : 'grayscale'}>
        <span className={cn('text-[28px] leading-none', !earned && 'opacity-60')} aria-hidden="true">
          {a.isSecret && !earned ? '?' : a.icon}
        </span>
      </Medallion>
      <span dir="auto" className={cn('line-clamp-2 min-h-[2.4em] font-neo-display text-sm font-black leading-tight text-neo-white', INK_TEXT)}>
        {name}
      </span>
      {!earned && (
        <span data-testid="award-how" dir="auto" className="line-clamp-3 font-neo-body text-xs font-bold leading-snug text-neo-white/85">
          {t(a.descriptionKey)}
        </span>
      )}
      {tier.isMaxTier ? (
        <span className="rounded-full border-2 border-neo-black px-2 py-0.5 font-neo-display text-xs font-black text-neo-black" style={toneStyle('gold', { shadow: 0, trim: 1 })}>
          {t('academy.pages.maxTier', 'MAX')}
        </span>
      ) : tier.currentTier ? (
        <span
          className="rounded-full border-2 border-neo-black px-2 py-0.5 font-neo-display text-xs font-black"
          style={{ backgroundColor: display?.colors.bg, color: display?.colors.text }}
        >
          {display?.icon} {tier.currentTier}
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 font-neo-display text-xs font-black text-neo-white/80">
          <Lock className="h-3 w-3" aria-hidden="true" />
          {t('education.achievements.locked')}
        </span>
      )}
      {!tier.isMaxTier && tier.nextThreshold ? (
        <span className="flex w-full items-center gap-1.5" aria-label={`${a.count}/${tier.nextThreshold}`}>
          <span className="h-2.5 flex-1 overflow-hidden rounded-full border-2 border-neo-black bg-black/40">
            <span
              className="block h-full w-full origin-left rtl:origin-right rounded-full motion-safe:transition-transform motion-safe:duration-700"
              style={{ transform: `scaleX(${Math.max(0, Math.min(100, tier.progress)) / 100})`, backgroundImage: 'linear-gradient(90deg,color-mix(in srgb,var(--neo-yellow) 55%,var(--neo-cream)),color-mix(in srgb,var(--neo-yellow) 85%,var(--neo-orange)))' }}
            />
          </span>
          <span className="shrink-0 font-neo-body text-xs font-bold text-neo-white/85">
            {a.count}/{tier.nextThreshold}
          </span>
        </span>
      ) : null}
    </li>
  );
}

export function AwardsGrid({ achievements, filter, fresh }: { achievements: Record<string, Achievement>; filter: AwardsFilter; fresh?: ReadonlySet<string> }) {
  const { t } = useLanguage() as unknown as { t: T };
  const [open, setOpen] = useState(false);
  const entries = orderAwards(Object.entries(achievements).filter(([id, a]) => isEarnableAward(id, a.count) && (filter === 'all' || a.category === filter)));
  if (entries.length === 0) {
    return (
      <p dir="auto" className="py-10 text-center font-neo-body text-sm font-bold text-neo-white/85">
        {t('academy.pages.noAwards', 'Play a lesson to start earning awards.')}
      </p>
    );
  }
  const won = entries.filter(([id, a]) => awardTier(id, a.count).currentTier);
  const toWin = entries.filter(([id, a]) => !awardTier(id, a.count).currentTier);
  return (
    <>
      {won.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
          {won.map(([id, a]) => (
            <AwardCard key={id} id={id} a={a} t={t} fresh={fresh?.has(id)} />
          ))}
        </ul>
      )}
      {toWin.length > 0 && (
        <>
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className={cn(
              pressClasses(2),
              'mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-[14px] border-3 border-neo-black px-4 font-neo-display text-sm font-black text-neo-black',
            )}
            style={toneStyle('gold', { shadow: 2, trim: 1 })}
          >
            <bdi>{open ? t('academy.pages.awardsHideMore', 'Hide the rest') : t('academy.pages.awardsShowMore', 'More awards to win: {count}', { count: toWin.length })}</bdi>
            <ChevronDown className={cn('size-4 motion-safe:transition-transform', open && 'rotate-180')} aria-hidden="true" />
          </button>
          {open && (
            <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
              {toWin.map(([id, a]) => (
                <AwardCard key={id} id={id} a={a} t={t} />
              ))}
            </ul>
          )}
        </>
      )}
    </>
  );
}
