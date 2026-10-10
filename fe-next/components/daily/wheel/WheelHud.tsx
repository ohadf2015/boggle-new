'use client';

import React, { type RefObject } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Check, Clock, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WheelHudProps {
  t: (key: string, params?: Record<string, string | number>) => string;
  onExit?: () => void;
  practice: boolean;
  timeLeft: number;
  duration: number;
  /** Combo slot is dropped with the rest of the competitive layer. */
  showCombo: boolean;
  combo: number;
  score: number;
  wordsCount: number;
  /** Where launched letters land. */
  scoreRef: RefObject<HTMLSpanElement | null>;
  onEndPractice: () => void;
}

/** Top of the wheel: exit and clock on the start side, the score medal in the middle where no page chrome covers it. */
const WheelHud: React.FC<WheelHudProps> = ({
  t, onExit, practice, timeLeft, duration, showCombo, combo, score, wordsCount, scoreRef, onEndPractice,
}) => {
  const urgent = timeLeft <= 10;
  const warm = timeLeft <= 30;
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="w-full space-y-1.5">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center w-full gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {onExit && (
            <button
              type="button"
              onClick={onExit}
              aria-label={t('common.quit')}
              data-testid="wheel-exit"
              className="flex items-center justify-center w-8 h-8 rounded-full border-2 border-neo-cream/10 bg-neo-black/50 text-neo-white hover:bg-neo-black/70 active:scale-95 transition-all duration-150 shrink-0"
            >
              <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
            </button>
          )}
          {!practice && (
            <div
              data-testid="wheel-timer"
              className={cn(
                'flex items-center gap-1.5 font-neo-display font-black text-lg sm:text-xl shrink-0',
                urgent ? 'text-neo-red animate-pulse' : warm ? 'text-neo-orange' : 'text-neo-white',
              )}
            >
              <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="tabular-nums">{minutes}:{seconds.toString().padStart(2, '0')}</span>
            </div>
          )}
        </div>

        <div
          data-testid="wheel-score"
          aria-label={`${t('wordWheel.scoreLabel')} ${score}, ${t('wordWheel.foundWords')} ${wordsCount}`}
          className="relative flex items-center gap-2 ps-3 pe-1.5 py-1 rounded-full border-3 border-neo-black bg-neo-navy-light shadow-[3px_3px_0_#000]"
        >
          <span ref={scoreRef} className="inline-flex">
            <m.span
              key={score}
              className="font-neo-display font-black text-neo-lime text-2xl leading-none tabular-nums"
              initial={{ scale: 1.5, y: -2 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 420, damping: 14 }}
            >
              {score}
            </m.span>
          </span>
          <span className="flex items-center gap-0.5 rounded-full bg-neo-black/50 px-1.5 py-0.5 text-[11px] font-bold text-neo-white tabular-nums">
            <Check className="w-3 h-3 text-neo-lime" strokeWidth={3} />
            {wordsCount}
          </span>
          {showCombo && (
            <div data-testid="combo-slot" className="absolute start-full ms-2 top-1/2 -translate-y-1/2">
              <AnimatePresence>
                {combo >= 2 && (
                  <m.div
                    className="flex items-center gap-1 px-1.5 py-0.5 rounded-neo border-2 border-neo-black bg-linear-to-r from-neo-pink to-neo-red shadow-[2px_2px_0_#000]"
                    initial={{ scale: 0, rotate: -12 }}
                    animate={{ scale: 1, rotate: -4 }}
                    exit={{ scale: 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 16 }}
                  >
                    <Flame className="w-3.5 h-3.5 text-neo-white" />
                    <span className="font-neo-display font-black text-neo-white text-xs sm:text-sm">x{combo}</span>
                  </m.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        <div aria-hidden />
      </div>

      {practice ? (
        <button
          type="button"
          onClick={onEndPractice}
          className="w-full bg-neo-lime text-neo-black border-2 border-neo-black rounded-neo py-2 px-3 font-neo-display font-black text-sm shadow-hard active:shadow-hard-pressed active:translate-x-px active:translate-y-px"
        >
          {t('practice.endRun')}
        </button>
      ) : (
        <div className="w-full h-1.5 rounded-full bg-neo-navy-light border border-neo-cream/10 overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-[width] duration-300',
              urgent ? 'bg-neo-red' : warm ? 'bg-neo-orange' : 'bg-linear-to-r from-neo-lime to-neo-cyan',
            )}
            style={{ width: `${(timeLeft / duration) * 100}%` }}
          />
        </div>
      )}
    </div>
  );
};

export default WheelHud;
