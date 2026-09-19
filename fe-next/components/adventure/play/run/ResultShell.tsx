'use client';

/** Full-screen navy stage shared by the cleared / run-over / run-complete screens. */
import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

export function ResultShell({ children, tone = 'navy' }: { children: ReactNode; tone?: 'navy' | 'dusk' }) {
  return (
    <div role="dialog" aria-modal="true"
      className={cn('absolute inset-0 z-30 flex flex-col overflow-hidden text-neo-cream',
        tone === 'dusk' ? 'bg-[#1a0f24]' : 'bg-[#0f1b3d]')}>
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,rgba(255,255,255,0.08)_0%,transparent_60%)]" />
      <div className="relative mx-auto flex h-full w-full max-w-md flex-col px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))]">
        {children}
      </div>
    </div>
  );
}

/** Big tilted stamp headline. */
export function Stamp({ children, className }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.h2
      initial={reduce ? false : { scale: 2.2, rotate: -12, opacity: 0 }}
      animate={{ scale: 1, rotate: -3, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 380, damping: 16 }}
      className={cn('mx-auto inline-block rounded-2xl border-[4px] border-black px-4 py-1.5 text-center font-neo-display text-[2rem] font-bold uppercase leading-none text-black shadow-[6px_6px_0_#000] sm:text-5xl', className)}
    >
      {children}
    </motion.h2>
  );
}

export const primaryBtn = 'flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border-[3px] border-black py-3 font-neo-display text-lg font-bold text-black shadow-[4px_4px_0_#000] active:translate-y-0.5 active:shadow-[1px_1px_0_#000] disabled:opacity-50';
export const squareBtn = 'rounded-xl border-[3px] border-black bg-neo-cream p-3 text-black shadow-[4px_4px_0_#000] active:translate-y-0.5 active:shadow-[1px_1px_0_#000]';
