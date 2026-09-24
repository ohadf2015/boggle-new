'use client';

import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import styles from './MiniGrid.module.css';

interface MiniGridWordBarProps {
  demoWord: string;
  /** Letters traced so far, in order. */
  filledLetters: string[];
  showSuccess: boolean;
  dir: 'ltr' | 'rtl';
}

// Six particles on a 24px ring; offsets are CSS vars read by the burst keyframe.
const BURST = Array.from({ length: 6 }, (_, i) => ({
  '--bx': `${Math.round(Math.cos((i * Math.PI * 2) / 6) * 24)}px`,
  '--by': `${Math.round(Math.sin((i * Math.PI * 2) / 6) * 24)}px`,
})) as React.CSSProperties[];

/**
 * The word being traced, one slot per target letter, with a progress fill
 * and a success check. Visible at rest; motion is CSS-only
 * (MiniGrid.module.css) and switches off under prefers-reduced-motion.
 */
const MiniGridWordBar: React.FC<MiniGridWordBarProps> = ({ demoWord, filledLetters, showSuccess, dir }) => {
  const total = demoWord.length || 1;
  const progress = Math.min(1, filledLetters.length / total);

  return (
    <div
      data-testid="mini-grid-word-bar"
      className={cn('mt-5 text-center', styles.bar)}
      dir={dir}
      style={{ transform: `scale(${1 + 0.02 * progress})` }}
    >
      <div className="relative inline-flex items-center gap-3 overflow-hidden rounded-neo border-3 border-neo-white/50 bg-neo-navy/90 px-5 py-3 text-neo-white shadow-hard">
        {/* Progress fill grows from the reading-start edge. */}
        <div
          aria-hidden
          className={cn('absolute inset-0 origin-left bg-neo-lime/25 rtl:origin-right', styles.fill)}
          style={{ transform: `scaleX(${progress})` }}
        />

        {demoWord.split('').map((targetLetter, i) => {
          const filled = i < filledLetters.length;
          return (
            <span
              key={`mini-letter-${i}-${targetLetter}`}
              data-testid={`mini-grid-letter-${i}`}
              data-filled={filled ? 'true' : 'false'}
              className={cn(
                'relative z-10 flex h-10 w-10 items-center justify-center rounded-md text-xl font-black sm:h-12 sm:w-12 sm:text-2xl',
                filled
                  ? cn('border-2 border-neo-black bg-neo-lime text-neo-black shadow-hard-sm', styles.slotFilled)
                  : 'border-2 border-neo-white/40 bg-neo-white/20 text-neo-white'
              )}
            >
              {filled ? filledLetters[i] : targetLetter}
            </span>
          );
        })}

        {showSuccess && (
          <div
            data-testid="mini-grid-success"
            className={cn(
              'relative z-10 ms-1 flex h-9 w-9 items-center justify-center rounded-full border-3 border-neo-black bg-neo-lime shadow-hard-sm sm:h-10 sm:w-10',
              styles.check
            )}
          >
            <Check className="h-5 w-5 text-neo-black" strokeWidth={3} />
            {BURST.map((style, i) => (
              <span
                key={`burst-${i}`}
                aria-hidden
                className={cn('absolute h-1.5 w-1.5 rounded-full bg-neo-yellow', styles.burst)}
                style={style}
              />
            ))}
          </div>
        )}
      </div>

      <p
        data-testid="mini-grid-count"
        className={cn(
          'mt-2 text-xs font-bold text-neo-white transition-opacity duration-200',
          filledLetters.length > 0 ? 'opacity-100' : 'opacity-60'
        )}
      >
        {filledLetters.length}/{demoWord.length}
      </p>
    </div>
  );
};

export default MiniGridWordBar;
