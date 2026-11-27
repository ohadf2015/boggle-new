'use client';

import { memo, useEffect, useRef, type ReactNode } from 'react';
import { m } from 'framer-motion';
import { X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useShouldReduceMotion } from '@/contexts/AccessibilityContext';
import { HUD_FIRE_SLOT } from '@/components/earthquake/FireRoundIndicator';
import { MpRoundMute } from '@/components/multiplayer/round/MpRoundMute';
import { formatClock } from '@/components/game/shell/formatClock';
import { MOTION } from '@/components/motion/tokens';
import { cn } from '@/lib/utils';

export type TimerTone = 'lime' | 'yellow' | 'pink';

const URGENT_SECONDS = 10;

export function timerTone(remaining: number, total: number): TimerTone {
  if (remaining <= URGENT_SECONDS) return 'pink';
  return remaining / Math.max(total, 1) <= 0.4 ? 'yellow' : 'lime';
}

const TONE_FILL: Record<TimerTone, string> = {
  lime: 'bg-neo-lime',
  yellow: 'bg-neo-yellow',
  pink: 'bg-neo-pink',
};

const LIP = 'shadow-[0_3px_0_rgb(var(--neo-black))]';

export const HUD_EXIT_BUTTON = cn(
  'grid h-10 w-10 shrink-0 place-items-center rounded-xl border-2 border-neo-black bg-neo-navy-light text-neo-cream active:translate-y-0.5 active:shadow-none tv:h-16 tv:w-16',
  LIP,
);

export function GameTimerBar({ remaining, total, gentle = false, className }: { remaining: number; total: number; gentle?: boolean; className?: string }) {
  const { t } = useLanguage();
  const reduceMotion = useShouldReduceMotion();
  const left = Math.max(0, remaining);
  const tone = timerTone(left, total);
  const urgent = !gentle && tone === 'pink' && left > 0;
  return (
    <div className={cn('relative flex min-w-0 flex-1 items-center gap-2', className)}>
      <div
        role="progressbar"
        aria-label={t('singlePlayer.gameTime')}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={Math.ceil(left)}
        aria-valuetext={formatClock(left)}
        data-tone={gentle ? 'lime' : tone}
        data-urgent={String(urgent)}
        className="relative h-5 min-w-0 flex-1 overflow-hidden rounded-full border-2 border-neo-black bg-neo-black/45 tv:h-8"
      >
        <div
          data-testid="hud-timer-fill"
          className={cn(
            'absolute inset-0 origin-left rounded-full rtl:origin-right',
            TONE_FILL[gentle ? 'lime' : tone],
            !reduceMotion && 'transition-[transform,background-color] duration-1000 ease-linear',
            urgent && !reduceMotion && 'animate-pulse',
          )}
          style={{ transform: `scaleX(${total > 0 ? Math.min(1, left / total) : 0})` }}
        >
          <span aria-hidden className="absolute inset-x-2 top-[3px] h-1 rounded-full bg-neo-white/45" />
        </div>
      </div>
      <span
        aria-hidden
        dir="ltr"
        className={cn('w-10 shrink-0 text-end font-neo-display text-base font-bold tabular-nums leading-none tv:w-20 tv:text-3xl', urgent ? 'text-neo-pink' : 'text-neo-cream')}
      >
        {formatClock(left)}
      </span>
      <span {...{ [HUD_FIRE_SLOT]: '' }} className="absolute inset-y-0 start-1/2 flex -translate-x-1/2 items-center rtl:translate-x-1/2 empty:hidden" />
    </div>
  );
}

export function HudScorePill({ score, className }: { score: number; className?: string }) {
  const { t } = useLanguage();
  const reduceMotion = useShouldReduceMotion();
  const first = useRef(true);
  useEffect(() => { first.current = false; }, []);
  return (
    <span
      data-testid="hud-score"
      aria-label={`${t('common.score')}: ${score}`}
      className={cn(
        'inline-flex h-10 min-w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-neo-black bg-neo-cream px-3 font-neo-display text-xl font-bold tabular-nums text-neo-black tv:h-16 tv:min-w-24 tv:text-4xl',
        LIP,
        className,
      )}
    >
      <m.span
        key={score}
        dir="ltr"
        initial={reduceMotion || first.current ? false : { scale: 1.45, y: -2 }}
        animate={{ scale: 1, y: 0 }}
        transition={MOTION.pop}
        className="inline-block"
      >
        {score}
      </m.span>
    </span>
  );
}

export interface GameHudProps {
  onExit?: () => void;
  /** null hides the bar (untimed practice, or a teacher turned the clock off). */
  remaining: number | null;
  total: number;
  score: number;
  gentle?: boolean;
  start?: ReactNode;
  end?: ReactNode;
  mute?: boolean;
  className?: string;
}

/** The lesson-style top row: exit · one thick timer bar · score pill (· mute). */
function GameHudImpl({ onExit, remaining, total, score, gentle, start, end, mute = true, className }: GameHudProps) {
  const { t } = useLanguage();
  return (
    <div data-testid="game-hud" className={cn('flex h-14 w-full items-center gap-2.5 tv:h-24 tv:gap-4', className)}>
      {onExit && (
        <button type="button" onClick={onExit} aria-label={t('common.exit')} className={HUD_EXIT_BUTTON}>
          <X className="h-5 w-5 tv:h-8 tv:w-8" strokeWidth={3} aria-hidden />
        </button>
      )}
      {start}
      {remaining !== null ? <GameTimerBar remaining={remaining} total={total} gentle={gentle} /> : <div className="flex flex-1 justify-center"><span {...{ [HUD_FIRE_SLOT]: '' }} className="inline-flex empty:hidden" /></div>}
      <HudScorePill score={score} />
      {end}
      {mute && <MpRoundMute />}
    </div>
  );
}

export const GameHud = memo(GameHudImpl);
