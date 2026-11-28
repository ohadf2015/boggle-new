'use client';

import Link from 'next/link';
import { Gamepad2, Lock } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatHolidayDay, type HolidayKey } from '@/lib/holidays/calendar';
import { ARCADE_GAMES, gamesFor } from '@/lib/holidays/arcade/games';
import { cn } from '@/lib/utils';

const TILE = 'mt-3 flex items-center gap-3 rounded-xl border-[3px] border-black bg-neo-navy p-2 shadow-hard-sm';

export default function ArcadeTile({ holiday, opensOn }: { holiday: HolidayKey; opensOn?: string }) {
  const { t, language } = useLanguage();
  const body = (
    <>
      <span className="flex shrink-0 -space-x-3 rtl:space-x-reverse" aria-hidden="true">
        {gamesFor(holiday).slice(0, 4).map((g) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={g} src={ARCADE_GAMES[g].cover} alt="" width={40} height={40} loading="lazy" className={cn('size-10 rounded-lg border-2 border-black object-cover', opensOn && 'grayscale')} />
        ))}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-neo-display text-sm font-black leading-tight">{t('holiday.arcade.tileTitle')}</span>
        <span className="line-clamp-2 block text-xs leading-snug text-neo-white/70">
          {opensOn ? t('holiday.arcade.tileLocked', { date: formatHolidayDay(opensOn, language) }) : t('holiday.arcade.tileSubtitle')}
        </span>
      </span>
      {opensOn ? (
        <Lock className="size-6 shrink-0 text-neo-white/60" aria-hidden="true" />
      ) : (
        <Gamepad2 className="size-6 shrink-0 text-neo-cream" aria-hidden="true" />
      )}
    </>
  );
  if (opensOn) {
    return (
      <div data-testid="holiday-arcade-tile" aria-disabled="true" className={cn(TILE, 'opacity-80')}>
        {body}
      </div>
    );
  }
  return (
    <Link href={`/${language}/holiday-arcade`} data-testid="holiday-arcade-tile" className={cn(TILE, 'transition-transform active:translate-x-0.5 active:translate-y-0.5')}>
      {body}
    </Link>
  );
}
