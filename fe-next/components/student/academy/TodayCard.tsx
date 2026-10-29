'use client';

import Link from 'next/link';
import { Check, Flame, Gift, Zap } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { StudentWarmup, TodayItem, TodayItemId } from './todayItems';

const ICONS: Record<TodayItemId, typeof Zap> = { warmup: Zap, chest: Gift, streak: Flame };

/** The day's three small wins after day one: warm up for the class game, open the chest, keep the flame. */
export function TodayCard({ items, warmup }: { items: TodayItem[]; warmup: StudentWarmup | null }) {
  const { t } = useLanguage();
  const label = (item: TodayItem): string => {
    if (item.id === 'warmup') return item.done ? t('student.today.warmupDone', 'All homework done') : t('student.today.warmup', 'Warm up');
    if (item.id === 'chest') return item.done ? t('student.today.chestDone', 'Chest opened') : t('student.today.chest', 'Open your chest');
    return item.done
      ? t('student.today.streakDone', 'Flame lit today')
      : t('student.today.streak', 'Keep your {count}-day flame', { count: item.count ?? 0 });
  };

  return (
    <section
      data-testid="academy-today"
      aria-label={t('student.today.title', 'Today')}
      className="pointer-events-auto flex flex-col gap-1.5 rounded-[14px] border-2 border-neo-cream/40 bg-neo-navy/90 p-1.5 text-neo-white shadow-hard-sm"
    >
      {warmup && <WarmupCta warmup={warmup} />}
      <ul className="grid grid-cols-3 gap-1">
        {items.map((item) => {
          const Icon = item.done ? Check : ICONS[item.id];
          return (
            <li
              key={item.id}
              data-testid={`academy-today-${item.id}`}
              data-done={item.done ? 'true' : 'false'}
              className={cn(
                'flex min-w-0 items-center gap-1 rounded-lg border-2 border-neo-black px-1.5 py-1 font-neo-body text-[11px] font-bold leading-tight',
                item.done ? 'bg-neo-lime text-neo-black' : 'bg-neo-white/10 text-neo-white'
              )}
            >
              <Icon aria-hidden="true" className="size-3.5 shrink-0" strokeWidth={3} />
              <span className="min-w-0 line-clamp-2 break-words">{label(item)}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** One tap into the most game-like drill on the homework list, with its first words as a preview. */
export function WarmupCta({ warmup }: { warmup: StudentWarmup }) {
  const { t } = useLanguage();
  return (
    <Link
      href={warmup.href}
      data-testid="academy-warmup-cta"
      className="flex min-h-12 items-center gap-2 rounded-[12px] border-2 border-neo-black bg-neo-lime px-2 py-1.5 text-neo-black shadow-hard-sm transition-transform duration-150 active:translate-y-0.5 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan"
    >
      <Zap aria-hidden="true" className="size-5 shrink-0" strokeWidth={3} />
      <span className="min-w-0 flex-1">
        <span className="block font-neo-display text-sm font-black uppercase leading-tight">
          {t('student.today.warmupCta', 'Warm up for the game')}
        </span>
        <span className="flex flex-wrap gap-1 pt-0.5" translate="no">
          {warmup.words.map((word) => (
            <span key={word} dir="auto" className="rounded-md border border-neo-black/50 bg-neo-cream px-1.5 font-neo-body text-[11px] font-bold">
              {word}
            </span>
          ))}
        </span>
      </span>
      <span className="shrink-0 rounded-lg border-2 border-neo-black bg-neo-white px-2 py-1 font-neo-body text-[11px] font-black uppercase">
        {t('student.today.play', 'Play')}
      </span>
    </Link>
  );
}
