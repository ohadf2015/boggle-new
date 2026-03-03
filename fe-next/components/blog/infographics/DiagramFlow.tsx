'use client';

import { cn } from '@/lib/utils';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';

export type FlowStep = {
  label: string;
  description: string;
  color?: string;
};

type DiagramFlowProps = {
  steps: FlowStep[];
  isDarkMode: boolean;
};

const STEP_COLORS: Record<string, { bg: string; darkBg: string }> = {
  lime: { bg: 'bg-neo-lime', darkBg: 'bg-emerald-900' },
  yellow: { bg: 'bg-neo-yellow', darkBg: 'bg-yellow-900' },
  pink: { bg: 'bg-neo-pink', darkBg: 'bg-pink-900' },
  cyan: { bg: 'bg-neo-cyan', darkBg: 'bg-cyan-900' },
  orange: { bg: 'bg-neo-orange', darkBg: 'bg-orange-900' },
};

export default function DiagramFlow({ steps, isDarkMode }: DiagramFlowProps) {
  return (
    <div className={cn(
      'my-8 p-4 rounded-neo border-3 border-neo-black shadow-hard-sm overflow-x-auto',
      isDarkMode ? 'bg-slate-800' : 'bg-white'
    )}>
      <div className="flex items-stretch gap-0 min-w-max">
        {steps.map((step, i) => {
          const color = STEP_COLORS[step.color || 'lime'] || STEP_COLORS.lime;
          return (
            <AdaptiveMotion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.15, duration: 0.4 }}
              viewport={{ once: true }}
              className="flex items-center"
            >
              <div className={cn(
                'p-3 rounded-neo border-2 border-neo-black min-w-[120px] text-center',
                isDarkMode ? color.darkBg : color.bg
              )}>
                <div className={cn(
                  'text-sm font-black',
                  isDarkMode ? 'text-white' : 'text-neo-black'
                )}>
                  {step.label}
                </div>
                <div className={cn(
                  'text-xs mt-1',
                  isDarkMode ? 'text-gray-400' : 'text-neo-black/70'
                )}>
                  {step.description}
                </div>
              </div>
              {i < steps.length - 1 && (
                <div className={cn(
                  'mx-1 text-xl font-black shrink-0',
                  isDarkMode ? 'text-gray-500' : 'text-neo-black'
                )}>
                  →
                </div>
              )}
            </AdaptiveMotion.div>
          );
        })}
      </div>
    </div>
  );
}
