'use client';

import React from 'react';
import { m } from 'framer-motion';
import { Target, TrendingUp, Trophy, Zap, Flame, Award } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Near-miss notification data from engagement system
 */
export interface NearMiss {
  achievement?: string;
  type?: string;
  current: number;
  target: number;
  remaining: number;
  message: string;
  hint?: string;
  scoreDifference?: number;
}

interface NearMissCardProps {
  nearMisses: NearMiss[];
  t: (key: string) => string;
  onPlayAgain?: () => void;
  compact?: boolean;
}

/**
 * Get icon for near-miss type
 */
function getNearMissIcon(nearMiss: NearMiss) {
  if (nearMiss.type === 'personal_best') {
    return <Trophy className="w-5 h-5" />;
  }
  if (nearMiss.type === 'close_loss') {
    return <Zap className="w-5 h-5" />;
  }
  if (nearMiss.achievement?.includes('COMBO')) {
    return <Flame className="w-5 h-5" />;
  }
  if (nearMiss.achievement?.includes('WORD') || nearMiss.achievement?.includes('LEXICON')) {
    return <Award className="w-5 h-5" />;
  }
  return <Target className="w-5 h-5" />;
}

/**
 * Get color scheme for near-miss type
 */
function getNearMissColors(nearMiss: NearMiss) {
  if (nearMiss.type === 'personal_best') {
    return {
      bg: 'bg-linear-to-r from-amber-500/20 to-yellow-500/20',
      border: 'border-amber-500/50',
      icon: 'text-amber-400',
      progress: 'bg-linear-to-r from-amber-500 to-yellow-400',
    };
  }
  if (nearMiss.type === 'close_loss') {
    return {
      bg: 'bg-linear-to-r from-red-500/20 to-orange-500/20',
      border: 'border-red-500/50',
      icon: 'text-red-400',
      progress: 'bg-linear-to-r from-red-500 to-orange-400',
    };
  }
  if (nearMiss.achievement?.includes('COMBO')) {
    return {
      bg: 'bg-linear-to-r from-orange-500/20 to-rose-500/20',
      border: 'border-orange-500/50',
      icon: 'text-orange-400',
      progress: 'bg-linear-to-r from-orange-500 to-rose-400',
    };
  }
  return {
    bg: 'bg-linear-to-r from-cyan-500/20 to-blue-500/20',
    border: 'border-cyan-500/50',
    icon: 'text-cyan-400',
    progress: 'bg-linear-to-r from-cyan-500 to-blue-400',
  };
}

/**
 * Near-Miss Notification Card
 * Shows progress towards achievements the player almost unlocked
 * Encourages "one more game" behavior
 */
const NearMissCard: React.FC<NearMissCardProps> = ({
  nearMisses,
  t,
  onPlayAgain,
  compact = false,
}) => {
  if (!nearMisses || nearMisses.length === 0) return null;

  // Show max 2 near-misses in compact mode, 3 in full mode
  const displayMisses = compact ? nearMisses.slice(0, 2) : nearMisses.slice(0, 3);

  return (
    <m.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, type: 'spring', stiffness: 300, damping: 26 }}
      className={cn(
        'rounded-neo border-2 border-neo-black shadow-hard overflow-hidden',
        'bg-neo-navy-light/90 backdrop-blur-xs'
      )}
    >
      {/* Header */}
      <div className="bg-linear-to-r from-neo-purple to-neo-pink px-3 py-2 border-b-2 border-neo-black">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-white" />
          <h3 className="text-sm font-black text-white uppercase">
            {t('nearMiss.almostThere')}
          </h3>
        </div>
      </div>

      {/* Near-miss items */}
      <div className={cn('p-3 space-y-3', compact && 'p-2 space-y-2')}>
        {displayMisses.map((nearMiss, index) => {
          const colors = getNearMissColors(nearMiss);
          const progressPercent = Math.round((nearMiss.current / nearMiss.target) * 100);

          return (
            <m.div
              key={`${nearMiss.type}-${nearMiss.achievement ?? index}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 + index * 0.1, type: 'spring', stiffness: 380, damping: 26 }}
              className={cn(
                'rounded-lg border-2 p-2.5',
                colors.bg,
                colors.border
              )}
            >
              <div className="flex items-start gap-2">
                {/* Icon */}
                <div className={cn('p-1.5 rounded-lg bg-white/10', colors.icon)}>
                  {getNearMissIcon(nearMiss)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Message */}
                  <p className={cn(
                    'font-bold text-white leading-tight',
                    compact ? 'text-xs' : 'text-sm'
                  )}>
                    {nearMiss.message}
                  </p>

                  {/* Progress bar */}
                  <div className="mt-2 relative">
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <m.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPercent}%` }}
                        transition={{ duration: 0.8, delay: 0.7 + index * 0.1 }}
                        className={cn('h-full rounded-full', colors.progress)}
                      />
                    </div>
                    {/* Progress label */}
                    <div className="flex justify-between mt-1">
                      <span className="text-[10px] font-bold text-white">
                        {nearMiss.current} / {nearMiss.target}
                      </span>
                      <span className={cn(
                        'text-[10px] font-black',
                        colors.icon
                      )}>
                        {progressPercent}%
                      </span>
                    </div>
                  </div>

                  {/* Hint */}
                  {nearMiss.hint && !compact && (
                    <p className="mt-1.5 text-[10px] text-slate-300 italic">
                      {t('nearMiss.tip')}: {nearMiss.hint}
                    </p>
                  )}
                </div>

                {/* Remaining badge */}
                <div className={cn(
                  'shrink-0 px-2 py-1 rounded-lg text-center',
                  'bg-white/10 border border-white/20'
                )}>
                  <span className={cn(
                    'text-lg font-black',
                    colors.icon
                  )}>
                    {nearMiss.remaining}
                  </span>
                  <p className="text-[10px] text-white uppercase font-bold">
                    {t('nearMiss.more')}
                  </p>
                </div>
              </div>
            </m.div>
          );
        })}

        {/* Play Again CTA */}
        {onPlayAgain && (
          <m.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, type: 'spring', stiffness: 300, damping: 26 }}
            onClick={onPlayAgain}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              'w-full mt-2 py-2.5 rounded-lg border-2 border-neo-black shadow-hard-sm',
              'bg-linear-to-r from-neo-lime to-neo-lime',
              'text-neo-black font-black uppercase text-sm',
              'hover:shadow-hard-md hover:-translate-y-0.5 transition-all'
            )}
          >
            {t('nearMiss.oneMoreGame')}
          </m.button>
        )}
      </div>

      {/* Motivational footer */}
      {!compact && displayMisses.length > 0 && (
        <div className="px-3 py-2 bg-white/5 border-t border-white/10">
          <p className="text-[10px] text-slate-300 text-center">
            {t('nearMiss.soClose')}
          </p>
        </div>
      )}
    </m.div>
  );
};

export default NearMissCard;
