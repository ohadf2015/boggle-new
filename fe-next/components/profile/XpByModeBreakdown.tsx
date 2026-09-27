'use client';

import React from 'react';
import { m } from 'framer-motion';
import { PieChart } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { getModeLabel } from '@/lib/xp/modeLabels';
import { OTHER_MODE, type ModeXpSlice } from '@/lib/xp/xpByMode';

interface XpByModeBreakdownProps {
  xpByMode?: ModeXpSlice[];
  compact?: boolean;
  delay?: number;
}

// Color-code modes with the brand's mode families (single=cyan, MP=pink, brain=purple).
const MODE_BAR_COLOR: Record<string, string> = {
  classic: 'bg-neo-lime',
  blast: 'bg-neo-pink',
  'word-hunt': 'bg-neo-cyan',
  'wheel-rush': 'bg-neo-purple',
  'word-tower': 'bg-neo-orange',
  [OTHER_MODE]: 'bg-neo-white/40', // neutral — solo + bonus XP, not a single mode
};

function barColor(mode: string): string {
  return MODE_BAR_COLOR[mode] || 'bg-neo-purple';
}

/**
 * "Where your XP came from" — an estimated split of total XP across the game
 * modes the player has played. Renders nothing when there's no data, so it's
 * safe to drop into any profile view. Shows on the player's own profile and on
 * anyone else's public profile alike.
 */
export function XpByModeBreakdown({
  xpByMode,
  compact = false,
  delay = 0.05,
}: XpByModeBreakdownProps): React.ReactNode {
  const { t } = useLanguage();

  if (!xpByMode || xpByMode.length === 0) return null;

  return (
    <m.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={cn(
        'relative bg-neo-navy-light overflow-hidden mb-4',
        'border-3 border-neo-black rounded-neo shadow-hard',
        compact ? 'p-4' : 'p-5',
      )}
    >
      <div className={cn('flex items-center gap-2.5', compact ? 'mb-3' : 'mb-4')}>
        <span className={cn(
          'flex items-center justify-center bg-neo-lime text-neo-black',
          'border-2 border-neo-black rounded-neo shadow-hard-sm',
          compact ? 'w-8 h-8' : 'w-10 h-10',
        )}>
          <PieChart strokeWidth={2.75} className={compact ? 'w-4 h-4' : 'w-5 h-5'} />
        </span>
        <h2 className={cn(
          'font-black font-neo-display uppercase tracking-tight text-neo-white',
          compact ? 'text-lg' : 'text-2xl',
        )}>
          {t('profile.xpByMode.title')}
        </h2>
      </div>

      <ul className="flex flex-col gap-3">
        {xpByMode.map((slice) => {
          const pct = Math.round(slice.share * 100);
          return (
            <li key={slice.mode}>
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[11px] font-black uppercase tracking-[0.14em] text-neo-white">
                  {getModeLabel(slice.mode, t)}
                </span>
                <span className="flex items-baseline gap-1.5">
                  <span className="font-neo-display font-black text-sm text-neo-cyan tabular-nums">
                    {slice.xp.toLocaleString()}
                  </span>
                  <span className="text-[11px] font-black text-neo-white/60 tabular-nums">
                    {pct}%
                  </span>
                </span>
              </div>
              {/* flex track → fill aligns to inline-start (auto-flips for RTL) */}
              <div className="flex w-full h-3 bg-neo-black/50 border-2 border-neo-black rounded-neo overflow-hidden">
                <div
                  className={cn('h-full', barColor(slice.mode))}
                  style={{ width: `${Math.max(pct, 2)}%` }}
                  aria-hidden
                />
              </div>
            </li>
          );
        })}
      </ul>

      <p className="mt-3 text-[10px] font-bold text-neo-white/45 leading-snug">
        {t('profile.xpByMode.estimateNote')}
      </p>
    </m.div>
  );
}

export default XpByModeBreakdown;
