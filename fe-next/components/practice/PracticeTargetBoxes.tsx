'use client';

import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';

/**
 * Visual mimic of the real `<SurvivalClueBoxes>` letter-grid (one box per
 * target-word letter). Practice always shows the full target since players
 * already know what they're hunting for — no progressive reveal, no clue
 * progression, just neo-brutalist letter boxes.
 *
 * Sizing tracks SurvivalClueBoxes (DailyWordHunt 187–192) so the visual
 * weight matches the real game when practice is opened side-by-side.
 */
interface Props {
  word: string;
  /** When true, every box flips to the success state (lime). */
  solved?: boolean;
  /** ltr / rtl direction. */
  dir?: 'ltr' | 'rtl';
  /** When true, render `?` instead of the actual letters (hidden target). */
  hidden?: boolean;
}

const sizeFor = (len: number) =>
  len <= 4
    ? 'w-11 h-11 sm:w-12 sm:h-12 text-lg sm:text-xl'
    : len <= 6
      ? 'w-10 h-10 sm:w-11 sm:h-11 text-base sm:text-lg'
      : len <= 8
        ? 'w-9 h-9 sm:w-10 sm:h-10 text-sm sm:text-base'
        : 'w-8 h-8 sm:w-9 sm:h-9 text-xs sm:text-sm';

export default function PracticeTargetBoxes({ word, solved = false, dir = 'ltr', hidden = false }: Props) {
  const letters = word.split('');
  const cls = sizeFor(letters.length);

  return (
    <div
      data-testid="practice-target-boxes"
      dir={dir}
      className="flex justify-center flex-wrap gap-1.5 sm:gap-2 px-2"
    >
      {letters.map((letter, idx) => {
        const showHidden = hidden && !solved;
        return (
          <AdaptiveMotion.div
            key={`${idx}-${letter}`}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05, type: 'spring', stiffness: 300, damping: 22 }}
            data-testid={`practice-target-box-${idx}`}
            data-hidden={showHidden ? 'true' : undefined}
            className={
              'flex items-center justify-center rounded-neo border-2 font-bold shadow-hard transition-colors ' +
              cls + ' ' +
              (solved
                ? 'bg-green-500 border-green-700 text-neo-black ring-1 ring-green-300/50'
                : showHidden
                  ? 'bg-neo-black border-neo-black text-white'
                  : 'bg-neo-cream border-neo-black text-neo-black')
            }
          >
            {showHidden ? '?' : letter}
          </AdaptiveMotion.div>
        );
      })}
    </div>
  );
}
