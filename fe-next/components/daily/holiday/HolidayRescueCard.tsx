'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { HolidayKey } from '@/lib/holidays/calendar';
import { rescueInviteUrl } from '@/lib/holidays/dailyRescue';
import { cn } from '@/lib/utils';
import { holidayApi, type RescueView } from './holidayApi';
import { shareNative, shareOnWhatsApp } from './holidayShare';

const BTN = 'rounded-xl border-[3px] border-black px-3 py-2 font-neo-display text-sm font-bold shadow-hard-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-pressed';

export default function HolidayRescueCard({ holiday }: { holiday: HolidayKey }) {
  const { t, language } = useLanguage();
  const [state, setState] = useState<RescueView | null>(null);

  useEffect(() => {
    let alive = true;
    holidayApi
      .rescueState(holiday)
      .then(async ({ rescue }) => {
        if (!rescue?.missedDay) return alive && setState(rescue);
        const code = rescue.code ?? (await holidayApi.referralCode().catch(() => ({ referralCode: null }))).referralCode ?? null;
        if (alive) setState({ ...rescue, code });
      })
      .catch(() => alive && setState(null));
    return () => {
      alive = false;
    };
  }, [holiday]);

  if (!state?.missedDay || !state.code) return null;
  const url = rescueInviteUrl(window.location.origin, language, holiday, state.code);
  const hanukkah = holiday === 'hanukkah';
  const text = hanukkah
    ? t('holiday.rescue.shareHanukkah', 'Help me relight a Hanukkah candle! Play today’s LexiClash daily from my link.')
    : t('holiday.rescue.shareChristmas', 'Fill my stocking! Play today’s LexiClash daily from my link.');

  return (
    <div data-testid="holiday-rescue" className="flex items-center gap-3 rounded-xl border-2 border-black bg-neo-navy p-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={hanukkah ? '/holidays/props-menorah.webp' : '/holidays/props-stocking.webp'}
        alt=""
        width={hanukkah ? 256 : 190}
        height={hanukkah ? 245 : 256}
        className="h-14 w-auto"
      />
      <div className="flex-1">
        <p className="text-xs font-bold">
          {hanukkah
            ? t('holiday.rescue.hanukkah', 'The shamash lights the others. Bring a friend to relight night {n}.', { n: state.missedDay })
            : t('holiday.rescue.christmas', 'Stocking stuffer: a friend can fill your missed day {n}.', { n: state.missedDay })}
        </p>
        <div className="mt-1.5 flex gap-2">
          <button type="button" onClick={() => shareOnWhatsApp(text, url)} className={cn(BTN, 'flex-1 bg-neo-holiday-pine text-neo-white')}>
            {t('holiday.share.whatsapp', 'Invite on WhatsApp')}
          </button>
          <button type="button" onClick={() => void shareNative(text, url)} className={cn(BTN, 'bg-neo-cream text-neo-navy')}>
            {t('holiday.share.more', 'More')}
          </button>
        </div>
      </div>
    </div>
  );
}
