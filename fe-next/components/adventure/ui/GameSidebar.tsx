/**
 * GameSidebar Component
 *
 * Organized sidebar with objectives, combo display, and hints.
 * Mobile: horizontal scrollable chip bar fitting in compact 64px height.
 * Desktop: vertical stack with full card layout.
 */

'use client';

import React, { memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lightbulb, Target, Check, FileText, Star, Snowflake,
  Clock, Gem, Swords, Heart, Zap, Shield, Timer, Shuffle, Bomb,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import AdventureObjectives from '../AdventureObjectives';
import { ChapterQuestProgress } from './ChapterQuestProgress';
import type { ChapterQuest, ChapterQuestProgress as QuestProgressType } from '@/types/adventure';
import { calculateStars } from '@/hooks/adventureGameReducer';
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
  /** Time Freeze upgrade: seconds available (0 = no upgrade) */
  freezeSeconds?: number;
  /** Whether freeze has been used this level */
  freezeUsed?: boolean;
  /** Whether time is currently frozen */
  isFrozen?: boolean;
  /** Callback to activate time freeze */
  onFreezeClick?: () => void;
  /** Shuffle uses remaining (0 = no upgrade or exhausted) */
  shufflesRemaining?: number;
  /** Callback to use shuffle */
  onShuffleClick?: () => void;
  /** Word Dynamite T3: can detonate words? */
  canDetonate?: boolean;
  /** Whether detonate mode is active */
  detonateActive?: boolean;
  /** Toggle detonate mode */
  onDetonateToggle?: () => void;
  /** Chapter quests for progress display */
  chapterQuests?: ChapterQuest[];
  /** Chapter quest progress */
  chapterQuestProgress?: QuestProgressType[];
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
  freezeSeconds = 0,
  freezeUsed = false,
  isFrozen = false,
  onFreezeClick,
  shufflesRemaining = 0,
  onShuffleClick,
  canDetonate = false,
  detonateActive = false,
  onDetonateToggle,
  chapterQuests = [],
  chapterQuestProgress = [],
  className,
}: GameSidebarProps) {
  const { t } = useLanguage();

  // Derive completion progress for the desktop objectives card glow
  const completedCount = objectives.filter(o => o.isComplete).length;
  const totalCount = objectives.length;
  const allComplete = totalCount > 0 && completedCount === totalCount;
  const partiallyComplete = completedCount > 0 && !allComplete;
  const currentStars = useMemo(() => calculateStars(objectives), [objectives]);

  return (
    <aside
      className={cn(
        'flex flex-col',
        'h-full',
        'bg-neo-navy/60 backdrop-blur-sm',
        className
      )}
    >
      {/* Mobile: Compact horizontal scrollable chip bar (fits h-16) */}
      <div className="lg:hidden flex flex-row items-center gap-1 px-1.5 py-1 h-full overflow-x-auto scrollbar-hide">
        {/* Star projection chip */}
        <div className={cn(
          'flex-shrink-0 flex items-center gap-0.5 px-2 py-1',
          'rounded-neo border-2 min-h-[40px]',
          currentStars === 3 ? 'bg-neo-yellow/20 border-neo-yellow' :
          currentStars > 0 ? 'bg-neo-yellow/10 border-neo-yellow/40' :
          'bg-neo-black/40 border-neo-white/10'
        )}>
          {[0, 1, 2].map(i => (
            <Star key={i} className={cn('w-3 h-3 transition-all duration-300', i < currentStars ? 'text-neo-yellow fill-neo-yellow' : 'text-neo-white/25')} />
          ))}
        </div>

        {objectives.map((obj) => {
          const current = obj.current ?? 0;
          const pct = Math.min((current / obj.target) * 100, 100);
          const Icon = OBJECTIVE_ICONS[obj.type];
          return (
            <div
              key={obj.type}
              data-testid={`objective-${obj.type}`}
              className={cn(
                'flex-shrink-0 flex items-center gap-1 px-1.5 py-0.5',
                'rounded-neo border-2 min-w-[56px] min-h-[40px]',
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
                  'w-3 h-3 flex-shrink-0',
                  obj.isComplete ? 'text-neo-lime' : OBJECTIVE_COLORS[obj.type]
                )}
              />
              <div className="flex flex-col gap-px flex-1 min-w-0">
                <span
                  className={cn(
                    'text-[9px] font-mono font-black tabular-nums leading-tight',
                    obj.isComplete ? 'text-neo-lime' : 'text-neo-white/80'
                  )}
                >
                  {current}/{obj.target}
                </span>
                <div className="h-0.5 bg-neo-black/50 rounded-full overflow-hidden">
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
                <Check className="w-2.5 h-2.5 text-neo-lime flex-shrink-0" strokeWidth={3} />
              )}
            </div>
          );
        })}

        {/* Divider */}
        <div className="flex-shrink-0 w-px h-6 bg-neo-white/15" />

        {/* Hint chip — glows when auto-hint suggests using it */}
        <button
          onClick={onHintClick}
          disabled={!hasHintsAvailable}
          className={cn(
            'flex-shrink-0 flex items-center gap-1 px-2 py-1',
            'rounded-neo border-2',
            'min-w-[40px] min-h-[40px]',
            'transition-all duration-500',
            hasHintsAvailable
              ? showAutoHint
                ? 'bg-neo-yellow text-neo-black border-neo-black shadow-[0_0_12px_2px_rgba(255,225,53,0.6)] animate-pulse'
                : 'bg-neo-yellow text-neo-black border-neo-black shadow-hard-sm'
              : 'bg-neo-black/30 text-neo-white/40 border-neo-white/10 cursor-not-allowed'
          )}
        >
          <Lightbulb className="w-3 h-3" />
          <span className="text-[10px] font-bold">{t('adventure.game.hint')}</span>
        </button>

        {/* Time Freeze chip (only if upgrade purchased) */}
        {freezeSeconds > 0 && (
          <button
            onClick={onFreezeClick}
            disabled={freezeUsed}
            className={cn(
              'flex-shrink-0 flex items-center gap-1 px-2 py-1',
              'rounded-neo border-2 min-w-[40px] min-h-[40px]',
              !freezeUsed
                ? isFrozen
                  ? 'bg-neo-cyan text-neo-black border-neo-black shadow-hard-sm animate-pulse'
                  : 'bg-neo-cyan/80 text-neo-black border-neo-black shadow-hard-sm'
                : 'bg-neo-black/30 text-neo-white/40 border-neo-white/10 cursor-not-allowed'
            )}
          >
            <Timer className="w-3 h-3" />
            <span className="text-[10px] font-bold">{freezeSeconds}s</span>
          </button>
        )}

        {/* Shuffle chip (only if upgrade purchased) */}
        {shufflesRemaining > 0 && (
          <button
            onClick={onShuffleClick}
            className={cn(
              'flex-shrink-0 flex items-center gap-1 px-2 py-1',
              'rounded-neo border-2 min-w-[40px] min-h-[40px]',
              'bg-neo-orange text-neo-black border-neo-black shadow-hard-sm'
            )}
          >
            <Shuffle className="w-3 h-3" />
            <span className="text-[10px] font-bold">×{shufflesRemaining}</span>
          </button>
        )}

        {/* Detonate chip (Word Dynamite T3) */}
        {canDetonate && (
          <button
            onClick={onDetonateToggle}
            className={cn(
              'flex-shrink-0 flex items-center gap-1 px-2 py-1',
              'rounded-neo border-2 min-w-[40px] min-h-[40px]',
              detonateActive
                ? 'bg-neo-red text-neo-white border-neo-black shadow-hard-sm animate-pulse'
                : 'bg-neo-red/60 text-neo-black border-neo-black shadow-hard-sm'
            )}
            aria-pressed={detonateActive}
          >
            <Bomb className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Desktop: Vertical stack layout */}
      <div className="hidden lg:flex flex-col gap-3 p-3 h-full overflow-y-auto">
        {/* Star Projection */}
        <div className="flex items-center justify-center gap-2 py-2">
          {[0, 1, 2].map(i => (
            <Star key={i} className={cn(
              'w-5 h-5 transition-all duration-300',
              i < currentStars ? 'text-neo-yellow fill-neo-yellow scale-110' : 'text-neo-white/25 scale-90'
            )} />
          ))}
        </div>

        {/* Objectives Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={cn(
            'bg-neo-black/40 backdrop-blur-sm',
            'border-3 rounded-neo-lg p-3',
            'transition-all duration-500',
            // Objectives card border glow: grey → neo-yellow (partial) → neo-lime (all done)
            allComplete
              ? 'border-neo-lime shadow-[0_0_16px_2px_rgba(163,230,53,0.4)]'
              : partiallyComplete
                ? 'border-neo-yellow/70 shadow-[0_0_12px_2px_rgba(255,225,53,0.25)]'
                : 'border-neo-black/50 shadow-hard'
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

        {/* Chapter Quest Progress */}
        {chapterQuests.length > 0 && (
          <ChapterQuestProgress quests={chapterQuests} progress={chapterQuestProgress} />
        )}

        {/* Hint Section */}
        <div className="space-y-2">
          {/* Hint Button — glows subtly when auto-hint is active */}
          <motion.button
            onClick={onHintClick}
            disabled={!hasHintsAvailable}
            whileHover={hasHintsAvailable ? { scale: 1.02 } : {}}
            whileTap={hasHintsAvailable ? { scale: 0.98 } : {}}
            className={cn(
              'w-full flex items-center justify-center gap-2',
              'px-4 py-2.5 rounded-neo-lg',
              'font-bold text-sm',
              'border-3 transition-all duration-500',
              hasHintsAvailable
                ? showAutoHint
                  ? 'bg-neo-yellow text-neo-black border-neo-black shadow-[0_0_16px_3px_rgba(255,225,53,0.5)] animate-pulse'
                  : 'bg-neo-yellow text-neo-black border-neo-black shadow-hard hover:shadow-hard-lg'
                : 'bg-neo-black/30 text-neo-white/40 border-neo-white/10 cursor-not-allowed'
            )}
          >
            <Lightbulb className="w-4 h-4" />
            <span>{t('adventure.game.hint')}</span>
          </motion.button>

          {/* Time Freeze Button (desktop — only if upgrade purchased) */}
          {freezeSeconds > 0 && (
            <motion.button
              onClick={onFreezeClick}
              disabled={freezeUsed}
              whileHover={!freezeUsed ? { scale: 1.02 } : {}}
              whileTap={!freezeUsed ? { scale: 0.98 } : {}}
              className={cn(
                'w-full flex items-center justify-center gap-2',
                'px-4 py-2.5 rounded-neo-lg',
                'font-bold text-sm border-3 transition-all duration-200 shadow-hard',
                !freezeUsed
                  ? isFrozen
                    ? 'bg-neo-cyan text-neo-black border-neo-black animate-pulse'
                    : 'bg-neo-cyan/80 text-neo-black border-neo-black hover:shadow-hard-lg'
                  : 'bg-neo-black/30 text-neo-white/40 border-neo-white/10 cursor-not-allowed'
              )}
            >
              <Timer className="w-4 h-4" />
              <span>{isFrozen ? t('adventure.game.frozen') : t('adventure.game.freezeWithTime', { seconds: freezeSeconds })}</span>
            </motion.button>
          )}

          {/* Shuffle Button (desktop — only if upgrade purchased) */}
          {shufflesRemaining > 0 && (
            <motion.button
              onClick={onShuffleClick}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                'w-full flex items-center justify-center gap-2',
                'px-4 py-2.5 rounded-neo-lg',
                'font-bold text-sm border-3 transition-all duration-200 shadow-hard',
                'bg-neo-orange text-neo-black border-neo-black hover:shadow-hard-lg'
              )}
            >
              <Shuffle className="w-4 h-4" />
              <span>{t('adventure.game.shuffleWithCount', { count: shufflesRemaining })}</span>
            </motion.button>
          )}

          {/* Detonate Toggle (desktop — Word Dynamite T3) */}
          {canDetonate && (
            <motion.button
              onClick={onDetonateToggle}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              aria-pressed={detonateActive}
              className={cn(
                'w-full flex items-center justify-center gap-2',
                'px-4 py-2.5 rounded-neo-lg',
                'font-bold text-sm border-3 transition-all duration-200 shadow-hard',
                detonateActive
                  ? 'bg-neo-red text-neo-white border-neo-black animate-pulse'
                  : 'bg-neo-red/60 text-neo-black border-neo-black hover:shadow-hard-lg'
              )}
            >
              <Bomb className="w-4 h-4" />
              <span>{t('adventure.game.detonate')}</span>
            </motion.button>
          )}

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
