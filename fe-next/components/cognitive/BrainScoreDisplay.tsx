'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Brain } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { getScoreLevelKey, getEncouragementKey, SCORE_LEVELS } from '@/shared/types/cognitiveScores';

interface BrainScoreDisplayProps {
  /** Brain score (0-100) */
  score: number;
  /** Show compact version */
  compact?: boolean;
  /** Custom class name */
  className?: string;
  /** Animate on mount */
  animate?: boolean;
}

/**
 * BrainScoreDisplay - Hero display for the weighted brain score
 * Shows the overall cognitive performance with color-coded feedback
 */
const BrainScoreDisplay: React.FC<BrainScoreDisplayProps> = ({
  score,
  compact = false,
  className,
  animate = true,
}) => {
  const { t } = useLanguage();

  // Get color based on score level
  const getScoreColor = (score: number): string => {
    if (score >= SCORE_LEVELS.EXCELLENT) return 'from-neo-lime to-emerald-400';
    if (score >= SCORE_LEVELS.GREAT) return 'from-neo-cyan to-blue-400';
    if (score >= SCORE_LEVELS.GOOD) return 'from-neo-yellow to-amber-400';
    if (score >= SCORE_LEVELS.IMPROVING) return 'from-neo-orange to-orange-400';
    return 'from-neo-pink to-rose-400';
  };

  // Get border color based on score level
  const getBorderColor = (score: number): string => {
    if (score >= SCORE_LEVELS.EXCELLENT) return 'border-neo-lime';
    if (score >= SCORE_LEVELS.GREAT) return 'border-neo-cyan';
    if (score >= SCORE_LEVELS.GOOD) return 'border-neo-yellow';
    if (score >= SCORE_LEVELS.IMPROVING) return 'border-neo-orange';
    return 'border-neo-pink';
  };

  const levelKey = getScoreLevelKey(score);
  const encouragementKey = getEncouragementKey(score);

  if (compact) {
    return (
      <motion.div
        initial={animate ? { scale: 0.8, opacity: 0 } : false}
        animate={{ scale: 1, opacity: 1 }}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-neo border-2',
          getBorderColor(score),
          'bg-gradient-to-r',
          getScoreColor(score),
          className
        )}
      >
        <Brain className="w-5 h-5 text-neo-black" />
        <span className="font-black text-xl text-neo-black">{score}</span>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={animate ? { scale: 0.8, opacity: 0, y: 20 } : false}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 15 }}
      className={cn(
        'relative overflow-hidden rounded-neo-lg border-4 border-neo-black shadow-hard-lg',
        'bg-gradient-to-br',
        getScoreColor(score),
        className
      )}
    >
      {/* Halftone texture overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.08]"
        style={{
          backgroundImage: `radial-gradient(circle, rgb(var(--neo-black)) 1px, transparent 1px)`,
          backgroundSize: '6px 6px',
        }}
      />

      <div className="relative z-10 p-4 text-center">
        {/* Header */}
        <div className="flex items-center justify-center gap-2 mb-2">
          <motion.div
            initial={animate ? { rotate: -180, scale: 0 } : false}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          >
            <Brain className="w-6 h-6 text-neo-black" />
          </motion.div>
          <h3 className="text-sm font-black uppercase tracking-wide text-neo-black">
            {t('cognitive.brainScore') || 'Brain Score'}
          </h3>
        </div>

        {/* Score */}
        <motion.div
          initial={animate ? { scale: 0 } : false}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 150 }}
          className="relative"
        >
          <motion.span
            key={score}
            initial={{ scale: 1.3 }}
            animate={{ scale: 1 }}
            className="text-5xl font-black text-neo-black"
            style={{ textShadow: '2px 2px 0px rgba(255,255,255,0.3)' }}
          >
            {score}
          </motion.span>
          <span className="text-lg font-bold text-neo-black/70 ml-1">/100</span>
        </motion.div>

        {/* Level badge */}
        <motion.div
          initial={animate ? { y: 10, opacity: 0 } : false}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-2"
        >
          <span className="inline-block px-3 py-1 bg-neo-black/20 rounded-full text-xs font-bold uppercase text-neo-black">
            {t(levelKey) || levelKey.split('.').pop()}
          </span>
        </motion.div>

        {/* Encouragement message */}
        <motion.p
          initial={animate ? { y: 10, opacity: 0 } : false}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-2 text-xs font-medium text-neo-black/80"
        >
          {t(encouragementKey) || 'Keep playing to improve!'}
        </motion.p>
      </div>
    </motion.div>
  );
};

export default BrainScoreDisplay;
