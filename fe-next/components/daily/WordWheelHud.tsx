import React, { useSyncExternalStore } from 'react';
import type { WheelClock } from './wheel/useWheelTimer';
import { m, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

type T = (key: string, params?: Record<string, string | number>) => string;

interface WordWheelHudProps {
  t: T;
  /** Static time; ignored when `clock` is given. */
  timeLeft?: number;
  /** Live countdown: only the HUD re-renders each second. */
  clock?: WheelClock;
  duration: number;
  combo: number;
  /** Real combo multiplier on bonus days; the chip shows it instead of the chain count. */
  multiplier?: number | null;
  /** Bumped when a combo of 2+ breaks, to flash the drop. */
  comboBreakId?: number;
  showCombo?: boolean;
  practice?: boolean;
  onEndPractice?: () => void;
  onExit?: () => void;
  className?: string;
}

const noClock = () => () => {};

export default function WordWheelHud({
  t, timeLeft: staticTime, clock, duration, combo, multiplier = null, comboBreakId = 0,
  showCombo = false, practice = false, onEndPractice, onExit, className,
}: WordWheelHudProps) {
  const liveTime = useSyncExternalStore(
    clock?.subscribe ?? noClock,
    () => clock?.timeLeft() ?? staticTime ?? duration,
    () => clock?.timeLeft() ?? staticTime ?? duration,
  );
  const timeLeft = liveTime;
  const comboLabel = multiplier != null ? `×${multiplier}` : `x${combo}`;
  const urgent = timeLeft <= 10;
  const warn = timeLeft <= 30;
  const mm = Math.floor(timeLeft / 60);
  const ss = String(timeLeft % 60).padStart(2, '0');

  return (
    <div className={cn('w-full flex items-center gap-2.5 h-10', className)}>
      {onExit && (
        <button
          type="button"
          onClick={onExit}
          aria-label={t('common.quit')}
          data-testid="wheel-exit"
          className="w-9 h-9 shrink-0 grid place-items-center rounded-full border-2 border-neo-white/15 bg-neo-black/40 text-neo-white active:scale-95 transition-transform"
        >
          <ArrowLeft className="w-4 h-4 rtl:rotate-180" aria-hidden />
        </button>
      )}
      {practice ? (
        <div className="flex-1 flex justify-end">
          <button
            type="button"
            onClick={onEndPractice}
            className="h-9 px-4 rounded-full border-[3px] border-neo-black bg-neo-lime text-neo-black font-neo-display font-black text-sm shadow-[2px_2px_0_#000] active:translate-y-px"
          >
            {t('practice.endRun')}
          </button>
        </div>
      ) : (
        <>
          <m.div
            data-testid="wheel-timer"
            className={cn(
              'shrink-0 h-9 px-3 flex items-center rounded-full border-2 font-neo-display font-black text-lg tabular-nums',
              urgent ? 'border-neo-red bg-neo-red text-neo-white' : warn ? 'border-neo-orange/70 text-neo-orange bg-neo-black/40' : 'border-neo-white/15 text-neo-white bg-neo-black/40',
            )}
            animate={urgent ? { scale: [1, 1.08, 1] } : { scale: 1 }}
            transition={urgent ? { duration: 1, repeat: Infinity } : { duration: 0.2 }}
          >
            {mm}:{ss}
          </m.div>
          <div
            data-testid="wheel-time-bar"
            role="progressbar"
            aria-label={t('wordWheel.timeLeft')}
            aria-valuemin={0}
            aria-valuemax={duration}
            aria-valuenow={timeLeft}
            className="relative flex-1 h-2 rounded-full bg-neo-white/10 overflow-hidden"
          >
            <div
              data-testid="wheel-time-fill"
              className={cn(
                // transform-origin has no logical form, so the RTL side is set explicitly.
                'absolute inset-0 rounded-full origin-left rtl:origin-right transition-transform duration-1000 ease-linear will-change-transform',
                urgent ? 'bg-neo-red' : warn ? 'bg-neo-orange' : 'bg-linear-to-r from-neo-cyan to-neo-lime',
              )}
              style={{ transform: `scaleX(${Math.max(0, Math.min(1, timeLeft / duration))})` }}
            />
          </div>
        </>
      )}
      {showCombo && (
        <div data-testid="combo-slot" className="w-14 shrink-0 flex justify-end">
          <AnimatePresence mode="popLayout">
            {combo >= 2 ? (
              <m.div
                key={`combo-${comboLabel}`}
                data-testid="combo-chip"
                aria-label={t('wordWheel.comboLabel', { value: comboLabel })}
                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full border-2 border-neo-black bg-neo-pink text-neo-white shadow-[0_0_10px_rgba(255,20,147,0.5)]"
                initial={{ scale: 1.6 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 14 }}
              >
                <Flame className="w-3.5 h-3.5" aria-hidden />
                <span className="font-neo-display font-black text-xs tabular-nums">{comboLabel}</span>
              </m.div>
            ) : comboBreakId > 0 ? (
              <m.div
                key={`break-${comboBreakId}`}
                data-testid="combo-break"
                className="px-1.5 py-0.5 rounded-full border-2 border-neo-black bg-neo-navy-light text-neo-white/70 font-neo-display font-black text-[10px] uppercase line-through"
                initial={{ x: 0, opacity: 1 }}
                animate={{ x: [0, -5, 5, -3, 0], opacity: [1, 1, 1, 1, 0] }}
                transition={{ duration: 0.8 }}
              >
                {t('wordWheel.comboLost')}
              </m.div>
            ) : null}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
