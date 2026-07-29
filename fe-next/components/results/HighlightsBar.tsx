'use client';

import type { ReactNode } from 'react';
import { m, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface HighlightsBarProps {
  stats: Array<{
    label: string;
    value: string | number;
    icon: ReactNode;
    color: string; // Tailwind text color class like 'text-neo-pink'
  }>;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      delay: 0.5,
      staggerChildren: 0.12,
    },
  },
};

const statVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.85 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 300,
      damping: 18,
    },
  },
};

const iconVariants = {
  hidden: { scale: 0, rotate: -90 },
  visible: {
    scale: 1,
    rotate: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 400,
      damping: 12,
      delay: 0.1,
    },
  },
};

const dividerVariants = {
  hidden: { scaleY: 0, opacity: 0 },
  visible: {
    scaleY: 1,
    opacity: 1,
    transition: { duration: 0.3 },
  },
};

export default function HighlightsBar({ stats }: HighlightsBarProps) {
  const reducedMotion = useReducedMotion();
  if (!stats.length) return null;

  return (
    <m.section
      variants={reducedMotion ? undefined : containerVariants}
      initial="hidden"
      animate="visible"
      className={cn(
        'flex justify-around items-center py-4 rounded-neo',
        'bg-neo-navy-light/40 border-y border-white/5',
        stats.length > 3 && 'overflow-x-auto'
      )}
    >
      {stats.map((stat, index) => (
        <m.div
          key={stat.label}
          className="contents"
          variants={reducedMotion ? undefined : statVariants}
        >
          {index > 0 && (
            <m.div
              className="w-px h-8 bg-white/5 shrink-0"
              variants={reducedMotion ? undefined : dividerVariants}
            />
          )}
          <div className="text-center px-2 shrink-0">
            <p className="text-[10px] font-bold text-white uppercase tracking-widest mb-1">
              {stat.label}
            </p>
            <div className="flex items-center justify-center gap-1.5">
              <m.span
                className={cn('text-xs', stat.color)}
                variants={reducedMotion ? undefined : iconVariants}
              >
                {stat.icon}
              </m.span>
              <span
                className={cn(
                  'text-base font-black uppercase tracking-tight tabular-nums',
                  stat.color
                )}
              >
                {stat.value}
              </span>
            </div>
          </div>
        </m.div>
      ))}
    </m.section>
  );
}
