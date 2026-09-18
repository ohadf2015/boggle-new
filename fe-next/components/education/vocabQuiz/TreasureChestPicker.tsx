/**
 * Treasure Chest Picker
 *
 * Three chests after a correct answer; the student taps ONE. The server
 * decides what is inside (seeded per student, question and chest), so the
 * choice is a real gamble without the client ever knowing the odds.
 *
 * Tap targets are sized inline (not only via Tailwind) so the phone budget is
 * explicit: 3 × 96px + gaps + padding = 328px, inside a 390px phone's 358px.
 *
 * Dark-only surface: bg-neo-navy family, never `bg-neo-cream dark:bg-neo-navy`.
 * No entrance opacity tween (Class 5) — the picked chest wiggles instead.
 */

'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { TranslateFn } from '@/shared/types/vocabQuiz';
import { cn } from '@/lib/utils';
import { ChestIcon } from './ChestIcon';

export interface TreasureChestPickerProps {
  onPick: (index: number) => void;
  disabled?: boolean;
  /** The chest already tapped — wiggles while the server answers. */
  pickedIndex?: number | null;
  t: TranslateFn;
}

const CHEST_SIZE = { width: 96, height: 104, minWidth: 96, minHeight: 104 } as const;

export function TreasureChestPicker({ onPick, disabled, pickedIndex = null, t }: TreasureChestPickerProps) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="flex flex-col items-center gap-2 p-3 w-full">
      <p className="text-center font-neo-display font-bold text-2xl text-neo-yellow">
        {t('vocabQuiz.treasure.prompt')}
      </p>
      <p className="text-center font-neo-body text-sm text-neo-white/80 mb-2">
        {t('vocabQuiz.treasure.hint')}
      </p>

      <div className="flex gap-2 justify-center">
        {[0, 1, 2].map((index) => {
          const picked = pickedIndex === index;
          return (
            <motion.button
              key={index}
              type="button"
              onClick={() => onPick(index)}
              disabled={disabled}
              aria-pressed={picked}
              aria-label={t('vocabQuiz.treasure.chestLabel', { number: index + 1 })}
              style={CHEST_SIZE}
              animate={picked && !reduceMotion ? { rotate: [0, -8, 8, -6, 6, 0], y: [0, -6, 0] } : undefined}
              transition={picked ? { duration: 0.6, repeat: Infinity, repeatDelay: 0.15 } : undefined}
              whileTap={disabled || reduceMotion ? undefined : { scale: 0.92 }}
              className={cn(
                'flex flex-col items-center justify-center',
                'rounded-neo border-[3px] bg-neo-navy-elevated shadow-hard',
                picked ? 'border-neo-yellow' : 'border-neo-cream',
                'disabled:cursor-not-allowed',
                disabled && !picked && 'opacity-50',
                !disabled && 'hover:border-neo-yellow'
              )}
            >
              <ChestIcon size={64} />
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
