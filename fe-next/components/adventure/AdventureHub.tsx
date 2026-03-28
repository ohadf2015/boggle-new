/**
 * AdventureHub — The first screen a returning player sees.
 *
 * Simplified landing: streak, compact daily progress, big Continue CTA,
 * and a tidy row of secondary actions. Minimal stats to reduce clutter.
 */

'use client';

import { memo, useMemo } from 'react';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { Flame, ChevronRight, Map, Swords, Target, Trophy, Check, Coins, Star, BookOpen } from 'lucide-react';
import Link from 'next/link';
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
  streakDays: number;
  bestStreak: number;
  dailyQuests: DailyQuestProgress[];
  totalStars: number;
  playerLevel: number;
  gold: number;
  xp?: number;
  completions: LevelCompletion[];
  currentWorld: number;
  onOpenWorldMap: () => void;
  onPlayLevel: (worldId: number, levelId: number) => void;
  onOpenShop: () => void;
  wordAlbumCount?: number;
  onWeeklyChallenge?: () => void;
  onBossRush?: () => void;
  canBossRush?: boolean;
  onOpenWordAlbum?: () => void;
}

// ==============================================
// COMPONENT
// ==============================================

const AdventureHub = memo<AdventureHubProps>(({
  streakDays,
  dailyQuests,
  totalStars,
  playerLevel,
  gold,
  completions,
  currentWorld,
  onOpenWorldMap,
  onPlayLevel,
  onBossRush,
  canBossRush = false,
  onWeeklyChallenge,
  wordAlbumCount,
  onOpenWordAlbum,
}) => {
  const { t } = useLanguageSafe();
  const multiplier = getStreakMultiplier(streakDays);

  const nextLevel = useMemo(() => {
    return getNextUnlockedLevel(currentWorld, completions);
  }, [currentWorld, completions]);

  const nextWorldConfig = nextLevel ? getWorldConfig(nextLevel.world) : null;
  const completedQuestCount = dailyQuests.filter(q => q.isComplete).length;
  const totalQuests = dailyQuests.length || 3;

  return (
    <div className="flex flex-col items-center min-h-[calc(100dvh-56px)] px-4 py-6 gap-5 max-w-md mx-auto">

      {/* Home link — compact */}
      <div className="w-full flex justify-start">
        <Link
          href="/"
          className="text-neo-white/60 font-bold text-sm hover:text-neo-white transition-colors"
          aria-label={t('common.home')}
        >
          ← {t('common.home')}
        </Link>
      </div>

      {/* Player Stats — level, stars, gold */}
      <div className="w-full flex items-center justify-between gap-2 text-sm">
        <div className="flex items-center gap-1.5 text-neo-cyan">
          <span className="font-black tabular-nums">{t('adventure.hub.level')} {playerLevel}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-neo-yellow font-bold tabular-nums">
            <Star className="w-3.5 h-3.5" /> {totalStars}
          </span>
          <span className="flex items-center gap-1 text-neo-lime font-bold tabular-nums">
            <Coins className="w-3.5 h-3.5" /> {gold}
          </span>
        </div>
      </div>

      {/* Streak — compact inline */}
      <AdaptiveMotion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'w-full flex items-center gap-3 p-3 rounded-neo border-2',
          streakDays > 0
            ? 'border-neo-pink/40 bg-neo-pink/10'
            : 'border-neo-white/10 bg-neo-white/5'
        )}
      >
        <Flame className={cn(
          'w-6 h-6 shrink-0',
          streakDays > 0 ? 'text-neo-pink' : 'text-neo-white/30'
        )} />
        <div className="flex-1 min-w-0">
          <span className={cn(
            'text-lg font-black tabular-nums',
            streakDays > 0 ? 'text-neo-pink' : 'text-neo-white/30'
          )}>
            {streakDays} {t('adventure.hub.days')}
          </span>
          <span className="text-xs text-neo-white/40 font-bold ms-2">
            {streakDays > 0
              ? t('adventure.hub.streakActive')
              : t('adventure.hub.playToStart')}
          </span>
        </div>
        {multiplier > 1 && (
          <span className="text-neo-pink font-black text-sm px-2 py-0.5 bg-neo-pink/20 rounded-neo border border-neo-pink/30">
            {multiplier.toFixed(1)}x
          </span>
        )}
      </AdaptiveMotion.div>

      {/* Daily Quests — compact summary with mini progress dots */}
      <AdaptiveMotion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="w-full"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-neo-cyan" />
            <span className="text-sm font-black text-neo-white uppercase tracking-tight">
              {t('adventure.hub.dailyQuests')}
            </span>
          </div>
          <span className="text-xs font-bold text-neo-cyan tabular-nums">
            {completedQuestCount}/{totalQuests}
          </span>
        </div>

        {/* Quest rows — name + progress only, no rewards clutter */}
        <div className="space-y-1.5">
          {dailyQuests.map((dq, i) => {
            const progress = Math.min(dq.current / dq.quest.target, 1);
            return (
              <div
                key={dq.quest.id}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-neo border',
                  dq.isComplete
                    ? 'border-neo-lime/30 bg-neo-lime/10'
                    : 'border-neo-white/10 bg-neo-white/5'
                )}
              >
                {dq.isComplete ? (
                  <Check className="w-4 h-4 text-neo-lime shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full border-2 border-neo-white/20 shrink-0" />
                )}
                <span className={cn(
                  'text-sm font-bold flex-1 min-w-0 truncate',
                  dq.isComplete ? 'text-neo-lime' : 'text-neo-white'
                )}>
                  {t(dq.quest.titleKey)}
                </span>
                <div className="w-16 h-1.5 bg-neo-black/40 rounded-full overflow-hidden shrink-0">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-500',
                      dq.isComplete ? 'bg-neo-lime' : 'bg-neo-cyan'
                    )}
                    style={{ width: `${progress * 100}%` }}
                  />
                </div>
                <span className="text-[10px] font-mono text-neo-white/40 tabular-nums w-8 text-end shrink-0">
                  {Math.min(dq.current, dq.quest.target)}/{dq.quest.target}
                </span>
              </div>
            );
          })}
        </div>

        {/* All quests complete bonus */}
        {completedQuestCount === totalQuests && totalQuests > 0 && (
          <div className="mt-2 py-1.5 text-center text-neo-lime font-bold text-xs uppercase rounded-neo border border-neo-lime/30 bg-neo-lime/10">
            {t('adventure.hub.allQuestsComplete')}
          </div>
        )}
      </AdaptiveMotion.div>

      {/* Continue Button — the hero CTA */}
      {nextLevel && nextWorldConfig && (
        <AdaptiveMotion.button
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
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
          <ChevronRight className="w-6 h-6 rtl:scale-x-[-1]" />
        </AdaptiveMotion.button>
      )}

      {/* Secondary actions — compact icon row */}
      <AdaptiveMotion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="flex gap-2 w-full"
      >
        {/* World Map */}
        <button
          onClick={onOpenWorldMap}
          className={cn(
            'flex-1 py-2.5 px-3',
            'flex items-center justify-center gap-1.5',
            'bg-neo-white/5 text-neo-white/70',
            'font-bold text-xs',
            'border border-neo-white/15 rounded-neo',
            'hover:bg-neo-white/10 transition-colors'
          )}
        >
          <Map className="w-4 h-4" />
          {t('adventure.hub.worldMap')}
        </button>

        {/* Weekly Challenge */}
        {onWeeklyChallenge && (
          <button
            onClick={onWeeklyChallenge}
            className={cn(
              'flex-1 py-2.5 px-3',
              'flex items-center justify-center gap-1.5',
              'bg-neo-white/5 text-neo-white/70',
              'font-bold text-xs',
              'border border-neo-white/15 rounded-neo',
              'hover:bg-neo-white/10 transition-colors'
            )}
          >
            <Trophy className="w-4 h-4" />
            {t('adventure.weeklyChallenge.title')}
          </button>
        )}

        {/* Word Album */}
        {onOpenWordAlbum && (
          <button
            onClick={onOpenWordAlbum}
            className={cn(
              'flex-1 py-2.5 px-3',
              'flex items-center justify-center gap-1.5',
              'bg-neo-white/5 text-neo-white/70',
              'font-bold text-xs',
              'border border-neo-white/15 rounded-neo',
              'hover:bg-neo-white/10 transition-colors'
            )}
          >
            <BookOpen className="w-4 h-4" />
            {t('adventure.hub.wordAlbum')}
            {(wordAlbumCount ?? 0) > 0 && (
              <span className="text-[10px] tabular-nums text-neo-cyan">{wordAlbumCount}</span>
            )}
          </button>
        )}

        {/* Boss Rush — only if unlocked */}
        {canBossRush && onBossRush && (
          <button
            onClick={onBossRush}
            className={cn(
              'flex-1 py-2.5 px-3',
              'flex items-center justify-center gap-1.5',
              'bg-neo-pink/10 text-neo-pink',
              'font-bold text-xs',
              'border border-neo-pink/30 rounded-neo',
              'hover:bg-neo-pink/20 transition-colors'
            )}
          >
            <Swords className="w-4 h-4" />
            {t('adventure.bossRush.title')}
          </button>
        )}
      </AdaptiveMotion.div>
    </div>
  );
});

AdventureHub.displayName = 'AdventureHub';

export default AdventureHub;
