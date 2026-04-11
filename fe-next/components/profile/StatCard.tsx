'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { cn } from '@/lib/utils';

export type StatColor = 'cyan' | 'pink' | 'lime' | 'purple';

const colorMap: Record<StatColor, { text: string; iconBg: string; iconText: string; bar: string }> = {
  cyan: {
    text: 'text-neo-cyan',
    iconBg: 'bg-neo-cyan/10',
    iconText: 'text-neo-cyan',
    bar: 'bg-neo-cyan',
  },
  pink: {
    text: 'text-neo-pink',
    iconBg: 'bg-neo-pink/10',
    iconText: 'text-neo-pink',
    bar: 'bg-neo-pink',
  },
  lime: {
    text: 'text-neo-lime',
    iconBg: 'bg-neo-lime/10',
    iconText: 'text-neo-lime',
    bar: 'bg-neo-lime',
  },
  purple: {
    text: 'text-neo-purple',
    iconBg: 'bg-neo-purple/10',
    iconText: 'text-neo-purple',
    bar: 'bg-neo-purple',
  },
};

export interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  isDarkMode: boolean;
  highlight?: boolean;
  color?: StatColor;
  /** Decorative progress 0-100 */
  progress?: number;
  /** Stagger delay for entrance animation */
  index?: number;
}

/** Animated counter that counts up numeric values */
function AnimatedValue({ value }: { value: string | number }) {
  const [display, setDisplay] = useState<string | number>(typeof value === 'number' ? 0 : value);
  const ref = useRef<HTMLParagraphElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    if (typeof value !== 'number') { setDisplay(value); return; }

    // Parse numeric strings with commas (e.g., "1,234")
    const target = value;
    if (target === 0) { setDisplay(0); return; }

    const duration = 800;
    const startTime = performance.now();
    let frame: number;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(target * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, inView]);

  return <span ref={ref}>{typeof display === 'number' ? display.toLocaleString() : display}</span>;
}

export function StatCard({ icon, label, value, isDarkMode, highlight = false, color, progress, index = 0 }: StatCardProps): React.ReactNode {
  const c = color ? colorMap[color] : null;
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-50px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={{ type: 'spring', stiffness: 300, damping: 20, delay: index * 0.08 }}
      whileHover={{ scale: 1.03, y: -2 }}
      className="bg-slate-800/40 backdrop-blur-sm p-5 rounded-[20px] border border-white/[0.08]"
    >
      {/* Icon box */}
      <motion.div
        className={cn(
          'w-10 h-10 rounded-xl flex items-center justify-center text-lg mb-3',
          c ? `${c.iconBg} ${c.iconText}` : 'bg-slate-700/50 text-gray-400'
        )}
        initial={{ scale: 0, rotate: -20 }}
        animate={inView ? { scale: 1, rotate: 0 } : {}}
        transition={{ type: 'spring', stiffness: 400, damping: 15, delay: index * 0.08 + 0.1 }}
      >
        {icon}
      </motion.div>

      {/* Label */}
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">
        {label}
      </p>

      {/* Value — animated count-up for numbers */}
      <p className={cn(
        'text-2xl font-black',
        c ? c.text : 'text-white'
      )}>
        {inView ? <AnimatedValue value={value} /> : '0'}
      </p>

      {/* Decorative progress bar — animated fill */}
      {progress !== undefined && (
        <div className="mt-3 h-1 bg-white/[0.06] rounded-full overflow-hidden">
          <motion.div
            className={cn('h-full rounded-full', c ? c.bar : 'bg-neo-cyan')}
            initial={{ width: 0 }}
            animate={inView ? { width: `${Math.min(100, Math.max(0, progress))}%` } : {}}
            transition={{ duration: 0.8, ease: 'easeOut', delay: index * 0.08 + 0.3 }}
          />
        </div>
      )}
    </motion.div>
  );
}

export default StatCard;
