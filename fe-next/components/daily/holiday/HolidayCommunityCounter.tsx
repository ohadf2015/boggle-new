'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { HolidayKey } from '@/lib/holidays/calendar';
import { cn } from '@/lib/utils';
import { holidayApi } from './holidayApi';

export default function HolidayCommunityCounter({ holiday, className }: { holiday: HolidayKey; className?: string }) {
  const { t, language } = useLanguage();
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    holidayApi
      .community(holiday)
      .then((r) => alive && setCount(r.count))
      .catch(() => alive && setCount(null));
    return () => {
      alive = false;
    };
  }, [holiday]);

  if (!count) return null;
  const n = new Intl.NumberFormat(language).format(count);
  return (
    <p data-testid="holiday-community-counter" className={cn('flex items-center justify-center gap-1.5 text-xs font-bold text-neo-white/80', className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={holiday === 'hanukkah' ? '/holidays/props-candle.webp' : '/holidays/props-gift-red.webp'} alt="" width={20} height={28} className="h-5 w-auto" />
      {holiday === 'hanukkah'
        ? t('holiday.community.hanukkah', '{count} candles lit tonight', { count: n })
        : t('holiday.community.christmas', '{count} gifts unwrapped worldwide today', { count: n })}
    </p>
  );
}
