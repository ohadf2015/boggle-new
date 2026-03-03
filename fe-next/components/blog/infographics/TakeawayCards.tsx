'use client';

import { cn } from '@/lib/utils';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';

export type TakeawayItem = {
  number: number;
  title: string;
  description: string;
};

type TakeawayCardsProps = {
  items: TakeawayItem[];
  isDarkMode: boolean;
};

const NUMBER_COLORS = ['bg-neo-lime', 'bg-neo-yellow', 'bg-neo-cyan', 'bg-neo-pink', 'bg-neo-orange'];

export default function TakeawayCards({ items, isDarkMode }: TakeawayCardsProps) {
  return (
    <div className="my-8 space-y-3">
      {items.map((item, i) => (
        <AdaptiveMotion.div
          key={i}
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.1, duration: 0.4 }}
          viewport={{ once: true }}
          className={cn(
            'flex gap-3 p-3 rounded-neo border-3 border-neo-black shadow-hard-sm',
            isDarkMode ? 'bg-slate-800' : 'bg-white'
          )}
        >
          <div className={cn(
            'w-8 h-8 rounded-full border-2 border-neo-black flex items-center justify-center shrink-0 font-black text-neo-black text-sm',
            NUMBER_COLORS[i % NUMBER_COLORS.length]
          )}>
            {item.number}
          </div>
          <div>
            <div className={cn(
              'font-bold text-sm',
              isDarkMode ? 'text-white' : 'text-neo-black'
            )}>
              {item.title}
            </div>
            <div className={cn(
              'text-xs mt-0.5',
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            )}>
              {item.description}
            </div>
          </div>
        </AdaptiveMotion.div>
      ))}
    </div>
  );
}
