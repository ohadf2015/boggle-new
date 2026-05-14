'use client';

import { memo } from 'react';
import { m } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../../../lib/utils';
import { Mascot, type MascotVariant } from '../../../../components/ui/Mascot';

interface MascotBubbleLayoutProps {
  headline: string;
  player?: string;
  icon: LucideIcon;
  mascotVariant: MascotVariant;
  bgGradient: string;
  textColor: string;
  borderColor: string;
}

/**
 * MascotBubbleLayout - Mascot pops in from side with speech bubble
 * Used for player achievements, combos, and general positive events
 */
const MascotBubbleLayout = memo<MascotBubbleLayoutProps>(({
  headline,
  player,
  icon: Icon,
  mascotVariant,
  bgGradient,
  textColor,
  borderColor,
}) => {
  return (
    <m.div
      initial={{ opacity: 0, x: -100, scale: 0.8 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.8 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className="flex items-center gap-4"
    >
      {/* Mascot */}
      <m.div
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 20, delay: 0.1 }}
      >
        <Mascot
          variant={mascotVariant}
          size="lg"
          animated
          className="drop-shadow-[4px_4px_0px_rgba(0,0,0,1)]"
          clipBorder="none"
        />
      </m.div>

      {/* Speech Bubble */}
      <m.div
        initial={{ opacity: 0, scale: 0.5, x: -20 }}
        animate={{ opacity: 1, scale: 1, x: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.15 }}
        className={cn(
          'relative px-6 py-4 rounded-neo border-4',
          `bg-linear-to-r ${bgGradient}`,
          textColor,
          borderColor,
          'shadow-hard-lg',
        )}
      >
        {/* Speech bubble tail */}
        <div
          className={cn(
            'absolute left-0 top-1/2 -translate-x-3 -translate-y-1/2',
            'w-0 h-0',
            'border-t-12 border-t-transparent',
            'border-r-16 border-r-neo-black',
            'border-b-12 border-b-transparent',
          )}
        />
        <div
          className={cn(
            'absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2',
            'w-0 h-0',
            'border-t-10 border-t-transparent',
            'border-r-14',
            bgGradient.includes('yellow') || bgGradient.includes('lime') || bgGradient.includes('cyan')
              ? 'border-r-neo-yellow'
              : 'border-r-neo-pink',
            'border-b-10 border-b-transparent',
          )}
        />

        <div className="flex items-center gap-3">
          <Icon className="w-8 h-8 shrink-0" />
          <div>
            <h3 className="font-black uppercase tracking-wider text-2xl leading-none">
              {headline}
            </h3>
            {player && (
              <p className="font-bold text-sm opacity-80 mt-1">
                {player}
              </p>
            )}
          </div>
        </div>
      </m.div>
    </m.div>
  );
});

MascotBubbleLayout.displayName = 'MascotBubbleLayout';

export default MascotBubbleLayout;
