'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';

export type StatItem = {
  value: string;
  label: string;
  color?: string;
};

type StatPanelProps = {
  stats: StatItem[];
  isDarkMode: boolean;
};

const COLOR_MAP: Record<string, { bg: string; border: string }> = {
  lime: { bg: 'bg-neo-lime', border: 'border-neo-lime' },
  yellow: { bg: 'bg-neo-yellow', border: 'border-neo-yellow' },
  pink: { bg: 'bg-neo-pink', border: 'border-neo-pink' },
  cyan: { bg: 'bg-neo-cyan', border: 'border-neo-cyan' },
  orange: { bg: 'bg-neo-orange', border: 'border-neo-orange' },
};

function AnimatedValue({ value }: { value: string }) {
  const [display, setDisplay] = useState('0');
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const numericMatch = value.match(/^([\d,.]+)/);
          if (!numericMatch) {
            setDisplay(value);
            return;
          }
          const target = parseFloat(numericMatch[1].replace(/,/g, ''));
          const suffix = value.slice(numericMatch[1].length);
          const duration = 1200;
          const start = performance.now();

          const animate = (now: number) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = Math.round(target * eased);
            setDisplay(current.toLocaleString() + suffix);
            if (progress < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [value]);

  return <span ref={ref}>{display}</span>;
}

export default function StatPanel({ stats, isDarkMode }: StatPanelProps) {
  const columns = stats.length <= 2 ? 'grid-cols-2' : stats.length === 3 ? 'grid-cols-3' : 'grid-cols-2 md:grid-cols-4';

  return (
    <div className={cn('my-8 grid gap-4', columns)}>
      {stats.map((stat, i) => {
        const color = COLOR_MAP[stat.color || 'lime'] || COLOR_MAP.lime;
        return (
          <AdaptiveMotion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.4 }}
            viewport={{ once: true }}
            className={cn(
              'p-4 rounded-neo border-3 border-neo-black shadow-hard-sm text-center',
              isDarkMode ? 'bg-slate-800' : color.bg
            )}
          >
            <div className={cn(
              'text-2xl md:text-3xl font-black',
              isDarkMode ? 'text-white' : 'text-neo-black'
            )}>
              <AnimatedValue value={stat.value} />
            </div>
            <div className={cn(
              'text-xs font-bold mt-1 uppercase tracking-wide',
              isDarkMode ? 'text-gray-400' : 'text-neo-black/70'
            )}>
              {stat.label}
            </div>
          </AdaptiveMotion.div>
        );
      })}
    </div>
  );
}
