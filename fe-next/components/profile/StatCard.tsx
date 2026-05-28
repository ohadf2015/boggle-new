'use client';

import React, { useEffect, useRef, useState } from 'react';
import { m, useInView } from 'framer-motion';
import { cn } from '@/lib/utils';

export type StatColor = 'cyan' | 'pink' | 'lime' | 'purple';

const colorMap: Record<StatColor, { value: string; ribbon: string; chipBg: string; chipText: string; shadow: string }> = {
  cyan:   { value: 'text-neo-cyan',   ribbon: 'bg-neo-cyan',   chipBg: 'bg-neo-cyan',   chipText: 'text-neo-black', shadow: 'shadow-hard-cyan' },
  pink:   { value: 'text-neo-pink',   ribbon: 'bg-neo-pink',   chipBg: 'bg-neo-pink',   chipText: 'text-neo-white', shadow: 'shadow-hard-pink' },
  lime:   { value: 'text-neo-lime',   ribbon: 'bg-neo-lime',   chipBg: 'bg-neo-lime',   chipText: 'text-neo-black', shadow: 'shadow-hard-lime' },
  purple: { value: 'text-neo-purple', ribbon: 'bg-neo-purple', chipBg: 'bg-neo-purple', chipText: 'text-neo-white', shadow: 'shadow-hard-lg' },
};

export interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  isDarkMode: boolean;
  highlight?: boolean;
  color?: StatColor;
  /** @deprecated decorative progress bar removed in v2 — kept for back-compat */
  progress?: number;
  index?: number;
}

function AnimatedValue({ value }: { value: string | number }) {
  const [display, setDisplay] = useState<string | number>(typeof value === 'number' ? 0 : value);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    if (typeof value !== 'number') { setDisplay(value); return; }
    const target = value;
    if (target === 0) { setDisplay(0); return; }

    const duration = 900;
    const startTime = performance.now();
    let frame: number;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      setDisplay(Math.round(target * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, inView]);

  return <span ref={ref}>{typeof display === 'number' ? display.toLocaleString() : display}</span>;
}

export function StatCard({ icon, label, value, color, index = 0 }: StatCardProps): React.ReactNode {
  const c = color ? colorMap[color] : colorMap.cyan;
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-50px' });
  const indexLabel = String(index + 1).padStart(2, '0');

  return (
    <m.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ type: 'spring', stiffness: 260, damping: 22, delay: index * 0.07 }}
      whileHover={{ y: -3 }}
      whileTap={{ y: 1 }}
      className={cn(
        'group relative bg-neo-navy-light overflow-hidden',
        'border-3 border-neo-black rounded-neo',
        c.shadow,
        'transition-transform duration-150',
      )}
    >
      {/* Halftone color ribbon — top edge */}
      <div className={cn('relative h-2.5 w-full', c.ribbon)}>
        <div className="absolute inset-0 texture-halftone-comic opacity-30 mix-blend-overlay" aria-hidden />
      </div>

      {/* Body */}
      <div className="relative p-4 pt-5 pb-4">
        {/* Floating icon chip — physical, with own shadow */}
        <div
          className={cn(
            'absolute top-0 inset-e-3 -translate-y-1/2',
            'w-10 h-10 flex items-center justify-center',
            'rounded-neo border-2 border-neo-black shadow-hard-sm',
            c.chipBg, c.chipText,
          )}
          aria-hidden
        >
          <span className="[&>svg]:w-5 [&>svg]:h-5 text-base">{icon}</span>
        </div>

        {/* Label — small, mono-track, separated from value */}
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-neo-white mb-1.5">
          {label}
        </p>

        {/* Value — outsized Fredoka, single solid color (NO gradient text) */}
        <p className={cn(
          'font-neo-display font-black leading-none tracking-tight',
          'text-[1.75rem] sm:text-[2rem] lg:text-[2.25rem]',
          c.value,
        )}>
          {inView ? <AnimatedValue value={value} /> : <span aria-hidden>0</span>}
        </p>

        {/* Bottom-end index marker — tabular slop-killer detail */}
        <div className="mt-3 flex items-end justify-between">
          <span
            className="font-mono text-[10px] tracking-tight text-neo-white tabular-nums"
            aria-hidden
          >
            {indexLabel} / 04
          </span>
          {/* Two short tick marks — replaces the meaningless progress bar */}
          <div className="flex items-end gap-[3px]" aria-hidden>
            <span className={cn('block w-[3px] h-2 rounded-sm opacity-40', c.ribbon)} />
            <span className={cn('block w-[3px] h-3 rounded-sm opacity-70', c.ribbon)} />
            <span className={cn('block w-[3px] h-4 rounded-sm', c.ribbon)} />
          </div>
        </div>
      </div>
    </m.div>
  );
}

export default StatCard;
