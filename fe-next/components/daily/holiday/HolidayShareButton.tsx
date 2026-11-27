'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import type { HolidayKey } from '@/lib/holidays/calendar';
import { trackShareCompleted } from '@/utils/share';
import { holidayShareCard, shareHolidayCard } from './holidayShareCard';

export default function HolidayShareButton({ holiday, day }: { holiday: HolidayKey; day: number }) {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const hanukkah = holiday === 'hanukkah';
  const total = hanukkah ? 8 : 12;
  const finale = day >= total;
  const headline = hanukkah
    ? finale
      ? t('holiday.shareCard.hanukkahFinale', 'I lit all 8 candles!')
      : t('holiday.shareCard.hanukkah', 'I lit night {n} of 8!', { n: day })
    : finale
      ? t('holiday.shareCard.christmasFinale', 'I opened all 12 gifts!')
      : t('holiday.shareCard.christmas', 'I opened gift {n} of 12!', { n: day });
  const footer = t('holiday.shareCard.footer', 'Play the holiday daily on lexiclash.live');

  const share = async () => {
    setBusy(true);
    try {
      const blob = await holidayShareCard({
        holiday,
        lit: day,
        total,
        headline,
        footer,
        avatarUrl: user ? `/api/avatar/png/${user.id}/v/${Date.now()}` : null,
      });
      if (!blob) return;
      const result = await shareHolidayCard(blob, headline, `${window.location.origin}/${language}/daily`);
      if (result !== 'failed') trackShareCompleted(result === 'shared' ? 'web_share_api' : 'fallback_clipboard', { surface: 'holiday_card' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      data-testid="holiday-share-card"
      disabled={busy}
      onClick={share}
      className="w-full rounded-xl border-[3px] border-black bg-neo-holiday-gold px-3 py-2 font-neo-display text-sm font-bold text-neo-navy shadow-hard-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-pressed disabled:opacity-60"
    >
      {hanukkah ? t('holiday.shareCard.buttonHanukkah', 'Share my menorah') : t('holiday.shareCard.buttonChristmas', 'Share my gifts')}
    </button>
  );
}
