/**
 * LevelCompleteContent — Rewards, objectives, loot, and action buttons
 * Extracted from LevelCompleteModal to keep files under 500 lines.
 */
'use client';

import { memo, useState } from 'react';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { Check, X, Trophy, RotateCcw, DoorOpen, Coins, Zap, Share2, Crosshair, Heart, CircleDot } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OBJECTIVE_TRANSLATION_KEYS } from '@/lib/adventure/constants';
import { RollingNumber } from './ui/RollingNumber';
import { RewardedAdGoldButton } from '@/components/ads/RewardedAdGoldButton';
import { COIN_REWARDS } from '@/utils/coinManager';
import { getNearMissMessages } from '@/lib/adventure/nearMiss';
import { MissedWordsPanel } from './MissedWordsPanel';
import { LootRevealAnimation } from './LootRevealAnimation';
import { LevelShareCard } from './LevelShareCard';
import { StreakMilestoneCelebration } from './StreakMilestoneCelebration';
import type { StreakMilestone } from '@/lib/adventure/adventureStreak';
import type { LevelObjective, LevelAttempt } from '@/types/adventure';


export interface LevelCompleteContentProps {
  stars: number;
  score: number;
  objectives: LevelObjective[];
  worldNumber?: number;
  levelNumber?: number;
  isHighScore: boolean;
  isFailed: boolean;
  onContinue: () => void;
  onRetry: () => void;
  onExit: () => void;
  xpEarned?: number;
  goldEarned?: number;
  isLastLevelOfWorld: boolean;
  onNextWorld?: () => void;
  lootDrops: Array<{ type: string; rarity: string; label?: string; quantity?: number }>;
  storyBeatText?: string;
  canRetryFree: boolean;
  nextLevelPreview?: { worldName: string; levelNumber: number; mechanic?: string } | null;
  bossDefeatShare?: null;
  bestAttempt?: LevelAttempt | null;
  /** Words on the board the player didn't find */
  missedWords?: string[];
  /** Mode-specific stats for blast/hunt/wheel archetypes */
  modeStats?: {
    archetype: string;
    /** Blast: moves remaining when level ended */
    movesRemaining?: number;
    movesTotal?: number;
    /** Hunt: attempts used to find target word */
    huntAttempts?: number;
    huntFound?: boolean;
    /** Wheel: words containing center letter */
    centerLetterWords?: number;
    totalWords?: number;
  } | null;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LevelCompleteContent = memo<LevelCompleteContentProps>(({
  stars, score, objectives, isHighScore, isFailed,
  xpEarned, goldEarned,
  lootDrops, storyBeatText,
  nextLevelPreview, bestAttempt, missedWords, t,
  modeStats,
  // Kept in interface for backwards compat but used by LevelCompleteActions now
  onContinue: _onContinue, onRetry: _onRetry, onExit: _onExit,
  isLastLevelOfWorld: _isLastLevelOfWorld, onNextWorld: _onNextWorld,
  canRetryFree: _canRetryFree, bossDefeatShare: _bossDefeatShare,
}) => {
  const baseGold = goldEarned ?? (stars > 0 ? stars * 10 + (stars === 3 ? 50 : 0) : 0);
  const completedCount = objectives.filter((o) => o.isComplete).length;

  return (
    <>
      {/* Score & Rewards Grid */}
      <AdaptiveMotion.div
        initial={{ y: 30 }}
        animate={{ y: 0 }}
        transition={{ delay: 0.6 }}
        className="grid grid-cols-3 gap-3 mb-6 animate-in fade-in-0 duration-300"
      >
        {/* Score */}
        <div className="bg-neo-black/60 backdrop-blur-xs border-3 border-neo-white/20 rounded-neo p-3">
          <div className="text-neo-white text-xs font-bold mb-1 uppercase">{t('common.score')}</div>
          <RollingNumber value={score} variant="white" className="text-xl md:text-2xl" />
        </div>
        {/* XP */}
        <div className="bg-neo-purple/20 backdrop-blur-xs border-3 border-neo-purple rounded-neo p-3">
          <div className="text-neo-purple text-xs font-bold mb-1 flex items-center gap-1 justify-center uppercase">
            <Zap className="w-3 h-3" />+{t('common.xp')}
          </div>
          <RollingNumber value={xpEarned ?? Math.floor(score / 100)} variant="default" className="text-xl md:text-2xl text-neo-purple" />
        </div>
        {/* Gold */}
        <div className="backdrop-blur-xs border-3 rounded-neo p-3 bg-neo-yellow/20 border-neo-yellow/60">
          <div className="text-neo-yellow text-xs font-bold mb-1 flex items-center gap-1 justify-center uppercase">
            <Coins className="w-3 h-3" />+{t('common.gold')}
          </div>
          <RollingNumber value={baseGold} variant="default" className="text-xl md:text-2xl text-neo-yellow" />
        </div>
      </AdaptiveMotion.div>

      {/* Mode-specific stat badge */}
      {modeStats && (
        <AdaptiveMotion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="flex justify-center mb-3"
        >
          {modeStats.archetype === 'blast' && modeStats.movesRemaining != null && modeStats.movesTotal != null && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-neo-pink/15 border border-neo-pink/30 rounded-neo">
              <Crosshair className="w-4 h-4 text-neo-pink" />
              <span className="text-sm font-bold text-neo-pink">
                {t('adventure.modeStats.movesUsed', {
                  used: modeStats.movesTotal - modeStats.movesRemaining,
                  total: modeStats.movesTotal,
                })}
              </span>
            </div>
          )}
          {modeStats.archetype === 'hunt' && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-neo-cyan/15 border border-neo-cyan/30 rounded-neo">
              <Heart className="w-4 h-4 text-neo-cyan" />
              <span className="text-sm font-bold text-neo-cyan">
                {modeStats.huntFound
                  ? t('adventure.modeStats.huntSuccess', { attempts: modeStats.huntAttempts ?? 0 })
                  : t('adventure.modeStats.huntFailed')}
              </span>
            </div>
          )}
          {modeStats.archetype === 'wheel' && modeStats.centerLetterWords != null && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-neo-purple/15 border border-neo-purple/30 rounded-neo">
              <CircleDot className="w-4 h-4 text-neo-purple" />
              <span className="text-sm font-bold text-neo-purple">
                {t('adventure.modeStats.wheelWords', {
                  center: modeStats.centerLetterWords,
                  total: modeStats.totalWords ?? 0,
                })}
              </span>
            </div>
          )}
        </AdaptiveMotion.div>
      )}

