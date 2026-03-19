/**
 * AdventureHub — The first screen a returning player sees.
 *
 * Shows: streak counter + multiplier, today's 3 daily quests with progress,
 * continue button pointing to next unlocked level, and player stats.
 * This is the primary D1→D7 retention driver.
 */

'use client';

import { memo, useMemo } from 'react';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { Flame, Target, Star, Zap, ChevronRight, Map, Coins, Trophy, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { getStreakMultiplier } from '@/lib/adventure/adventureStreak';
import { getNextUnlockedLevel } from '@/lib/adventure/constants';
import { getWorldConfig } from '@/lib/adventure/levelConfig';
import type { DailyQuest } from '@/lib/adventure/dailyQuests';
import type { LevelCompletion } from '@/types/adventure';

// ==============================================
// TYPES
// ==============================================

interface DailyQuestProgress {
  quest: DailyQuest;
  current: number;
  isComplete: boolean;
}

interface AdventureHubProps {
  /** Player's current streak days */
  streakDays: number;
  /** Player's best streak */
  bestStreak: number;
  /** Today's daily quests with progress */
  dailyQuests: DailyQuestProgress[];
  /** Total stars collected */
  totalStars: number;
  /** Player level */
  playerLevel: number;
  /** Gold amount */
  gold: number;
  /** Level completions for determining next level */
  completions: LevelCompletion[];
  /** Current world the player is on */
  currentWorld: number;
  /** Navigate to world map */
  onOpenWorldMap: () => void;
  /** Navigate directly to a level */
  onPlayLevel: (worldId: number, levelId: number) => void;
  /** Open the Word Forge shop */
  onOpenShop: () => void;
  /** Number of unique words in album */
  wordAlbumCount?: number;
  /** Navigate to weekly challenge */
  onWeeklyChallenge?: () => void;
  /** Navigate to boss rush mode */
  onBossRush?: () => void;
  /** Whether player has defeated a boss */
  hasBossDefeat?: boolean;
}

// ==============================================
// COMPONENT
// ==============================================

const AdventureHub = memo<AdventureHubProps>(({
  streakDays,
  bestStreak,
  dailyQuests,
  totalStars,
  playerLevel,
  gold,
  completions,
  currentWorld,
  onOpenWorldMap,
  onPlayLevel,
  onOpenShop,
  wordAlbumCount = 0,
  onWeeklyChallenge,
}) => {
  const { t } = useLanguageSafe();
  const multiplier = getStreakMultiplier(streakDays);

  // Find next unlocked level for the "Continue" button
  const nextLevel = useMemo(() => {
    return getNextUnlockedLevel(currentWorld, completions);
  }, [currentWorld, completions]);

  const nextWorldConfig = nextLevel ? getWorldConfig(nextLevel.world) : null;

  const completedQuestCount = dailyQuests.filter(q => q.isComplete).length;

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100dvh-56px)] px-4 py-8 gap-6 max-w-lg mx-auto">

      {/* Streak Section */}
      <AdaptiveMotion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className={cn(
          'w-full p-4 rounded-neo border-3 border-neo-black shadow-hard',
          streakDays > 0 ? 'bg-neo-orange/20' : 'bg-neo-white/5'
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-12 h-12 rounded-neo flex items-center justify-center border-3 border-neo-black',
              streakDays > 0 ? 'bg-neo-orange shadow-hard-sm' : 'bg-neo-white/10'
            )}>
              <Flame className={cn(
                'w-7 h-7',
                streakDays > 0 ? 'text-neo-black' : 'text-neo-white/40'
              )} />
            </div>
            <div>
              <p className={cn(
                'text-2xl font-black tabular-nums',
                streakDays > 0 ? 'text-neo-orange' : 'text-neo-white/40'
              )}>
                {streakDays} {t('adventure.hub.days')}
              </p>
              <p className="text-xs text-neo-white/50 font-bold">
                {streakDays > 0
                  ? t('adventure.hub.streakActive')
                  : t('adventure.hub.playToStart')}
              </p>
            </div>
          </div>

          {/* Multiplier badge */}
          {multiplier > 1 && (
            <div className="px-3 py-1.5 bg-neo-orange rounded-neo border-2 border-neo-black">
              <span className="text-neo-black font-black text-lg">
                {multiplier.toFixed(1)}x
              </span>
            </div>
          )}
        </div>

        {/* Best streak */}
        {bestStreak > 0 && (
          <p className="text-xs text-neo-white/30 mt-2 font-bold">
            {t('adventure.hub.bestStreak')}: {bestStreak} {t('adventure.hub.days')}
          </p>
        )}
      </AdaptiveMotion.div>

      {/* Daily Quests */}
      <AdaptiveMotion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="w-full"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-neo-cyan" />
            <h2 className="text-lg font-black text-neo-white uppercase tracking-tight">
              {t('adventure.hub.dailyQuests')}
            </h2>
          </div>
          <span className="text-sm font-bold text-neo-cyan">
            {completedQuestCount}/3
          </span>
        </div>

        <div className="space-y-2">
          {dailyQuests.map((dq, i) => {
            const progress = Math.min(dq.current / dq.quest.target, 1);
            return (
              <AdaptiveMotion.div
                key={dq.quest.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 + i * 0.08 }}
                className={cn(
                  'p-3 rounded-neo border-2',
                  dq.isComplete
                    ? 'bg-neo-lime/15 border-neo-lime/40'
                    : 'bg-neo-white/5 border-neo-white/10'
                )}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className={cn(
                    'text-sm font-bold',
                    dq.isComplete ? 'text-neo-lime' : 'text-neo-white'
                  )}>
                    {t(dq.quest.titleKey)}
                  </span>
                  <span className="text-xs font-mono text-neo-white/50">
                    {Math.min(dq.current, dq.quest.target)}/{dq.quest.target}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="h-1.5 bg-neo-black/40 rounded-full overflow-hidden">
                  <AdaptiveMotion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress * 100}%` }}
                    transition={{ delay: 0.4 + i * 0.1, duration: 0.5 }}
                    className={cn(
                      'h-full rounded-full',
                      dq.isComplete ? 'bg-neo-lime' : 'bg-neo-cyan'
                    )}
                  />
                </div>

                {/* Reward preview */}
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-xs text-neo-yellow/70 flex items-center gap-0.5">
                    <Coins className="w-3 h-3" /> {dq.quest.rewardGold}
                  </span>
                  <span className="text-xs text-neo-purple/70 flex items-center gap-0.5">
                    <Zap className="w-3 h-3" /> {dq.quest.rewardXp} XP
                  </span>
                </div>
              </AdaptiveMotion.div>
            );
          })}
        </div>
      </AdaptiveMotion.div>

      {/* Player Stats Row */}
      <AdaptiveMotion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="flex items-center gap-3 w-full"
      >
        <div className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-neo-yellow/10 border border-neo-yellow/30 rounded-neo">
          <Star className="w-4 h-4 text-neo-yellow fill-neo-yellow" />
          <span className="text-sm font-bold text-neo-yellow">{totalStars}</span>
        </div>
        <div className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-neo-purple/10 border border-neo-purple/30 rounded-neo">
          <Zap className="w-4 h-4 text-neo-purple" />
          <span className="text-sm font-bold text-neo-purple">{t('adventure.levelWithNumber', { level: playerLevel })}</span>
        </div>
        <button
          onClick={onOpenShop}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-neo-orange/10 border border-neo-orange/30 rounded-neo hover:bg-neo-orange/20 transition-colors"
        >
          <Coins className="w-4 h-4 text-neo-orange" />
          <span className="text-sm font-bold text-neo-orange">{gold}</span>
        </button>
      </AdaptiveMotion.div>

      {/* Continue Button — primary CTA */}
      {nextLevel && nextWorldConfig && (
        <AdaptiveMotion.button
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
          onClick={() => onPlayLevel(nextLevel.world, nextLevel.level)}
          className={cn(
            'w-full py-4 px-6',
            'flex items-center justify-between',
            'bg-neo-lime text-neo-black',
            'font-black text-lg uppercase tracking-tight',
            'border-3 border-neo-black rounded-neo shadow-hard-lg',
            'hover:shadow-hard hover:-translate-y-0.5',
            'active:translate-y-0.5 active:shadow-hard-pressed',
            'transition-all duration-150'
          )}
        >
          <div className="flex flex-col items-start">
            <span>{t('adventure.hub.continue')}</span>
            <span className="text-xs font-bold opacity-70 normal-case">
              {t(`adventure.worlds.${nextWorldConfig.name}`)} — {t('adventure.level')} {nextLevel.level}
            </span>
          </div>
          <ChevronRight className="w-6 h-6" />
        </AdaptiveMotion.button>
      )}

      {/* Secondary CTAs Row */}
      <AdaptiveMotion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="flex gap-3 w-full"
      >
        {/* Weekly Challenge */}
        {onWeeklyChallenge && (
          <button
            onClick={onWeeklyChallenge}
            className={cn(
              'flex-1 py-3 px-4',
              'flex flex-col items-center gap-1',
              'bg-neo-yellow/10 text-neo-yellow',
              'font-bold text-sm',
              'border-2 border-neo-yellow/30 rounded-neo',
              'hover:bg-neo-yellow/20',
              'transition-all duration-150'
            )}
          >
            <Trophy className="w-5 h-5" />
            {t('adventure.weeklyChallenge.title')}
          </button>
        )}

        {/* Word Album */}
        <div className={cn(
          'flex-1 py-3 px-4',
          'flex flex-col items-center gap-1',
          'bg-neo-cyan/10 text-neo-cyan',
          'font-bold text-sm',
          'border-2 border-neo-cyan/30 rounded-neo'
        )}>
          <BookOpen className="w-5 h-5" />
          <span>{wordAlbumCount} {t('adventure.album.uniqueWords')}</span>
        </div>

        {/* World Map */}
        <button
          onClick={onOpenWorldMap}
          className={cn(
            'flex-1 py-3 px-4',
            'flex flex-col items-center gap-1',
            'bg-neo-white/5 text-neo-white/80',
            'font-bold text-sm',
            'border-2 border-neo-white/20 rounded-neo',
            'hover:bg-neo-white/10',
            'transition-all duration-150'
          )}
        >
          <Map className="w-5 h-5" />
          {t('adventure.hub.worldMap')}
        </button>
      </AdaptiveMotion.div>
    </div>
  );
});

AdventureHub.displayName = 'AdventureHub';

export default AdventureHub;
