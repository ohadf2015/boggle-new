'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles,
  Zap,
  Crown,
  Shield,
  Target,
  Search,
  Flame,
  HeartPulse,
  Heart,
  Compass,
  TrendingDown,
  RotateCcw,
  Gem,
  Ruler,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getWordHuntFacts, type WordHuntFact } from '@/utils/dailyWordHuntFactsCalculator';
import type { WordHuntResult } from '@/utils/dailyChallenge';
import type { WordHuntStats } from './types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DailyWordHuntFactsProps {
  result: WordHuntResult;
  stats: WordHuntStats;
  t: (key: string, params?: Record<string, string | number>) => string;
}

// ---------------------------------------------------------------------------
// Icon + color maps
// ---------------------------------------------------------------------------

const ICON_MAP: Record<string, LucideIcon> = {
  Sparkles,
  Zap,
  Crown,
  Shield,
  Target,
  Search,
  Flame,
  HeartPulse,
  Heart,
  Compass,
  TrendingDown,
  RotateCcw,
  Gem,
  Ruler,
};

const COLOR_STYLES: Record<WordHuntFact['color'], { bg: string; border: string; iconBg: string }> = {
  'neo-lime': {
    bg: 'bg-neo-lime/20',
    border: 'border-neo-lime',
    iconBg: 'bg-neo-lime text-neo-black',
  },
  'neo-cyan': {
    bg: 'bg-neo-cyan/20',
    border: 'border-neo-cyan',
    iconBg: 'bg-neo-cyan text-neo-black',
  },
  'neo-orange': {
    bg: 'bg-neo-orange/20',
    border: 'border-neo-orange',
    iconBg: 'bg-neo-orange text-neo-black',
  },
  'neo-pink': {
    bg: 'bg-neo-pink/20',
    border: 'border-neo-pink',
    iconBg: 'bg-neo-pink text-neo-black',
  },
  'neo-yellow': {
    bg: 'bg-neo-yellow/20',
    border: 'border-neo-yellow',
    iconBg: 'bg-neo-yellow text-neo-black',
  },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const DailyWordHuntFacts: React.FC<DailyWordHuntFactsProps> = ({ result, stats, t }) => {
  const facts = useMemo(() => getWordHuntFacts(result, stats), [result, stats]);

  if (facts.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-bold text-neo-cream/70 uppercase tracking-wider text-center">
        {t('wordHunt.facts.title')}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {facts.map((fact, index) => {
          const IconComponent = ICON_MAP[fact.icon] || Zap;
          const styles = COLOR_STYLES[fact.color];

          return (
            <motion.div
              key={fact.type}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, type: 'spring', stiffness: 300, damping: 25 }}
              className={cn(
                'flex items-center gap-3 p-3 rounded-neo border-3 shadow-hard-sm',
                styles.bg,
                styles.border
              )}
            >
              <div
                className={cn(
                  'shrink-0 w-9 h-9 rounded-neo flex items-center justify-center border-2 border-neo-black',
                  styles.iconBg
                )}
              >
                <IconComponent className="w-5 h-5" />
              </div>
              <p className="min-w-0 flex-1 text-xs text-neo-cream/80">
                {t(fact.translationKey, fact.translationParams)}
              </p>
              {fact.value != null && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: index * 0.1 + 0.2, type: 'spring', stiffness: 400 }}
                  className="shrink-0 text-lg font-black text-neo-cream"
                >
                  {fact.value}
                </motion.span>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default DailyWordHuntFacts;
