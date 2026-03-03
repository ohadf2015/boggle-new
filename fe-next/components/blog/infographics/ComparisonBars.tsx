'use client';

import { cn } from '@/lib/utils';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';

export type ComparisonItem = {
  label: string;
  value: number;
  maxValue?: number;
  color?: string;
  annotation?: string;
};

type ComparisonBarsProps = {
  items: ComparisonItem[];
  isDarkMode: boolean;
};

const BAR_COLORS: Record<string, string> = {
  lime: 'bg-neo-lime',
  yellow: 'bg-neo-yellow',
  pink: 'bg-neo-pink',
  cyan: 'bg-neo-cyan',
  orange: 'bg-neo-orange',
  red: 'bg-red-500',
  green: 'bg-green-500',
};

export default function ComparisonBars({ items, isDarkMode }: ComparisonBarsProps) {
  const maxVal = Math.max(...items.map(i => i.maxValue || i.value));

  return (
    <div className={cn(
      'my-8 p-4 rounded-neo border-3 border-neo-black shadow-hard-sm',
      isDarkMode ? 'bg-slate-800' : 'bg-white'
    )}>
      <div className="space-y-4">
        {items.map((item, i) => {
          const pct = Math.round(((item.value) / maxVal) * 100);
          const barColor = BAR_COLORS[item.color || 'lime'] || BAR_COLORS.lime;
          return (
            <AdaptiveMotion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
              viewport={{ once: true }}
            >
              <div className="flex justify-between items-baseline mb-1">
                <span className={cn(
                  'text-sm font-bold',
                  isDarkMode ? 'text-gray-300' : 'text-neo-black'
                )}>
                  {item.label}
                </span>
                {item.annotation && (
                  <span className={cn(
                    'text-xs',
                    isDarkMode ? 'text-gray-500' : 'text-gray-500'
                  )}>
                    {item.annotation}
                  </span>
                )}
              </div>
              <div className={cn(
                'w-full h-6 rounded-neo border-2 border-neo-black overflow-hidden',
                isDarkMode ? 'bg-slate-700' : 'bg-gray-100'
              )}>
                <AdaptiveMotion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: `${pct}%` }}
                  transition={{ delay: i * 0.1 + 0.2, duration: 0.8, ease: 'easeOut' }}
                  viewport={{ once: true }}
                  className={cn('h-full rounded-neo', barColor)}
                />
              </div>
            </AdaptiveMotion.div>
          );
        })}
      </div>
    </div>
  );
}
