'use client';

import Link from 'next/link';
import { Flame, Users } from 'lucide-react';
import { useTodayLabel } from './useTodayLabel';
import type { ReactNode } from 'react';

interface HeroQuickLinksProps {
  lang: string;
  t: (key: string, params?: Record<string, string | number>) => string;
  streak: number;
  streakLoading: boolean;
}

function Chip({ href, testId, icon, iconBg, title, sub }: {
  href: string;
  testId: string;
  icon: ReactNode;
  iconBg: string;
  title: string;
  sub: string;
}) {
  return (
    <li className="min-w-0">
      <Link
        href={href}
        data-testid={testId}
        className="flex h-full items-center gap-2 rounded-2xl border-[3px] border-black bg-neo-navy-elevated py-1.5 ps-1.5 pe-2.5 text-neo-cream shadow-hard-sm transition-transform hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-pressed lg:gap-3 lg:py-2.5 lg:ps-2.5 lg:pe-4"
      >
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 border-black text-black lg:h-12 lg:w-12 ${iconBg}`}>
          {icon}
        </span>
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="truncate font-neo-display text-sm font-bold lg:text-lg">{title}</span>
          <span className="truncate text-[11px] font-bold text-neo-white/60 lg:text-sm">{sub}</span>
        </span>
      </Link>
    </li>
  );
}

export function HeroQuickLinks({ lang, t, streak, streakLoading }: HeroQuickLinksProps) {
  const date = useTodayLabel(lang, { weekday: 'short', day: 'numeric', month: 'short' });
  const dailySub = !streakLoading && streak > 0 ? t('homePlay.chipStreak', { n: streak }) : date;
  return (
    <ul className="grid grid-cols-2 gap-2.5 lg:gap-4" data-testid="hp-quick-links">
      <Chip
        href={`/${lang}/daily`}
        testId="hp-chip-daily"
        iconBg="bg-neo-orange"
        icon={<Flame className="h-5 w-5 lg:h-6 lg:w-6" strokeWidth={2.75} aria-hidden="true" />}
        title={t('homePlay.chipDaily')}
        sub={dailySub}
      />
      <Chip
        href={`/${lang}/multiplayer`}
        testId="hp-chip-mp"
        iconBg="bg-neo-pink"
        icon={<Users className="h-5 w-5 lg:h-6 lg:w-6" strokeWidth={2.75} aria-hidden="true" />}
        title={t('homePlay.chipMp')}
        sub={t('homePlay.chipMpSub')}
      />
    </ul>
  );
}
