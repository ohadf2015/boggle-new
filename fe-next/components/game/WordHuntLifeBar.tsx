/**
 * WordHuntLifeBar
 * Animated life bar for Word Hunt mode with gradient colors, heart icon,
 * shimmer effect, and pulse animation at low health.
 */

'use client';

import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface WordHuntLifeBarProps {
  life: number;
  maxLife: number;
}

function getLifeGradient(percentage: number): string {
  if (percentage > 60) return 'bg-gradient-to-r from-green-400 to-emerald-500';
  if (percentage > 30) return 'bg-gradient-to-r from-yellow-400 to-orange-400';
  return 'bg-gradient-to-r from-red-500 to-orange-400';
}

function getHeartColor(percentage: number): string {
  if (percentage > 60) return 'bg-green-500';
  if (percentage > 30) return 'bg-yellow-500';
  return 'bg-red-500';
}

export function WordHuntLifeBar({ life, maxLife }: WordHuntLifeBarProps) {
  const { t } = useLanguage();
  const percentage = Math.min(100, Math.max(0, (life / maxLife) * 100));
  const isLow = percentage <= 20;

  return (
    <div
      data-testid="word-hunt-life-bar"
      className="flex items-center gap-2 w-full"
      role="progressbar"
      aria-valuenow={Math.round(percentage)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={t('wordHunt.lifeBar')}
    >
      {/* Beating heart icon */}
      <motion.div
        className={`flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full border-2 border-neo-black shadow-hard-sm ${getHeartColor(percentage)}`}
        animate={
          isLow
            ? { scale: [1, 1.15, 1] }
            : {}
        }
        transition={{ duration: 0.6, repeat: isLow ? Infinity : 0 }}
      >
        <Heart data-testid="heart-icon" className="w-4 h-4 text-white fill-white" />
      </motion.div>

      {/* Life bar */}
      <div
        className={`flex-1 h-5 rounded-neo border-2 overflow-hidden relative ${
          isLow ? 'border-red-500' : 'border-neo-black'
        } bg-gray-800 shadow-hard-sm`}
      >
        <motion.div
          data-testid="word-hunt-life-bar-fill"
          className={`h-full flex items-center justify-center text-xs font-black text-white relative overflow-hidden ${getLifeGradient(percentage)}`}
          style={{ width: `${percentage}%` }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          {/* Shimmer overlay */}
          <div
            data-testid="word-hunt-life-bar-shimmer"
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer pointer-events-none"
          />
          <span className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)] relative z-10 text-[10px] font-bold">
            {Math.floor(life)}/{maxLife}
          </span>
        </motion.div>
      </div>
    </div>
  );
}
