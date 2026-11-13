'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { getSecondsUntilNextDaily } from '@/utils/dailyChallenge/dateUtils';
import { cn } from '@/lib/utils';

const MASCOTS = [
  '/mascot/hello-nobg.webp',
  '/mascot/bridge-cheer-nobg.webp',
  '/mascot/streak-supernova-nobg.webp',
  '/mascot/victory-nobg.webp',
] as const;
const LINES = ['quests.hero.fresh', 'quests.hero.one', 'quests.hero.two', 'quests.hero.done'] as const;

type ChestState = 'idle' | 'wobble' | 'open';

function formatClock(totalSeconds: number): string {
  const s = Math.max(0, totalSeconds);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

function useResetCountdown(): string {
  const [seconds, setSeconds] = useState(() => getSecondsUntilNextDaily());
  useEffect(() => {
    const id = setInterval(() => setSeconds(getSecondsUntilNextDaily()), 1000);
    return () => clearInterval(id);
  }, []);
  return formatClock(seconds);
}

const CHEST_CLASS: Record<ChestState, string> = {
  idle: 'motion-safe:animate-[quest-bob_2.6s_ease-in-out_infinite]',
  wobble: 'motion-safe:animate-[quest-chest-wobble_1.8s_ease-in-out_infinite]',
  open: 'motion-safe:animate-[quest-chest-pop_600ms_cubic-bezier(0.34,1.56,0.64,1)_both]',
};

function Chest({ state }: { state: ChestState }) {
  return (
    <div className="relative shrink-0 size-14 grid place-items-center" data-testid="quest-hero-chest" data-state={state}>
      {state === 'open' && (
        <span
          className="absolute inset-0 rounded-neo bg-neo-yellow border-3 border-neo-black motion-safe:animate-[quest-burst_3s_linear_infinite]"
          aria-hidden="true"
        />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element -- small pre-sized sticker; the optimizer adds nothing */}
      <img
        src={'/quests/chest.webp'}
        width={56}
        height={56}
        alt=""
        className={cn('relative size-14 object-contain', CHEST_CLASS[state])}
      />
    </div>
  );
}

export function QuestHero({ completed, total }: { completed: number; total: number }) {
  const { t } = useLanguage();
  const time = useResetCountdown();
  const step = Math.min(Math.max(completed, 0), LINES.length - 1);
  const chest: ChestState = completed >= total ? 'open' : completed === total - 1 ? 'wobble' : 'idle';
  const allDone = chest === 'open';

  return (
    <section
      className={cn(
        'relative overflow-hidden rounded-neo-lg border-3 p-4 shadow-hard',
        allDone ? 'border-neo-lime bg-neo-navy-light' : 'border-neo-black bg-neo-navy-light',
      )}
    >
      <div className="flex items-end gap-3">
        <AdaptiveMotion.div
          key={step}
          className="shrink-0"
          initial={{ scale: 0.7, rotate: -8 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 14 }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- transparent cutout, already sized for this slot */}
          <img
            data-testid="quest-hero-mascot"
            src={MASCOTS[step]}
            width={96}
            height={96}
            alt=""
            className="size-24 object-contain motion-safe:animate-[quest-bob_3s_ease-in-out_infinite]"
          />
        </AdaptiveMotion.div>
        <div className="relative mb-3 flex-1 rounded-neo border-3 border-neo-black bg-neo-cream px-3 py-2 shadow-hard-sm">
          <span
            className="absolute -inset-s-2 bottom-3 size-3 rotate-45 rtl:-rotate-45 border-b-3 border-s-3 border-neo-black bg-neo-cream"
            aria-hidden="true"
          />
          <p className="font-neo-display text-base font-bold leading-snug text-neo-black">{t(LINES[step])}</p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <div className="flex flex-1 gap-1.5">
          {Array.from({ length: total }, (_, i) => {
            const filled = i < completed;
            return (
              <div
                key={i}
                data-testid="quest-hero-segment"
                data-filled={filled}
                className="h-5 flex-1 overflow-hidden rounded-neo-sm border-3 border-neo-black bg-neo-navy"
              >
                <AdaptiveMotion.div
                  className={cn('h-full', allDone ? 'bg-neo-lime' : 'bg-neo-yellow')}
                  initial={{ width: '0%' }}
                  animate={{ width: filled ? '100%' : '0%' }}
                  transition={{ type: 'spring', stiffness: 160, damping: 18, delay: 0.15 + i * 0.12 }}
                />
              </div>
            );
          })}
        </div>
        <Chest state={chest} />
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="rounded-neo-sm border-2 border-neo-black bg-neo-yellow px-2 py-0.5 font-neo-display text-sm font-black text-neo-black tabular-nums">
          {t('quests.progress', { completed, total })}
        </span>
        <span className="font-neo-body text-xs font-bold text-neo-white tabular-nums">
          {t('quests.resetIn', { time })}
        </span>
      </div>
    </section>
  );
}
