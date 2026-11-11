'use client';

import Link from 'next/link';
import { Shield } from 'lucide-react';
import { StreakFlame } from '@/components/streak/StreakFlame';
import { trackLandingCtaClick } from '@/utils/growthTracking';
import { useTodayLabel } from './useTodayLabel';
import type { ReactNode } from 'react';

interface HeroQuickLinksProps {
  lang: string;
  t: (key: string, params?: Record<string, string | number>) => string;
  streak: number;
  streakLoading: boolean;
  atRisk?: boolean;
  /** Banked streak freezes (signed-in only); shown on the chip when > 0. */
  freezes?: number;
}

function Chip({ href, testId, icon, iconBg, title, sub, trailing, onClick }: {
  href: string;
  testId: string;
  icon: ReactNode;
  iconBg: string;
  title: string;
  sub: string;
  trailing?: ReactNode;
  onClick?: () => void;
}) {
  return (
    <li className="min-w-0">
      <Link
        href={href}
        data-testid={testId}
        onClick={onClick}
        className="flex h-full items-center gap-2 rounded-2xl border-[3px] border-black bg-neo-navy-elevated py-1.5 ps-1.5 pe-2.5 text-neo-cream shadow-hard-sm transition-transform hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-pressed lg:gap-3 lg:py-2.5 lg:ps-2.5 lg:pe-4"
      >
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 border-black text-black lg:h-12 lg:w-12 ${iconBg}`}>
          {icon}
        </span>
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="truncate font-neo-display text-sm font-bold lg:text-lg">{title}</span>
          <span className="truncate text-[11px] font-bold text-neo-white/60 lg:text-sm">{sub}</span>
        </span>
        {trailing}
      </Link>
    </li>
  );
}

export function HeroQuickLinks({ lang, t, streak, streakLoading, atRisk = false, freezes = 0 }: HeroQuickLinksProps) {
  const date = useTodayLabel(lang, { weekday: 'short', day: 'numeric', month: 'short' });
  const known = !streakLoading && streak > 0;
  const dailySub = known ? (atRisk ? t('dailyStreak.flame.atRisk', { n: streak }) : t('homePlay.chipStreak', { n: streak })) : date;
  return (
    <ul className="grid grid-cols-1 gap-2.5 lg:gap-4" data-testid="hp-quick-links">
      <Chip
        // One tap into today's puzzle (the Word Wheel), not the hub in between.
        href={`/${lang}/daily`}
        onClick={() => trackLandingCtaClick('home_daily_chip')}
        trailing={
          <span className="ms-auto flex shrink-0 items-center gap-2">
            {freezes > 0 && (
              <span
                className="flex items-center gap-1 rounded-full border-2 border-black bg-neo-cyan px-2 py-0.5 text-[11px] font-bold text-black"
                data-testid="hp-chip-freezes"
                title={t('quickLoop.freezes.title')}
                aria-label={t('quickLoop.freezes.aria', { n: freezes })}
              >
                <Shield className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
                {freezes}
              </span>
            )}
            <span className="rounded-xl border-2 border-black bg-neo-orange px-2.5 py-1 font-neo-display text-xs font-bold text-black lg:text-sm">
              {t('quickLoop.daily.play')}
            </span>
          </span>
        }
        testId="hp-chip-daily"
        iconBg="bg-neo-orange"
        icon={<StreakFlame days={known ? streak : 0} size={30} mood={known && atRisk ? 'worried' : 'happy'} animated={known} />}
        title={t('homePlay.chipDaily')}
        sub={dailySub}
      />
    </ul>
  );
}
