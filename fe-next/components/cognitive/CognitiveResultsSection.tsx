'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, ChevronDown, ChevronUp } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { type GameCognitiveScores } from '@/shared/types/cognitiveScores';
import BrainScoreDisplay from './BrainScoreDisplay';
import CognitiveScoresGrid from './CognitiveScoresGrid';
import CognitiveRadarChart from './CognitiveRadarChart';

interface CognitiveResultsSectionProps {
  /** Cognitive scores from the game */
  scores: GameCognitiveScores;
  /** Start collapsed on mobile */
  defaultCollapsed?: boolean;
  /** Custom class name */
  className?: string;
}

/**
 * CognitiveResultsSection - Complete cognitive scores section for end-game results
 * Shows brain score, radar chart, and domain grid
 * Collapsible on mobile for space efficiency
 */
const CognitiveResultsSection: React.FC<CognitiveResultsSectionProps> = ({
  scores,
  defaultCollapsed = true,
  className,
}) => {
  const { t } = useLanguage();
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className={cn(
        'rounded-neo-lg border-4 border-neo-black shadow-hard-lg overflow-hidden',
        'bg-gradient-to-br from-violet-500/20 via-purple-600/20 to-indigo-600/20',
        'dark:from-violet-900/30 dark:via-purple-900/30 dark:to-indigo-900/30',
        className
      )}
    >
      {/* Header - always visible, clickable to toggle */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-neo-purple/30 rounded-neo border-2 border-neo-purple">
            <Brain className="w-5 h-5 text-neo-purple dark:text-neo-purple" />
          </div>
          <div className="text-left">
            <h3 className="font-black text-sm uppercase tracking-wide text-neo-black dark:text-white">
              {t('cognitive.brainTraining') || 'Brain Training'}
            </h3>
            <p className="text-xs text-neo-black/60 dark:text-white/60">
              {t('cognitive.cognitiveAnalysis') || 'Cognitive Performance Analysis'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Brain score preview (always visible) */}
          <BrainScoreDisplay
            score={scores.brainScore}
            compact
            animate={false}
          />

          {/* Collapse toggle */}
          <motion.div
            animate={{ rotate: isCollapsed ? 0 : 180 }}
            transition={{ duration: 0.2 }}
            className="text-neo-black dark:text-white"
          >
            <ChevronDown className="w-5 h-5" />
          </motion.div>
        </div>
      </button>

      {/* Collapsible content */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="p-4 pt-0 space-y-4">
              {/* Main content grid - responsive layout */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Left: Radar chart */}
                <CognitiveRadarChart scores={scores.domains} />

                {/* Right: Full brain score + description */}
                <div className="space-y-4">
                  <BrainScoreDisplay score={scores.brainScore} />

                  {/* Description */}
                  <div className="bg-white/10 dark:bg-black/20 rounded-neo border-2 border-neo-black/20 p-3">
                    <p className="text-xs text-neo-black/70 dark:text-white/70 leading-relaxed">
                      {t('cognitive.brainScoreDesc') ||
                        'Your Brain Score is a weighted average of 5 cognitive domains. Play more games to track your improvement over time!'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Domain scores grid */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wide text-neo-black/60 dark:text-white/60 mb-2">
                  {t('cognitive.domainBreakdown') || 'Domain Breakdown'}
                </h4>
                <CognitiveScoresGrid scores={scores.domains} />
              </div>

              {/* Game context info */}
              <div className="flex flex-wrap gap-2 text-[10px] text-neo-black/50 dark:text-white/50">
                <span className="px-2 py-1 bg-neo-black/5 dark:bg-white/5 rounded">
                  {scores.gridSize} grid
                </span>
                <span className="px-2 py-1 bg-neo-black/5 dark:bg-white/5 rounded">
                  {scores.gameDuration}s game
                </span>
                <span className="px-2 py-1 bg-neo-black/5 dark:bg-white/5 rounded">
                  {scores.gameMode}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default CognitiveResultsSection;
