'use client';

import { m, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { EDU_MOTION } from '@/components/education/motion';

const MIN_TILES = 6;

interface ClassroomGuestDemoCodeTilesProps {
  code: string;
  onChange: (value: string) => void;
  label: string;
  error: boolean;
  ready: boolean;
  reduced: boolean;
  describedBy?: string;
}

/** One real input under a row of tiles, so paste, autofill and the phone keyboard behave like a plain field. */
export function ClassroomGuestDemoCodeTiles({ code, onChange, label, error, ready, reduced: reducedProp, describedBy }: ClassroomGuestDemoCodeTilesProps) {
  const reduced = reducedProp || !!useReducedMotion();
  const chars = code.toUpperCase().split('');
  const count = Math.max(MIN_TILES, chars.length);
  const state = error ? 'error' : ready ? 'ready' : 'idle';

  return (
    <m.div
      data-testid="guest-join-tiles"
      data-state={state}
      dir="ltr"
      initial={false}
      animate={!reduced && error ? { x: [0, -10, 9, -6, 4, 0] } : { x: 0 }}
      transition={{ duration: EDU_MOTION.dur.countUp, ease: 'easeOut' }}
      className="group relative flex w-full gap-1.5 rounded-neo-lg p-1 focus-within:ring-4 focus-within:ring-neo-cyan/60 sm:gap-2.5"
    >
      {Array.from({ length: count }, (_, i) => {
        const ch = chars[i] ?? '';
        const isNext = i === chars.length && !error;
        return (
          <m.span
            key={`${i}-${ch}`}
            data-tile=""
            aria-hidden="true"
            initial={!reduced && ch ? { scale: 0.7, y: -4 } : false}
            animate={{ scale: 1, y: 0 }}
            transition={EDU_MOTION.spring.pop}
            className={cn(
              'flex aspect-[4/5] min-w-0 flex-1 items-center justify-center rounded-neo border-[3px] font-neo-display font-black leading-none text-neo-navy',
              'shadow-[0_4px_0_0] transition-[border-color,background-color] duration-150 motion-reduce:transition-none',
              count > 8 ? 'text-2xl sm:text-4xl lg:text-5xl' : 'text-[2rem] sm:text-5xl lg:text-6xl',
              error
                ? 'border-neo-red bg-neo-cream shadow-neo-red'
                : ch
                  ? cn('bg-neo-cream', ready ? 'border-neo-lime-dark shadow-neo-lime-dark' : 'border-neo-black shadow-neo-black')
                  : isNext
                    ? 'border-neo-cyan bg-neo-cyan/15 shadow-neo-cyan-dark group-focus-within:bg-neo-cyan/25'
                    : 'border-neo-lime/45 bg-neo-lime/10 shadow-neo-black',
            )}
          >
            {ch}
            {isNext && (
              <m.span
                data-testid="guest-join-caret"
                className="h-[45%] w-1 rounded-full bg-neo-cyan"
                animate={reduced ? { scaleY: 1 } : { scaleY: [1, 1, 0.15, 1] }}
                transition={reduced ? { duration: 0 } : { duration: 1.1, times: [0, 0.5, 0.7, 1], repeat: Infinity }}
              />
            )}
          </m.span>
        );
      })}
      <input
        type="text"
        value={code}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        aria-invalid={error}
        aria-describedby={describedBy}
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        maxLength={10}
        dir="ltr"
        className="absolute inset-0 size-full cursor-text rounded-neo-lg bg-transparent text-transparent caret-transparent outline-none selection:bg-transparent"
      />
    </m.div>
  );
}
