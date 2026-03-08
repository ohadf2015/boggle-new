/**
 * GameSidebar Component
 *
 * Organized sidebar with objectives, combo display, and hints.
 * Mobile: horizontal scrollable chip bar fitting in fixed 96px height.
 * Desktop: vertical stack with full card layout.
 */

'use client';

import React, { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lightbulb, Target, Check, FileText, Star, Snowflake,
  Clock, Gem, Swords, Heart, Zap, Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import AdventureObjectives from '../AdventureObjectives';
import type { LevelObjective, ObjectiveType } from '@/types/adventure';

// ==============================================
// CONSTANTS
// ==============================================

const OBJECTIVE_ICONS: Record<ObjectiveType, React.ComponentType<{ className?: string }>> = {
  wordCount: FileText,
  scoreTarget: Target,
  longWords: Star,
  clearIce: Snowflake,
  timeBonus: Clock,
  collectGems: Gem,
  defeatBoss: Swords,
  surviveBattle: Heart,
  mechanicTrigger: Zap,
  noDamage: Shield,
};

const OBJECTIVE_COLORS: Record<ObjectiveType, string> = {
  wordCount: 'text-neo-cyan',
  scoreTarget: 'text-neo-yellow',
  longWords: 'text-neo-purple',
  clearIce: 'text-neo-cyan',
  timeBonus: 'text-neo-lime',
  collectGems: 'text-neo-pink',
  defeatBoss: 'text-neo-red',
  surviveBattle: 'text-neo-pink',
  mechanicTrigger: 'text-neo-orange',
  noDamage: 'text-neo-lime',
};

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
      {/* Mobile: Horizontal scrollable chip bar */}
      <div className="lg:hidden flex flex-row items-center gap-2 p-2 h-full overflow-x-auto scrollbar-hide">
        {objectives.map((obj) => {
          const current = obj.current ?? 0;
          const pct = Math.min((current / obj.target) * 100, 100);
          const Icon = OBJECTIVE_ICONS[obj.type];
          return (
            <div
              key={obj.type}
              data-testid={`objective-${obj.type}`}
              className={cn(
                'flex-shrink-0 flex items-center gap-1.5 px-2 py-1',
                'rounded-neo border-2 min-w-[80px]',
                'transition-all duration-300',
                obj.isComplete
                  ? 'bg-neo-lime/20 border-neo-lime'
                  : obj.isPrimary
                    ? 'bg-neo-yellow/10 border-neo-yellow/40'
                    : 'bg-neo-black/40 border-neo-white/10'
              )}
            >
              <Icon
                className={cn(
                  'w-3.5 h-3.5 flex-shrink-0',
                  obj.isComplete ? 'text-neo-lime' : OBJECTIVE_COLORS[obj.type]
                )}
              />
              <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                <span
                  className={cn(
                    'text-[10px] font-mono font-black tabular-nums',
                    obj.isComplete ? 'text-neo-lime' : 'text-neo-white/80'
                  )}
                >
                  {current}/{obj.target}
                </span>
                <div className="h-1 bg-neo-black/50 rounded-full overflow-hidden">
                  <div
                    data-testid={`progress-bar-${obj.type}`}
                    className={cn(
                      'h-full rounded-full transition-all duration-500',
                      obj.isComplete ? 'bg-neo-lime' : 'bg-neo-yellow'
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
              {obj.isComplete && (
                <Check className="w-3 h-3 text-neo-lime flex-shrink-0" strokeWidth={3} />
              )}
            </div>
          );
        })}

        {/* Divider */}
        <div className="flex-shrink-0 w-px h-8 bg-neo-white/10" />

        {/* Hint chip */}
        <button
          onClick={onHintClick}
          disabled={!hasHintsAvailable}
          className={cn(
            'flex-shrink-0 flex items-center gap-1 px-2 py-1',
            'rounded-neo border-2',
            hasHintsAvailable
              ? 'bg-neo-yellow text-neo-black border-neo-black'
              : 'bg-neo-black/30 text-neo-white/40 border-neo-white/10 cursor-not-allowed'
          )}
        >
          <Lightbulb className="w-3.5 h-3.5" />
          <span className="text-[10px] font-bold">{t('adventure.game.hint')}</span>
        </button>
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
                        return t('adventure.game.hintFullReveal');
                      case 'lengthAndStart':
                        return t('adventure.game.hintLengthAndStart');
                      default:
                        return t('adventure.game.hintGeneral');
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
