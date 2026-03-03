'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';

export type ChipItem = {
  label: string;
  examples: string[];
};

type InteractiveChipsProps = {
  chips: ChipItem[];
  isDarkMode: boolean;
};

export default function InteractiveChips({ chips, isDarkMode }: InteractiveChipsProps) {
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <div className={cn(
      'my-8 p-4 rounded-neo border-3 border-neo-black shadow-hard-sm',
      isDarkMode ? 'bg-slate-800' : 'bg-white'
    )}>
      <div className="flex flex-wrap gap-2 mb-3">
        {chips.map((chip, i) => (
          <button
            key={i}
            onClick={() => setSelected(selected === i ? null : i)}
            className={cn(
              'px-3 py-1.5 rounded-neo border-2 border-neo-black text-sm font-bold transition-all',
              selected === i
                ? isDarkMode
                  ? 'bg-neo-cyan text-neo-black shadow-hard-sm'
                  : 'bg-neo-pink text-white shadow-hard-sm'
                : isDarkMode
                  ? 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                  : 'bg-gray-100 text-neo-black hover:bg-gray-200'
            )}
          >
            {chip.label}
          </button>
        ))}
      </div>

      <AdaptiveAnimatePresence mode="wait">
        {selected !== null && (
          <AdaptiveMotion.div
            key={selected}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className={cn(
              'flex flex-wrap gap-2 pt-3 border-t-2',
              isDarkMode ? 'border-slate-700' : 'border-gray-200'
            )}>
              {chips[selected].examples.map((ex, j) => (
                <span
                  key={j}
                  className={cn(
                    'px-2 py-1 rounded-neo border border-neo-black text-xs font-mono font-bold',
                    isDarkMode ? 'bg-slate-700 text-neo-cyan' : 'bg-neo-cream text-neo-black'
                  )}
                >
                  {ex}
                </span>
              ))}
            </div>
          </AdaptiveMotion.div>
        )}
      </AdaptiveAnimatePresence>
    </div>
  );
}
