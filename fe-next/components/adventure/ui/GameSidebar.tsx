/**
 * GameSidebar Component
 *
 * Organized sidebar with objectives, combo display, and hints.
 * Mobile: horizontal scrollable chip bar fitting in compact 64px height.
 * Desktop: vertical stack with full card layout.
 */

'use client';

import React, { memo, useMemo } from 'react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import {
  Lightbulb, Target, Check, FileText, Star, Snowflake,
  Clock, Gem, Swords, Heart, Zap, Shield, Timer, Shuffle, Bomb,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import AdventureObjectives from '../AdventureObjectives';
import AdventureHuntClueBoxes from './AdventureHuntClueBoxes';
import { WordHuntLifeBar } from '@/components/game/WordHuntLifeBar';
import { ChapterQuestProgress } from './ChapterQuestProgress';
import type { ChapterQuest, ChapterQuestProgress as QuestProgressType, LevelObjective, ObjectiveType } from '@/types/adventure';
import { calculateStars } from '@/hooks/adventureGameReducer';

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
  /** Gold cost for the next hint (0 = free) */
  nextHintCost?: number;
  /** Whether gold confirmation is pending (tap again to confirm) */
  hintGoldPending?: boolean;
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
  /** Whether to show the life bar (hunt mode) */
  showLifeBar?: boolean;
  /** Current HP for life bar (hunt mode) */
  currentHP?: number;
  /** Max HP for life bar (hunt mode) */
  maxHP?: number;
  /** Hunt mode: show target word guessing UI */
  showTargetWordUI?: boolean;
  /** Hunt mode: target word length */
  huntTargetLength?: number;
  /** Hunt mode: previous guess attempts */
  huntAttempts?: Array<{ guess: string; feedback: import('@/shared/types/game').LetterFeedback[] }>;
  /** Hunt mode: whether target has been found */
  huntFound?: boolean;
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
  nextHintCost = 0,
  hintGoldPending = false,
  freezeSeconds = 0,
  freezeUsed = false,
  isFrozen = false,
  onFreezeClick,
  shufflesRemaining = 0,
  onShuffleClick,
  canDetonate = false,
  detonateActive = false,
  onDetonateToggle,
  showLifeBar = false,
  currentHP,
  maxHP,
  showTargetWordUI = false,
  huntTargetLength = 0,
  huntAttempts = [],
  huntFound = false,
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
        'bg-neo-navy/60',
        className
      )}
    >
      {/* Hunt mode: Life bar rendered on desktop sidebar only — portrait mobile uses the header HP pill to save vertical space */}
      {showLifeBar && currentHP != null && maxHP != null && (
        <div className="hidden lg:block px-3 py-1.5 border-b border-neo-white/10">
          <WordHuntLifeBar life={currentHP} maxLife={maxHP} />
        </div>
      )}

      {/* Hunt mode: loading state while target word is being picked */}
      {showTargetWordUI && huntTargetLength === 0 && (
        <div className="px-3 py-2 border-b border-neo-white/10 flex items-center gap-2">
          <div className="w-3.5 h-3.5 border-2 border-neo-cyan/40 border-t-neo-cyan rounded-full animate-spin" />
          <span className="text-xs text-neo-white font-mono">{t('adventure.mode.huntLoadingTarget')}</span>
        </div>
      )}

      {/* Hunt mode: daily-challenge-style clue boxes (desktop only — mobile renders them below the header via GameLayout.belowHeader) */}
      {showTargetWordUI && huntTargetLength > 0 && (
        <div className="hidden lg:block px-3 py-2 border-b border-neo-white/10">
          <AdventureHuntClueBoxes
            targetLength={huntTargetLength}
            attempts={huntAttempts}
            huntFound={huntFound}
          />
        </div>
      )}

      {/* Mobile: Bottom action panel with objectives + action buttons */}
      <div className="lg:hidden flex flex-col h-full px-2.5 py-2 gap-1.5 overflow-y-auto scrollbar-hide">
        {/* Row 1: Stars + Objectives — compact chips with circular mini-progress */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
          {/* Star projection */}
          <div className={cn(
            'shrink-0 flex items-center gap-0.5 px-2 py-1.5',
            'rounded-full border min-h-9',
            currentStars === 3 ? 'bg-neo-yellow/15 border-neo-yellow/50' :
            currentStars > 0 ? 'bg-neo-yellow/8 border-neo-yellow/25' :
            'bg-neo-black/30 border-neo-white/8'
          )}>
            {[0, 1, 2].map(i => (
              <Star key={`star-mobile-${i}`} className={cn('w-3.5 h-3.5 transition-all duration-300', i < currentStars ? 'text-neo-yellow fill-neo-yellow' : 'text-neo-white')} />
            ))}
          </div>

          {objectives.map((obj) => {
            const current = obj.current ?? 0;
            const pct = Math.min((current / obj.target) * 100, 100);
            const Icon = OBJECTIVE_ICONS[obj.type];
            const ringC = 2 * Math.PI * 8;
            return (
              <div
                key={obj.type}
                data-testid={`objective-${obj.type}`}
                className={cn(
                  'shrink-0 flex items-center gap-1 px-2 py-1',
                  'rounded-full border min-h-9',
                  'transition-all duration-300',
                  obj.isComplete
                    ? 'bg-neo-lime/12 border-neo-lime/30'
                    : obj.isPrimary
                      ? 'bg-neo-white/5 border-neo-white/12'
                      : 'bg-neo-black/20 border-neo-white/6'
                )}
              >
                {/* Icon with circular progress ring */}
                <div className="relative w-5 h-5 shrink-0">
                  <svg viewBox="0 0 20 20" className="absolute inset-0 -rotate-90">
                    <circle cx="10" cy="10" r="8" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2" />
                    <circle
                      cx="10" cy="10" r="8" fill="none"
                      strokeWidth="2" strokeLinecap="round"
                      className={cn(obj.isComplete ? 'stroke-neo-lime' : 'stroke-neo-yellow')}
                      strokeDasharray={ringC}
                      strokeDashoffset={ringC * (1 - pct / 100)}
                      style={{ transition: 'stroke-dashoffset 0.5s' }}
                    />
                  </svg>
                  <Icon
                    className={cn(
                      'absolute inset-0 m-auto w-2.5 h-2.5',
                      obj.isComplete ? 'text-neo-lime' : OBJECTIVE_COLORS[obj.type]
                    )}
                  />
                </div>
                <span
                  className={cn(
                    'text-[10px] font-mono font-bold tabular-nums leading-tight',
                    obj.isComplete ? 'text-neo-lime' : 'text-neo-white'
                  )}
                >
                  {current}/{obj.target}
                </span>
                {obj.isComplete && (
                  <Check className="w-3 h-3 text-neo-lime shrink-0" strokeWidth={3} />
                )}
              </div>
            );
          })}
        </div>

        {/* Row 2: Action buttons — evenly spaced */}
        <div className="flex items-center gap-2">
          {/* Hint button */}
          <button
            onClick={onHintClick}
            disabled={!hasHintsAvailable}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 min-h-11',
              'rounded-neo border-2',
              'transition-all duration-500',
              hasHintsAvailable
                ? hintGoldPending
                  ? 'bg-neo-orange text-neo-black border-neo-black shadow-[0_0_12px_2px_rgba(255,165,0,0.6)] animate-pulse motion-reduce:animate-none'
                  : showAutoHint
                    ? 'bg-neo-yellow text-neo-black border-neo-black shadow-[0_0_12px_2px_rgba(255,225,53,0.6)] animate-pulse motion-reduce:animate-none'
                    : 'bg-neo-yellow text-neo-black border-neo-black shadow-hard-sm'
                : 'bg-neo-black/30 text-neo-white border-neo-white/10 cursor-not-allowed'
            )}
          >
            <Lightbulb className="w-4 h-4" />
            <span className="text-xs font-bold">
              {hintGoldPending
                ? t('adventure.confirmSpendGold', { amount: nextHintCost })
                : nextHintCost > 0
                  ? t('adventure.game.hintCost', { cost: nextHintCost })
                  : t('adventure.game.hint')}
            </span>
          </button>

          {/* Time Freeze (only if upgrade purchased) */}
          {freezeSeconds > 0 && (
            <button
              onClick={onFreezeClick}
              disabled={freezeUsed}
              aria-label={isFrozen ? t('adventure.game.frozen') : t('adventure.game.freezeWithTime', { seconds: freezeSeconds })}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 min-h-11',
                'rounded-neo border-2',
                !freezeUsed
                  ? isFrozen
                    ? 'bg-neo-cyan text-neo-black border-neo-black shadow-hard-sm animate-pulse motion-reduce:animate-none'
                    : 'bg-neo-cyan/80 text-neo-black border-neo-black shadow-hard-sm'
                  : 'bg-neo-black/30 text-neo-white border-neo-white/10 cursor-not-allowed'
              )}
            >
              <Timer className="w-4 h-4" />
              <span className="text-xs font-bold">{freezeSeconds}s</span>
            </button>
          )}

          {/* Shuffle (only if upgrade purchased) */}
          {shufflesRemaining > 0 && (
            <button
              onClick={onShuffleClick}
              aria-label={t('adventure.game.shuffleWithCount', { count: shufflesRemaining })}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 min-h-11',
                'rounded-neo border-2',
                'bg-neo-orange text-neo-black border-neo-black shadow-hard-sm'
              )}
            >
              <Shuffle className="w-4 h-4" />
              <span className="text-xs font-bold">×{shufflesRemaining}</span>
            </button>
          )}

          {/* Detonate (Word Dynamite T3) */}
          {canDetonate && (
            <button
              onClick={onDetonateToggle}
              aria-label={t('adventure.game.detonate')}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 min-h-11',
                'rounded-neo border-2',
                detonateActive
                  ? 'bg-neo-red text-neo-white border-neo-black shadow-hard-sm animate-pulse motion-reduce:animate-none'
                  : 'bg-neo-red/60 text-neo-black border-neo-black shadow-hard-sm'
              )}
              aria-pressed={detonateActive}
            >
              <Bomb className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Current Hint Display (mobile) */}
        <AdaptiveAnimatePresence>
          {currentHint && (
            <AdaptiveMotion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={cn(
                'px-3 py-2 rounded-neo',
                'bg-neo-lime/20 border-2 border-neo-lime/50',
                'text-center'
              )}
            >
              <span className="text-xs font-bold text-neo-lime">{t('adventure.game.hintUsed')}: </span>
              <span className="text-sm font-black text-neo-white tracking-wider">{currentHint.word}</span>
            </AdaptiveMotion.div>
          )}
        </AdaptiveAnimatePresence>
      </div>

      {/* Desktop: Vertical stack layout */}
      <div className="hidden lg:flex flex-col gap-2.5 p-3 h-full overflow-y-auto">
        {/* Star Projection — centered with subtle glow */}
        <div className="flex items-center justify-center gap-2.5 py-2">
          {[0, 1, 2].map(i => (
            <Star key={`star-desktop-${i}`} className={cn(
              'transition-all duration-300',
              i < currentStars
                ? 'w-6 h-6 text-neo-yellow fill-neo-yellow'
                : 'w-5 h-5 text-neo-white scale-90'
            )}
            style={i < currentStars ? { filter: 'drop-shadow(0 0 4px rgba(255,225,53,0.4))' } : undefined}
            />
          ))}
        </div>

        {/* Objectives Card — refined borders and glow */}
        <AdaptiveMotion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={cn(
            'bg-neo-black/30',
            'border-2 rounded-neo-lg p-3',
            'transition-all duration-500',
            allComplete
              ? 'border-neo-lime/60 shadow-[0_0_16px_2px_rgba(163,230,53,0.3)]'
              : partiallyComplete
                ? 'border-neo-yellow/40 shadow-[0_0_10px_2px_rgba(255,225,53,0.15)]'
                : 'border-neo-white/8'
          )}
        >
          <div className="flex items-center gap-2 mb-2.5">
            <div className={cn(
              'w-6 h-6 rounded-full flex items-center justify-center',
              allComplete ? 'bg-neo-lime/20' : 'bg-neo-yellow/15'
            )}>
              <Target className={cn('w-3 h-3', allComplete ? 'text-neo-lime' : 'text-neo-yellow/80')} />
            </div>
            <h2 className="text-[11px] font-black text-neo-white uppercase tracking-wider">
              {t('adventure.game.objectives')}
            </h2>
            <span className="ms-auto text-[10px] font-mono font-bold text-neo-white tabular-nums">
              {completedCount}/{totalCount}
            </span>
          </div>
          <AdventureObjectives
            objectives={objectives}
            showSlideIn={showSlideIn}
            onSlideInComplete={onSlideInComplete}
          />
        </AdaptiveMotion.div>

        {/* Chapter Quest Progress */}
        {chapterQuests.length > 0 && (
          <ChapterQuestProgress quests={chapterQuests} progress={chapterQuestProgress} />
        )}

        {/* Hint Section */}
        <div className="space-y-2">
          {/* Hint Button — glows subtly when auto-hint is active */}
          <AdaptiveMotion.button
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
                  ? 'bg-neo-yellow text-neo-black border-neo-black shadow-[0_0_16px_3px_rgba(255,225,53,0.5)] animate-pulse motion-reduce:animate-none'
                  : 'bg-neo-yellow text-neo-black border-neo-black shadow-hard hover:shadow-hard-lg'
                : 'bg-neo-black/30 text-neo-white border-neo-white/10 cursor-not-allowed'
            )}
          >
            <Lightbulb className="w-4 h-4" />
            <span>
              {nextHintCost > 0 ? t('adventure.game.hintCost', { cost: nextHintCost }) : t('adventure.game.hint')}
            </span>
          </AdaptiveMotion.button>

          {/* Time Freeze Button (desktop — only if upgrade purchased) */}
          {freezeSeconds > 0 && (
            <AdaptiveMotion.button
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
                    ? 'bg-neo-cyan text-neo-black border-neo-black animate-pulse motion-reduce:animate-none'
                    : 'bg-neo-cyan/80 text-neo-black border-neo-black hover:shadow-hard-lg'
                  : 'bg-neo-black/30 text-neo-white border-neo-white/10 cursor-not-allowed'
              )}
            >
              <Timer className="w-4 h-4" />
              <span>{isFrozen ? t('adventure.game.frozen') : t('adventure.game.freezeWithTime', { seconds: freezeSeconds })}</span>
            </AdaptiveMotion.button>
          )}

          {/* Shuffle Button (desktop — only if upgrade purchased) */}
          {shufflesRemaining > 0 && (
            <AdaptiveMotion.button
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
            </AdaptiveMotion.button>
          )}

          {/* Detonate Toggle (desktop — Word Dynamite T3) */}
          {canDetonate && (
            <AdaptiveMotion.button
              onClick={onDetonateToggle}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              aria-pressed={detonateActive}
              className={cn(
                'w-full flex items-center justify-center gap-2',
                'px-4 py-2.5 rounded-neo-lg',
                'font-bold text-sm border-3 transition-all duration-200 shadow-hard',
                detonateActive
                  ? 'bg-neo-red text-neo-white border-neo-black animate-pulse motion-reduce:animate-none'
                  : 'bg-neo-red/60 text-neo-black border-neo-black hover:shadow-hard-lg'
              )}
            >
              <Bomb className="w-4 h-4" />
              <span>{t('adventure.game.detonate')}</span>
            </AdaptiveMotion.button>
          )}

          {/* Current Hint Display */}
          <AdaptiveAnimatePresence>
            {currentHint && (
              <AdaptiveMotion.div
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
              </AdaptiveMotion.div>
            )}
          </AdaptiveAnimatePresence>

          {/* Adaptive Difficulty Hint */}
          <AdaptiveAnimatePresence>
            {hintLevel !== 'none' && (
              <AdaptiveMotion.div
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
              </AdaptiveMotion.div>
            )}
          </AdaptiveAnimatePresence>
        </div>
      </div>
    </aside>
  );
});

GameSidebar.displayName = 'GameSidebar';

export default GameSidebar;
