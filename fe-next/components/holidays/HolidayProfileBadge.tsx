'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ArrowLeftRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { useHoliday } from '@/hooks/useHoliday';
import type { HolidayKey } from '@/lib/holidays/calendar';
import { defaultHoliday, otherHoliday, resolveRegion } from '@/lib/holidays/region';
import { cn } from '@/lib/utils';

const ART: Record<HolidayKey, string> = {
  hanukkah: '/holidays/m-hanukkah-menorah.webp',
  christmas: '/holidays/m-christmas-tree.webp',
};

const TONE: Record<HolidayKey, string> = {
  hanukkah: 'bg-neo-holiday-blue',
  christmas: 'bg-neo-holiday-red',
};

function HolidayBadge({ holiday, swap }: { holiday: HolidayKey; swap?: React.ReactNode }) {
  const { t } = useLanguage();
  return (
    <span
      data-testid="holiday-profile-badge"
      data-holiday={holiday}
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full border-2 border-neo-black py-0.5 ps-0.5 text-neo-holiday-snow shadow-hard-sm',
        TONE[holiday],
        swap ? 'pe-0.5' : 'pe-2',
      )}
    >
      <Image src={ART[holiday]} alt="" width={24} height={24} className="h-6 w-6 object-contain" />
      <span className="font-neo-body text-xs font-black">{t(`holiday.badge.${holiday}`)}</span>
      {swap}
    </span>
  );
}

export function OwnHolidayBadge() {
  const { t } = useLanguage();
  const { theme, resolved, canSwap, swap } = useHoliday();
  const [busy, setBusy] = useState(false);
  if (!resolved || !theme) return null;

  const onSwap = async () => {
    setBusy(true);
    const ok = await swap();
    setBusy(false);
    if (!ok) toast.error(t('holiday.badge.swapError'));
  };

  const button = canSwap ? (
    <button
      type="button"
      onClick={onSwap}
      disabled={busy}
      aria-label={t('holiday.badge.swap', { holiday: t(`holiday.badge.${otherHoliday(theme)}`) })}
      title={t('holiday.badge.swap', { holiday: t(`holiday.badge.${otherHoliday(theme)}`) })}
      className="relative grid h-6 w-6 place-items-center rounded-full border-2 border-neo-black bg-neo-cream text-neo-navy motion-safe:transition-transform active:scale-90 disabled:opacity-60 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-neo-cyan before:absolute before:-inset-2.5 before:content-['']"
    >
      <ArrowLeftRight className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
    </button>
  ) : null;

  return <HolidayBadge holiday={theme} swap={button} />;
}

export function PlayerHolidayBadge({ holidayKey, countryCode }: { holidayKey?: HolidayKey | null; countryCode?: string | null }) {
  const { resolved, available } = useHoliday();
  const holiday = holidayKey ?? (countryCode ? defaultHoliday(resolveRegion({ countryCode })) : null);
  if (!resolved || !holiday || !available.includes(holiday)) return null;
  return <HolidayBadge holiday={holiday} />;
}
