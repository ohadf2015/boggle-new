'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { useHoliday } from '@/hooks/useHoliday';
import type { HuntSlot } from '@/lib/holidays/hunt';
import { holidayPost, holidayQuery, loadHunt, setHuntState, type HuntClientState } from '@/lib/holidays/holidayClient';
import { cn } from '@/lib/utils';
import '../holidayFx.css';

type Phase = 'hidden' | 'peeking' | 'collecting' | 'done';

export default function HolidayHideSpot({ slot }: { slot: HuntSlot }) {
  const { t } = useLanguage();
  const { holiday, resolved } = useHoliday();
  const { playCoinCollectSound, playAchievementSound } = useSoundEffects();
  const [state, setState] = useState<HuntClientState | null>(null);
  const [phase, setPhase] = useState<Phase>('hidden');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!resolved || !holiday) return;
    let alive = true;
    void loadHunt().then((s) => {
      if (!alive || !s) return;
      setState(s);
      if (s.slot === slot && !s.foundToday) setPhase('peeking');
    });
    return () => {
      alive = false;
    };
  }, [resolved, holiday, slot]);

  if (!resolved || !holiday || !state || phase === 'hidden') return null;

  const collect = async () => {
    const q = holidayQuery();
    if (!q || phase !== 'peeking') return;
    setPhase('collecting');
    playCoinCollectSound();
    try {
      const res = await holidayPost<HuntClientState & { status: string; seekerJustEarned?: boolean }>('hunt', q, { slot });
      setHuntState(res);
      if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) setPhase('done');
      if (res.seekerJustEarned) {
        playAchievementSound();
        void import('@/utils/confettiUtils').then(({ fireConfetti }) => fireConfetti({ particleCount: 160, spread: 100, disableForReducedMotion: true }));
        setMessage(t('holiday.hunt.seeker'));
      } else {
        setMessage(t('holiday.hunt.found', { count: res.count, goal: res.goal }));
      }
    } catch {
      setMessage(t('holiday.hunt.error'));
      setPhase('peeking');
    }
  };

  return (
    <div className="holiday-hide-spot pointer-events-none fixed bottom-[calc(var(--bottom-nav-height,64px)+20px)] end-0 z-40 flex flex-col items-end gap-1">
      {message && (
        <p role="status" className="holiday-pop-in pointer-events-auto me-2 max-w-[220px] rounded-xl border-2 border-black bg-neo-cream px-2 py-1 text-xs font-bold text-neo-navy shadow-hard-sm">
          {message}
        </p>
      )}
      {phase !== 'done' && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            void collect();
          }}
          aria-label={t('holiday.hunt.itemLabel', { item: t(`holiday.hunt.item.${state.item}`) })}
          className="pointer-events-auto size-14 translate-x-[30%] rounded-full focus-visible:translate-x-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-cream rtl:-translate-x-[30%]"
        >
          <span
            onAnimationEnd={(e) => {
              if (e.animationName === 'hfx-collect') setPhase('done');
            }}
            className={cn('block size-full', phase === 'collecting' ? 'holiday-collect' : 'holiday-peek')}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/holidays/peek-${state.item}.webp`} alt="" width={56} height={56} className="size-full object-contain drop-shadow-[2px_2px_0_var(--neo-black)]" />
          </span>
        </button>
      )}
    </div>
  );
}
