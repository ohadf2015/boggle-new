'use client';

import { useRef, useState, type PointerEvent } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { cn } from '@/lib/utils';
import { holidayApi } from './holidayApi';
import { spawnBurst } from './holidayBurst';
import styles from './holidayDaily.module.css';

type Phase = { s: 'ready' } | { s: 'pulling' } | { s: 'locked' } | { s: 'error' } | { s: 'not_played' } | { s: 'popped'; joke: number; coins: number };

const SNAP = 70;
const TAP_STEP = 26;

export default function HolidayCracker({ puzzleDate, initial }: { puzzleDate: string; initial?: { joke: number; coins: number } | null }) {
  const { t } = useLanguage();
  const sfx = useSoundEffects();
  const [phase, setPhase] = useState<Phase>(initial ? { s: 'popped', ...initial } : { s: 'ready' });
  const [pull, setPull] = useState(0);
  const start = useRef<number | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  const pop = async () => {
    setPhase({ s: 'pulling' });
    try {
      const r = await holidayApi.spin('cracker', puzzleDate);
      if ('joke' in r) {
        setPhase({ s: 'popped', joke: r.joke, coins: r.coins });
        sfx.playChestOpenSound();
        const el = boxRef.current;
        if (el) spawnBurst(el, el.offsetWidth / 2, el.offsetHeight / 2, 'confetti', 20);
      } else {
        setPull(0);
        setPhase({ s: r.status === 'locked' ? 'locked' : r.status === 'not_played' ? 'not_played' : 'error' });
      }
    } catch {
      setPull(0);
      setPhase({ s: 'error' });
    }
  };

  const tug = (d: number) => {
    const next = Math.max(0, Math.min(SNAP, d));
    setPull(next);
    if (next >= SNAP) void pop();
  };

  const canPull = phase.s === 'ready' || phase.s === 'error' || phase.s === 'locked';
  const onDown = (e: PointerEvent) => {
    if (!canPull) return;
    start.current = e.clientX;
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };
  const onMove = (e: PointerEvent) => {
    if (start.current === null || !canPull) return;
    tug(Math.abs(e.clientX - start.current) / 2);
  };
  const onUp = () => {
    if (start.current === null) return;
    start.current = null;
    if (canPull && pull < SNAP) setPull(0);
  };

  const popped = phase.s === 'popped';
  return (
    <div data-testid="holiday-cracker" ref={boxRef} className="relative flex flex-col items-center gap-2">
      <button
        type="button"
        disabled={!canPull}
        aria-label={t('holiday.cracker.pullLabel', 'Pull the cracker')}
        onClick={() => canPull && tug(pull + TAP_STEP)}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        className="relative flex h-16 w-56 touch-none select-none items-center justify-center"
      >
        <span
          className={cn('absolute end-1/2 h-10 w-24 rounded-s-full border-[3px] border-black bg-neo-holiday-red shadow-hard-sm', styles.tug, popped && styles.snapLeft)}
          style={popped ? undefined : { transform: `translateX(${-pull / 2}px) rotate(${-pull / 10}deg)` }}
        />
        <span
          className={cn('absolute start-1/2 h-10 w-24 rounded-e-full border-[3px] border-black bg-neo-holiday-gold shadow-hard-sm', styles.tug, popped && styles.snapRight)}
          style={popped ? undefined : { transform: `translateX(${pull / 2}px) rotate(${pull / 10}deg)` }}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {popped && <img src="/holidays/gold-cracker-crown.webp" alt="" width={250} height={187} className={cn('relative h-12 w-auto', styles.pop)} />}
      </button>
      <p role="status" className="min-h-[2.5rem] max-w-xs text-center text-sm font-bold">
        {phase.s === 'popped'
          ? `${t(`holiday.cracker.joke.${phase.joke}`, 'What do snowmen eat for breakfast? Frosted flakes!')} ${t('holiday.reward.coins', '+{count} coins', { count: phase.coins })}`
          : phase.s === 'not_played'
            ? t('holiday.cracker.notPlayed', 'Finish today’s daily while signed in to pull your cracker.')
            : phase.s === 'locked'
            ? t('holiday.cracker.locked', 'Crackers need two! It opens once a table-mate or a friend you invited finishes today’s daily.')
            : phase.s === 'error'
              ? t('holiday.cracker.error', 'The cracker didn’t snap. Try again.')
              : t('holiday.cracker.prompt', 'Drag or tap to pull your cracker')}
      </p>
    </div>
  );
}
