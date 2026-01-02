'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import {
  type CognitiveDomainScores,
  COGNITIVE_DOMAIN_CONFIG,
  getScoreLevelKey,
} from '@/shared/types/cognitiveScores';

interface CognitiveScoresGridProps {
  /** Domain scores object */
  scores: CognitiveDomainScores;
  /** Show compact version */
  compact?: boolean;
  /** Custom class name */
  className?: string;
  /** Animate on mount */
  animate?: boolean;
}

/**
 * CognitiveScoresGrid - Grid of 5 color-coded domain score cards
 * Each card shows the domain icon, score, and label
 */
const CognitiveScoresGrid: React.FC<CognitiveScoresGridProps> = ({
  scores,
  compact = false,
  className,
  animate = true,
}) => {
  const { t } = useLanguage();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.9 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: 'spring' as const,
        stiffness: 200,
        damping: 15,
      },
    },
  };

  return (
    <motion.div
      variants={animate ? containerVariants : undefined}
      initial={animate ? 'hidden' : false}
      animate="visible"
      className={cn(
        'grid gap-2',
        compact ? 'grid-cols-5' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5',
        className
      )}
    >
      {COGNITIVE_DOMAIN_CONFIG.map((domain) => {
        const score = scores[domain.key];
        const levelKey = getScoreLevelKey(score);

        return (
          <motion.div
            key={domain.key}
            variants={animate ? itemVariants : undefined}
            className={cn(
              'relative overflow-hidden rounded-neo border-3 border-neo-black shadow-hard',
              'bg-gradient-to-br from-white to-slate-100 dark:from-slate-800 dark:to-slate-900',
              compact ? 'p-2' : 'p-3'
            )}
          >
            {/* Color accent bar */}
            <div
              className={cn(
                'absolute top-0 left-0 right-0 h-1',
                domain.bgColor
              )}
            />

            {/* Content */}
            <div className={cn('text-center', compact ? 'pt-1' : 'pt-2')}>
              {/* Icon */}
              <div className={cn('text-xl', compact && 'text-lg')}>
                {domain.icon}
              </div>

              {/* Score */}
              <motion.div
                key={score}
                initial={{ scale: 1.2 }}
                animate={{ scale: 1 }}
                className={cn(
                  'font-black text-neo-black dark:text-white',
                  compact ? 'text-lg' : 'text-2xl'
                )}
              >
                {score}
              </motion.div>

              {/* Label */}
              {!compact && (
                <div className="mt-1">
                  <span className={cn('text-[10px] font-bold uppercase', domain.color)}>
                    {t(domain.labelKey) || domain.key}
                  </span>
                </div>
              )}

              {/* Level indicator (non-compact only) */}
              {!compact && (
                <div className="mt-1">
                  <span className="text-[9px] font-medium text-neo-black/50 dark:text-white/50">
                    {t(levelKey) || levelKey.split('.').pop()}
                  </span>
                </div>
              )}
            </div>

            {/* Progress bar */}
            <div className={cn(
              'mt-2 h-1 bg-neo-black/10 dark:bg-white/10 rounded-full overflow-hidden',
              compact && 'mt-1'
            )}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${score}%` }}
                transition={{ delay: 0.3, duration: 0.5, ease: 'easeOut' }}
                className={cn('h-full rounded-full', domain.bgColor)}
              />
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
};

export default CognitiveScoresGrid;
