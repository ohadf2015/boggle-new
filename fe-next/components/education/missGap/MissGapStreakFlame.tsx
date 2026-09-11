/**
 * Class-streak flame — the shared trophy of async homework.
 *
 * The streak counts consecutive days on which at least one classmate finished,
 * so it is the one number that belongs to everybody. It reuses the app's own
 * streak heat ladder (`lib/streakHeat`) — same mascot art, same temperature
 * gradient the daily streak uses — so a student who knows their personal streak
 * badge reads this one instantly.
 *
 * Static resting state, fully painted: no opacity-from-0 entrance (pitfalls
 * Class 5), and the idle pulse is dropped under `prefers-reduced-motion`.
 */
'use client';

import Image from 'next/image';
import { Flame } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { getStreakHeat, streakHeatGradient } from '@/lib/streakHeat';
import { MASCOT_IMAGES } from '@/components/ui/mascotData';

export interface MissGapStreakFlameProps {
  streak: number;
  /** `hero` on the finish screen, `pill` in a header or a teacher card. */
  size?: 'pill' | 'hero';
  className?: string;
}

export function MissGapStreakFlame({
  streak,
  size = 'pill',
  className,
}: MissGapStreakFlameProps) {
  const { t } = useLanguage();
  const days = Math.max(0, Math.round(streak));
  const heat = getStreakHeat(Math.max(1, days));
  const art = MASCOT_IMAGES[heat.mascot];

  if (size === 'pill') {
    return (
      <span
        data-testid="miss-gap-streak-pill"
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-neo',
          'border-2 border-neo-black bg-neo-orange text-neo-black font-neo-display font-bold text-sm',
          className,
        )}
      >
        <Flame className="w-4 h-4" aria-hidden />
        <span data-testid="miss-gap-streak-pill-count">{days}</span>
      </span>
    );
  }

  return (
    <div
      data-testid="miss-gap-streak-hero"
      className={cn(
        'w-full rounded-neo border-neo border-neo-black shadow-hard px-4 py-3',
        'flex items-center gap-3 text-left',
        className,
      )}
      style={{ background: streakHeatGradient(heat) }}
    >
      <Image
        src={art}
        alt=""
        width={64}
        height={64}
        unoptimized
        aria-hidden
        className="w-14 h-14 shrink-0 drop-shadow-[3px_3px_0_rgba(0,0,0,0.45)]"
      />
      <div className="min-w-0">
        <p
          className="font-neo-display font-bold text-xl leading-none"
          style={{ color: heat.ink }}
          data-testid="miss-gap-streak-hero-count"
        >
          {t('education.homework.classStreakDays', { count: days })}
        </p>
        <p className="font-neo-body text-xs mt-1" style={{ color: heat.ink }}>
          {t('education.homework.classStreakSubtitle')}
        </p>
      </div>
    </div>
  );
}