      {/* High Score Badge */}
      {isHighScore && (
        <AdaptiveMotion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.8, type: 'spring' }}
          className="flex justify-center mb-4"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-neo-lime/20 border-2 border-neo-lime rounded-neo">
            <Trophy className="w-5 h-5 text-neo-lime" />
            <span className="text-neo-lime font-bold">{t('adventure.game.newHighScore')}</span>
          </div>
        </AdaptiveMotion.div>
      )}

      {/* Objectives Summary */}
      <div className="mb-6">
        <p className="text-neo-white text-sm font-bold mb-2">
          {t('adventure.game.objectives')}: {completedCount}/{objectives.length}
        </p>
        <ul className="space-y-2">
          {objectives.map((objective) => (
            <li
              key={objective.type}
              data-testid={objective.isComplete ? 'objective-complete' : 'objective-incomplete'}
              className={cn(
                'flex items-center gap-2 text-sm font-bold',
                objective.isComplete ? 'text-neo-lime' : 'text-neo-white'
              )}
            >
              {objective.isComplete ? (
                <Check className="w-4 h-4 shrink-0" />
              ) : (
                <X className="w-4 h-4 shrink-0" />
              )}
              <span>{t(OBJECTIVE_TRANSLATION_KEYS[objective.type], { target: objective.target })}</span>
              <span className="ms-auto font-mono">{objective.current}/{objective.target}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Words You Missed */}
      {missedWords && missedWords.length > 0 && (
        <MissedWordsPanel
          missedWords={missedWords}
          foundWords={[]}
          className="mb-2"
        />
      )}

      {/* Loot Drops — staggered reveal animation */}
      {lootDrops.length > 0 && !isFailed && (
        <LootRevealAnimation drops={lootDrops} baseDelay={0.8} className="mb-4" />
      )}

      {/* Story Beat */}
      {storyBeatText && !isFailed && (
        <AdaptiveMotion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="mb-4 p-3 rounded-neo bg-neo-white/5 border border-neo-white/10"
        >
          <p className="text-xs text-neo-white italic leading-relaxed">{storyBeatText}</p>
        </AdaptiveMotion.div>
      )}

      {/* Defeat Explanation — shows WHY the player failed (stars === 0) */}
      {isFailed && stars === 0 && objectives.length > 0 && (() => {
        // Find the objective furthest from completion for the contextual tip
        const incompleteObjectives = objectives.filter((o) => !o.isComplete);
        const worstObjective = incompleteObjectives.reduce((worst, obj) => {
          const worstRatio = (worst.current ?? 0) / worst.target;
          const objRatio = (obj.current ?? 0) / obj.target;
          return objRatio < worstRatio ? obj : worst;
        }, incompleteObjectives[0]);

        return (
          <AdaptiveMotion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-4 border-3 border-neo-red rounded-neo bg-neo-red/10 p-4"
            data-testid="defeat-explainer"
          >
            <p className="text-neo-red font-bold text-sm uppercase tracking-wide mb-3">
              {t('adventure.defeatExplainer.title')}
            </p>
            <ul className="space-y-2 mb-3">
              {objectives.map((obj) => (
                <li key={obj.type} className="flex items-center justify-between text-sm font-bold">
                  <span className={obj.isComplete ? 'text-neo-lime' : 'text-neo-white'}>
                    {obj.isComplete ? <Check className="w-3 h-3 inline me-1" /> : <X className="w-3 h-3 inline me-1" />}
                    {t(OBJECTIVE_TRANSLATION_KEYS[obj.type], { target: obj.target })}
                  </span>
                  <span className={cn(
                    'font-mono text-xs',
                    obj.isComplete ? 'text-neo-lime' : 'text-neo-red'
                  )}>
                    {obj.current ?? 0} / {obj.target}
                  </span>
                </li>
              ))}
            </ul>
            {worstObjective && (
              <p className="text-neo-white text-xs italic border-t border-neo-red/30 pt-2">
                💡 {t(`adventure.defeatExplainer.tip.${worstObjective.type}`)}
              </p>
            )}
          </AdaptiveMotion.div>
        );
      })()}

      {/* Near-miss feedback — encouraging messages when close to passing */}
      {isFailed && (() => {
        const nearMisses = getNearMissMessages(objectives);
        if (nearMisses.length === 0) return null;
        return (
          <AdaptiveMotion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-4 p-4 rounded-neo bg-neo-orange/10 border-2 border-neo-orange/30"
          >
            <p className="text-neo-orange font-bold text-sm uppercase tracking-wide mb-2">
              {t('adventure.nearMiss.almostThere')}
            </p>
            <div className="space-y-1.5">
              {nearMisses.map((msg, i) => (
                <div key={`miss-${i}-${msg.translationKey}`} className="text-sm text-neo-white font-bold">
                  {t(msg.translationKey, msg.params)}
                </div>
              ))}
            </div>
          </AdaptiveMotion.div>
        );
      })()}

      {/* Partial Progress (failed attempts) */}
      {isFailed && bestAttempt && bestAttempt.attemptCount > 1 && (
        <AdaptiveMotion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-6 p-4 rounded-neo bg-neo-cyan/10 border-2 border-neo-cyan/30"
        >
          <p className="text-neo-cyan font-bold text-sm uppercase tracking-wide mb-2">
            {t('adventure.game.yourBest')}
          </p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-neo-white">{t('adventure.game.words')}: </span>
              <span className="font-bold text-neo-white">{bestAttempt.bestWords}</span>
            </div>
            <div>
              <span className="text-neo-white">{t('common.score')}: </span>
              <span className="font-bold text-neo-white">{bestAttempt.bestScore.toLocaleString()}</span>
            </div>
          </div>
          {bestAttempt.attemptCount >= 3 && (
            <p className="text-neo-lime text-sm font-bold mt-2">
              {t('adventure.game.keepTrying')}
            </p>
          )}
        </AdaptiveMotion.div>
      )}

      {/* Next Level Preview */}
      {!isFailed && nextLevelPreview && !_isLastLevelOfWorld && (
        <AdaptiveMotion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="mb-4 p-3 rounded-neo bg-neo-cyan/10 border border-neo-cyan/20"
        >
          <p className="text-neo-cyan text-xs font-bold uppercase tracking-wide mb-1">
            {t('adventure.nextUp')}
          </p>
          <p className="text-neo-white text-sm font-bold">
            {t('adventure.level')} {nextLevelPreview.levelNumber} — {nextLevelPreview.worldName}
          </p>
          {nextLevelPreview.mechanic && (
            <p className="text-neo-white text-xs mt-0.5">{t(nextLevelPreview.mechanic)}</p>
          )}
        </AdaptiveMotion.div>
      )}

    </>
  );
});

