'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import type { HolidayKey } from '@/lib/holidays/calendar';
import { secretWordIds } from '@/lib/holidays/eggs';
import { HOLIDAY_EGG_EVENT, holidayGet, holidayQuery } from '@/lib/holidays/holidayClient';
import { hasSupabaseSession } from '@/utils/onboardingStorage';

const SHOW_MS = 4200;

export default function SecretCelebration({ holiday }: { holiday: HolidayKey }) {
  const { t, language } = useLanguage();
  const { playRareWordSound } = useSoundEffects();
  const [found, setFound] = useState<Set<string>>(new Set());
  const [shown, setShown] = useState<string | null>(null);
  const ids = secretWordIds(language, holiday);

  useEffect(() => {
    const q = holidayQuery();
    if (!q || !hasSupabaseSession()) return;
    let alive = true;
    holidayGet<{ found: string[] }>('eggs', q)
      .then((r) => alive && setFound(new Set(r.found)))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [holiday, language]);

  useEffect(() => {
    const onEgg = (e: Event) => {
      const egg = (e as CustomEvent<{ egg: string }>).detail.egg;
      setFound((f) => new Set(f).add(egg));
      if (!egg.startsWith('word_')) return;
      setShown(egg);
      playRareWordSound();
      void import('@/utils/confettiUtils').then(({ fireConfetti }) =>
        fireConfetti({ particleCount: 120, spread: 80, origin: { y: 0.3 }, disableForReducedMotion: true }),
      );
    };
    window.addEventListener(HOLIDAY_EGG_EVENT, onEgg);
    return () => window.removeEventListener(HOLIDAY_EGG_EVENT, onEgg);
  }, [playRareWordSound]);

  useEffect(() => {
    if (!shown) return;
    const id = setTimeout(() => setShown(null), SHOW_MS);
    return () => clearTimeout(id);
  }, [shown]);

  if (!shown) return null;
  const left = ids.filter((id) => !found.has(id)).length;
  return (
    <div role="status" className="holiday-fx-dock pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+72px)] z-[85] flex justify-center px-4">
      <div className="holiday-banner-in flex items-center gap-3 rounded-2xl border-[3px] border-black bg-neo-holiday-gold px-4 py-2 text-neo-navy shadow-hard">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/holidays/gold-key.webp" alt="" width={40} height={40} className="size-10 object-contain" />
        <div>
          <p className="font-neo-display text-base font-bold leading-tight">{t('holiday.eggs.secretFound', { word: t(`holiday.eggs.word.${shown.slice(5)}`) })}</p>
          <p className="text-xs font-bold">{left > 0 ? t('holiday.eggs.secretsLeft', { count: left }) : t('holiday.eggs.secretsAll')}</p>
        </div>
      </div>
    </div>
  );
}
