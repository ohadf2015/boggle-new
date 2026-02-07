/**
 * GameSidebar Component
 *
 * Organized sidebar with objectives, combo display, and hints.
 * Optimized for mobile with compact layout and proper scrolling.
 */

'use client';

import React, { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import AdventureObjectives from '../AdventureObjectives';
import type { LevelObjective } from '@/types/adventure';

// ==============================================
// TYPES
// ==============================================

interface GameSidebarProps {
  objectives: LevelObjective[];
  showSlideIn?: boolean;
  onSlideInComplete?: () => void;
  hasHintsAvailable: boolean;
  onHintClick: () => void;
  showAutoHint: boolean;
  currentHint: { word: string } | null;
  hintLevel: 'none' | 'length' | 'lengthAndStart' | 'fullReveal';
  className?: string;
}

// ==============================================
// COMPONENT
// ==============================================

export const GameSidebar = memo(function GameSidebar({
  objectives,
  showSlideIn,
  onSlideInComplete,
  hasHintsAvailable,
  onHintClick,
  showAutoHint,
  currentHint,
  hintLevel,
  className,
}: GameSidebarProps) {
  const { t } = useLanguage();

  return (
    <aside
      className={cn(
        'flex flex-col',
        'h-full',
        'bg-neo-navy/60 backdrop-blur-sm',
        className
      )}
    >
      {/* Mobile: Horizontal scroll layout */}
      <div className="lg:hidden flex flex-row gap-2 p-2 overflow-x-auto">
        {/* Objectives - Compact */}
        <div className="flex-shrink-0 w-48 sm:w-56">
          <div className="bg-neo-black/40 rounded-neo-lg p-2 border-2 border-neo-black/50">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Target className="w-3 h-3 text-neo-yellow" />
              <span className="text-[10px] font-bold text-neo-white/70 uppercase">
                {t('adventure.game.objectives')}
              </span>
            </div>
            <AdventureObjectives
              objectives={objectives}
              showSlideIn={showSlideIn}
              onSlideInComplete={onSlideInComplete}
            />
          </div>
        </div>

        {/* Hint Button - Compact */}
        <div className="flex-shrink-0 w-auto">
          <motion.button
            onClick={onHintClick}
            disabled={!hasHintsAvailable}
            whileHover={hasHintsAvailable ? { scale: 1.02 } : {}}
            whileTap={hasHintsAvailable ? { scale: 0.98 } : {}}
            className={cn(
              'h-full px-3 py-2 rounded-neo-lg',
              'flex items-center gap-1.5',
              'font-bold text-sm',
              'border-2 transition-all',
              hasHintsAvailable
                ? 'bg-neo-yellow text-neo-black border-neo-black'
                : 'bg-neo-black/30 text-neo-white/40 border-neo-white/10 cursor-not-allowed'
            )}
          >
            <Lightbulb className="w-4 h-4" />
            <span className="hidden sm:inline">{t('adventure.game.hint')}</span>
          </motion.button>
        </div>

        {/* Current Hint - Compact */}
        <AnimatePresence>
          {currentHint && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex-shrink-0"
            >
              <div className="bg-neo-lime/20 rounded-neo-lg p-2 border-2 border-neo-lime/50">
                <p className="text-[10px] font-bold text-neo-lime mb-0.5">
                  {t('adventure.game.hintUsed')}
                </p>
                <p className="text-base font-black text-neo-white">
                  {currentHint.word}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Desktop: Vertical stack layout */}
      <div className="hidden lg:flex flex-col gap-3 p-3 h-full overflow-y-auto">
        {/* Objectives Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={cn(
            'bg-neo-black/40 backdrop-blur-sm',
            'border-3 border-neo-black/50',
            'rounded-neo-lg p-3',
            'shadow-hard'
          )}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-neo bg-neo-yellow/20 border-2 border-neo-yellow/40 flex items-center justify-center">
              <Target className="w-3.5 h-3.5 text-neo-yellow" />
            </div>
            <h2 className="text-xs font-black text-neo-white/80 uppercase tracking-wide">
              {t('adventure.game.objectives')}
            </h2>
          </div>
          <AdventureObjectives
            objectives={objectives}
            showSlideIn={showSlideIn}
            onSlideInComplete={onSlideInComplete}
          />
        </motion.div>

        {/* Hint Section */}
        <div className="space-y-2">
          {/* Hint Button */}
          <motion.button
            onClick={onHintClick}
            disabled={!hasHintsAvailable}
            whileHover={hasHintsAvailable ? { scale: 1.02 } : {}}
            whileTap={hasHintsAvailable ? { scale: 0.98 } : {}}
            className={cn(
              'w-full flex items-center justify-center gap-2',
              'px-4 py-2.5 rounded-neo-lg',
              'font-bold text-sm',
              'border-3 transition-all duration-200',
              'shadow-hard',
              hasHintsAvailable
                ? 'bg-neo-yellow text-neo-black border-neo-black hover:shadow-hard-lg'
                : 'bg-neo-black/30 text-neo-white/40 border-neo-white/10 cursor-not-allowed'
            )}
          >
            <Lightbulb className="w-4 h-4" />
            <span>{t('adventure.game.hint')}</span>
          </motion.button>

          {/* Auto Hint Prompt */}
          <AnimatePresence>
            {showAutoHint && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className={cn(
                  'p-2 rounded-neo',
                  'bg-neo-yellow/20 border-2 border-neo-yellow/50',
                  'text-center'
                )}
              >
                <p className="text-xs font-bold text-neo-yellow">
                  {t('adventure.game.hintAvailable')}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Current Hint Display */}
          <AnimatePresence>
            {currentHint && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={cn(
                  'p-3 rounded-neo-lg',
                  'bg-neo-lime/20 border-3 border-neo-lime/50',
                  'text-center'
                )}
              >
                <p className="text-xs font-bold text-neo-lime mb-1">
                  {t('adventure.game.hintUsed')}
                </p>
                <p className="text-lg font-black text-neo-white tracking-wider">
                  {currentHint.word}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Adaptive Difficulty Hint */}
          <AnimatePresence>
            {hintLevel !== 'none' && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-2 rounded-neo bg-neo-cyan/10 border border-neo-cyan/30"
              >
                <p className="text-xs text-neo-cyan text-center">
                  {(() => {
                    switch (hintLevel) {
                      case 'fullReveal':
                        return 'Try looking for shorter words first!';
                      case 'lengthAndStart':
                        return 'Look for words starting with specific letters!';
                      default:
                        return 'Keep trying! Look for common patterns.';
                    }
                  })()}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </aside>
  );
});

GameSidebar.displayName = 'GameSidebar';

export default GameSidebar;