LevelCompleteContent.displayName = 'LevelCompleteContent';

// ==============================================
// ACTION BUTTONS — rendered separately for sticky positioning
// ==============================================

export interface LevelCompleteActionsProps {
  isFailed: boolean;
  isLastLevelOfWorld: boolean;
  onNextWorld?: () => void;
  onContinue: () => void;
  onRetry: () => void;
  onExit: () => void;
  canRetryFree: boolean;
  stars: number;
  goldEarned?: number;
  saveFailed?: boolean;
  onRetrySave?: () => void;
  score?: number;
  worldNumber?: number;
  levelNumber?: number;
  worldName?: string;
  bestWord?: string;
  wordsFound?: number;
  streakMilestone?: StreakMilestone | null;
  t: (key: string, params?: Record<string, string | number>) => string;
}

export const LevelCompleteActions = memo<LevelCompleteActionsProps>(({
  isFailed, isLastLevelOfWorld, onNextWorld, onContinue, onRetry, onExit, canRetryFree, stars, goldEarned: _goldEarned, saveFailed, onRetrySave, score = 0, worldNumber = 1, levelNumber = 1, worldName = '', bestWord = '', wordsFound = 0, streakMilestone, t,
}) => {
  const [showShareCard, setShowShareCard] = useState(false);

  return (
    <div className="flex flex-col gap-2 p-4 md:p-6 pt-3 border-t border-neo-white/10 bg-neo-navy/95 backdrop-blur-xs shrink-0">
      {/* Save failed warning banner */}
      {saveFailed && (
        <div className="flex items-center gap-2 p-2.5 bg-neo-red/20 border-2 border-neo-red/50 rounded-neo" role="alert">
          <span className="text-neo-red text-xs font-bold flex-1">
            {t('adventure.saveFailedWarning')}
          </span>
          {onRetrySave && (
            <button
              type="button"
              onClick={onRetrySave}
              className="px-3 py-1 bg-neo-red text-neo-white text-xs font-black rounded-neo border-2 border-neo-black shadow-hard-sm active:translate-y-0.5 active:shadow-hard-pressed"
            >
              {t('adventure.retrySave')}
            </button>
          )}
        </div>
      )}

      {/* Streak milestone celebration */}
      {!isFailed && streakMilestone && (
        <StreakMilestoneCelebration milestone={streakMilestone} t={t} />
      )}

      {stars > 0 && (
        <RewardedAdGoldButton
          goldAmount={COIN_REWARDS.WATCH_AD}
          surface="adventure_level_complete"
          size="md"
          className="w-full justify-center"
        />
      )}

      {!isFailed && (
        <button
          type="button"
          onClick={isLastLevelOfWorld && onNextWorld ? onNextWorld : onContinue}
          className={cn(
            'btn-primary w-full py-3 px-4',
            'bg-neo-lime text-neo-black font-black text-lg',
            'border-3 border-neo-black rounded-neo',
            'shadow-hard hover:shadow-hard-lg hover:-translate-y-0.5',
            'active:translate-y-0.5 active:shadow-hard-pressed',
            'focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-cyan',
            'transition-all duration-200'
          )}
        >
          {isLastLevelOfWorld ? t('adventure.nextWorld') : t('adventure.continueToNext')}
        </button>
      )}

      {/* Share card — 3-star only */}
      {showShareCard && stars === 3 && !isFailed && (
        <LevelShareCard
          worldNumber={worldNumber}
          levelNumber={levelNumber}
          worldName={worldName}
          stars={stars}
          score={score}
          bestWord={bestWord}
          wordsFound={wordsFound}
          t={t}
        />
      )}

      <div className="flex gap-2">
        {/* Share toggle — 3-star only, compact icon button */}
        {stars === 3 && !isFailed && (
          <button
            type="button"
            onClick={() => setShowShareCard(prev => !prev)}
            className={cn(
              'py-2.5 px-3 border-2 rounded-neo transition-colors',
              showShareCard
                ? 'bg-neo-lime/20 text-neo-lime border-neo-lime/40'
                : 'bg-neo-lime/10 text-neo-lime/70 border-neo-lime/20 hover:bg-neo-lime/20',
            )}
            aria-label={t('common.share')}
          >
            <Share2 className="w-4 h-4" />
          </button>
        )}

        <button
          type="button"
          onClick={onRetry}
          className={cn(
            'flex-1 py-2.5 px-4 flex items-center justify-center gap-2',
            isFailed ? 'btn-primary bg-neo-orange text-neo-black' : 'bg-neo-white/10 text-neo-white',
            'font-black text-base border-3 border-neo-black rounded-neo',
            'shadow-hard hover:shadow-hard-lg',
            'active:translate-y-0.5 active:shadow-hard-pressed',
            'focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-cyan',
            'transition-all duration-200'
          )}
        >
          <RotateCcw className="w-4 h-4" />
          {canRetryFree ? t('adventure.freeRetry') : t('adventure.retryLevel')}
        </button>

        <button
          type="button"
          onClick={onExit}
          className={cn(
            'py-2.5 px-4 flex items-center justify-center gap-2',
            isFailed
              ? 'flex-1 bg-neo-white/10 text-neo-white font-black text-base border-3 border-neo-black shadow-hard active:translate-y-0.5 active:shadow-hard-pressed'
              : 'bg-transparent text-neo-white font-bold text-base border-2 border-neo-white/10',
            'hover:text-neo-white hover:bg-neo-white/10',
            'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-neo-lime',
            'rounded-neo transition-all duration-200'
          )}
        >
          <DoorOpen className="w-4 h-4" />
          {isFailed ? t('adventure.backToLevels') : t('common.exit')}
        </button>
      </div>
    </div>
  );
});

LevelCompleteActions.displayName = 'LevelCompleteActions';

export default LevelCompleteContent;
