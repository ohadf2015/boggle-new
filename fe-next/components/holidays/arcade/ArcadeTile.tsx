'use client';

import Link from 'next/link';
import { Gamepad2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { HolidayKey } from '@/lib/holidays/calendar';
import { ARCADE_GAMES, gamesFor } from '@/lib/holidays/arcade/games';

export default function ArcadeTile({ holiday }: { holiday: HolidayKey }) {
  const { t, language } = useLanguage();
  return (
    <Link
      href={`/${language}/holiday-arcade`}
      data-testid="holiday-arcade-tile"
      className="mt-3 flex items-center gap-3 rounded-xl border-[3px] border-black bg-neo-navy p-2 shadow-hard-sm transition-transform active:translate-x-0.5 active:translate-y-0.5"
    >
      <span className="flex shrink-0 -space-x-3 rtl:space-x-reverse" aria-hidden="true">
        {gamesFor(holiday).map((g) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={g} src={ARCADE_GAMES[g].cover} alt="" width={40} height={40} loading="lazy" className="size-10 rounded-lg border-2 border-black object-cover" />
        ))}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-neo-display text-sm font-black leading-tight">{t('holiday.arcade.tileTitle')}</span>
        <span className="block truncate text-xs text-neo-white/70">{t('holiday.arcade.tileSubtitle')}</span>
      </span>
      <Gamepad2 className="size-6 shrink-0 text-neo-holiday-gold" aria-hidden="true" />
    </Link>
  );
}
