/**
 * AdventureHub — The first screen a returning player sees.
 *
 * Hero image from current world, streak + stats overlaid,
 * compact daily quest progress, big Continue CTA,
 * and a tidy row of secondary actions.
 */

'use client';

import { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { Flame, ChevronRight, Map, Swords, Target, Trophy, Check, Coins, Star, BookOpen, ShoppingBag } from 'lucide-react';
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

export interface DailyQuestProgress {
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
// WORLD IMAGE MAPPING
// ==============================================

const WORLD_IMAGES: Record<number, string> = {
  1: '/images/adventure/world-meadows-3d.webp',
  2: '/images/adventure/world-springs-3d.webp',
  3: '/images/adventure/world-caverns-3d.webp',
  4: '/images/adventure/world-archipelago-3d.webp',
  5: '/images/adventure/world-canyon-3d.webp',
  6: '/images/adventure/world-labyrinth-3d.webp',
  7: '/images/adventure/world-palace-3d.webp',
  8: '/images/adventure/world-nebula-3d.webp',
  9: '/images/adventure/world-peaks-3d.webp',
  10: '/images/adventure/world-throne-3d.webp',
};

// Spring config reused across sections
const spring = { type: 'spring' as const, stiffness: 300, damping: 24 };

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
  onBossRush,
  canBossRush = false,
  onWeeklyChallenge,
  wordAlbumCount = 0,
  onOpenWordAlbum,
}) => {
  const { t } = useLanguageSafe();
  const multiplier = getStreakMultiplier(streakDays);

  const nextLevel = useMemo(() => {
    return getNextUnlockedLevel(currentWorld, completions);
  }, [currentWorld, completions]);

  const nextWorldConfig = nextLevel ? getWorldConfig(nextLevel.world) : null;
  const worldConfig = getWorldConfig(currentWorld);
  const completedQuestCount = dailyQuests.filter(q => q.isComplete).length;
  const totalQuests = dailyQuests.length || 3;
  const heroImage = WORLD_IMAGES[currentWorld] ?? WORLD_IMAGES[1];

  return (
    <div className="flex flex-col min-h-[calc(100dvh-56px)] max-w-md mx-auto">
      {/* Hero Section — world image with overlaid stats */}
      <motion.div
        initial={{ opacity: 0, scale: 1.05 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="relative w-full aspect-[16/10] overflow-hidden"
      >
        <Image
          src={heroImage}
          alt={t(`adventure.worlds.${worldConfig?.name ?? 'alphabetMeadows'}`)}
          fill
          className="object-cover"
          priority
          sizes="(max-width: 448px) 100vw, 448px"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-neo-navy via-neo-navy/60 to-transparent" />

        {/* Home link — top-left */}
        <Link
          href="/"
          className="absolute top-3 start-3 text-neo-white/70 font-bold text-xs hover:text-neo-white transition-colors z-10 bg-neo-black/30 backdrop-blur-sm px-2 py-1 rounded-neo"
          aria-label={t('common.home')}
        >
          ← {t('common.home')}
        </Link>

        {/* Player stats — overlaid bottom */}
        <div className="absolute bottom-3 inset-x-3 flex items-end justify-between z-10">
          <div>
            <div className="text-neo-white font-black text-xl leading-tight">
              {t('adventure.level')} {playerLevel}
            </div>
            <div className="text-neo-white/60 text-xs font-bold mt-0.5">
              {t(`adventure.worlds.${worldConfig?.name ?? 'alphabetMeadows'}`)}
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="flex items-center gap-1 text-neo-yellow font-bold text-sm tabular-nums">
              <Star className="w-3.5 h-3.5" /> {totalStars}
            </span>
            <span className="flex items-center gap-1 text-neo-lime font-bold text-sm tabular-nums">
              <Coins className="w-3.5 h-3.5" /> {gold}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Content area */}
      <div className="flex flex-col gap-4 px-4 py-4 flex-1">

        {/* Streak + Daily Quests — single compact row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.15 }}
          className="flex items-center gap-3"
        >
          {/* Streak badge */}
          <div className={cn(
            'flex items-center gap-1.5 px-3 py-2 rounded-neo border-2 shrink-0',
            streakDays > 0
              ? 'border-neo-pink/40 bg-neo-pink/10'
              : 'border-neo-white/10 bg-neo-white/5'
          )}>
            <Flame className={cn(
              'w-5 h-5',
              streakDays > 0 ? 'text-neo-pink' : 'text-neo-white/30'
            )} />
            <span className={cn(
              'text-sm font-black tabular-nums',
              streakDays > 0 ? 'text-neo-pink' : 'text-neo-white/30'
            )}>
              {streakDays}
            </span>
            {multiplier > 1 && (
              <span className="text-neo-pink font-black text-[10px] px-1 py-0.5 bg-neo-pink/20 rounded">
                {multiplier.toFixed(1)}x
              </span>
            )}
            {bestStreak > 0 && (
              <span className="text-neo-white/40 font-bold text-[10px] ms-0.5">
                {t('adventure.hub.bestStreak')}: {bestStreak}
              </span>
            )}
          </div>

          {/* Daily quest dots — compact progress */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-neo-cyan" />
                <span className="text-xs font-black text-neo-white uppercase tracking-tight">
                  {t('adventure.hub.dailyQuests')}
                </span>
              </div>
              <span className="text-[10px] font-bold text-neo-cyan tabular-nums">
                {completedQuestCount}/{totalQuests}
              </span>
            </div>
            {/* Quest progress bars */}
            <div className="flex gap-1">
              {dailyQuests.map((dq) => {
                const progress = Math.min(dq.current / dq.quest.target, 1);
                return (
                  <div key={dq.quest.id} className="flex-1 h-1.5 bg-neo-white/10 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progress * 100}%` }}
                      transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
                      className={cn(
                        'h-full rounded-full',
                        dq.isComplete ? 'bg-neo-lime' : 'bg-neo-cyan'
                      )}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* Quest detail rows — staggered entrance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.25 }}
          className="space-y-1.5"
        >
          {dailyQuests.map((dq, i) => (
            <motion.div
              key={dq.quest.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.35 + i * 0.08, ...spring }}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-neo border',
                dq.isComplete
                  ? 'border-neo-lime/30 bg-neo-lime/10'
                  : 'border-neo-white/10 bg-neo-white/5'
              )}
            >
              {dq.isComplete ? (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring' as const, stiffness: 400, damping: 10, delay: 0.45 + i * 0.08 }}
                >
                  <Check className="w-4 h-4 text-neo-lime shrink-0" />
                </motion.div>
              ) : (
                <div className="w-4 h-4 rounded-full border-2 border-neo-white/20 shrink-0" />
              )}
              <span className={cn(
                'text-sm font-bold flex-1 min-w-0 truncate',
                dq.isComplete ? 'text-neo-lime' : 'text-neo-white'
              )}>
                {t(dq.quest.titleKey)}
              </span>
              <span className="text-[10px] font-mono text-neo-white/40 tabular-nums shrink-0">
                {Math.min(dq.current, dq.quest.target)}/{dq.quest.target}
              </span>
            </motion.div>
          ))}

          {/* All quests complete bonus */}
          {completedQuestCount === totalQuests && totalQuests > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring' as const, stiffness: 300, damping: 20 }}
              className="py-1.5 text-center text-neo-lime font-bold text-xs uppercase rounded-neo border border-neo-lime/30 bg-neo-lime/10"
            >
              {t('adventure.hub.allQuestsComplete')}
            </motion.div>
          )}
        </motion.div>

        {/* Spacer to push CTA + actions to bottom */}
        <div className="flex-1 min-h-2" />

        {/* Continue Button — hero CTA with subtle pulse */}
        {nextLevel && nextWorldConfig && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{
              opacity: 1,
              y: 0,
              scale: [1, 1.015, 1],
            }}
            transition={{
              opacity: { duration: 0.4, delay: 0.3 },
              y: { ...spring, delay: 0.3 },
              scale: { duration: 2.5, repeat: Infinity, ease: 'easeInOut' },
            }}
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.97, y: 2 }}
            onClick={() => onPlayLevel(nextLevel.world, nextLevel.level)}
            className={cn(
              'w-full py-4 px-6',
              'flex items-center justify-between',
              'bg-neo-lime text-neo-black',
              'font-black text-lg uppercase tracking-tight',
              'border-3 border-neo-black rounded-neo shadow-hard-lg',
              'transition-shadow duration-150'
            )}
          >
            <div className="flex flex-col items-start">
              <span>{t('adventure.hub.continue')}</span>
              <span className="text-xs font-bold opacity-70 normal-case">
                {t(`adventure.worlds.${nextWorldConfig.name}`)} — {t('adventure.level')} {nextLevel.level}
              </span>
            </div>
            <ChevronRight className="w-6 h-6 rtl:scale-x-[-1]" />
          </motion.button>
        )}

        {/* Secondary actions — compact row */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.4 }}
          className="flex gap-2 w-full pb-2"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
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
          </motion.button>

          {onWeeklyChallenge && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
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
            </motion.button>
          )}

          {canBossRush && onBossRush && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
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
            </motion.button>
          )}
        </motion.div>

        {/* Tertiary actions — shop + word album */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.5 }}
          className="flex gap-2 w-full pb-2"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onOpenShop}
            className={cn(
              'flex-1 py-2.5 px-3',
              'flex items-center justify-center gap-1.5',
              'bg-neo-white/5 text-neo-white/70',
              'font-bold text-xs',
              'border border-neo-white/15 rounded-neo',
              'hover:bg-neo-white/10 transition-colors'
            )}
          >
            <ShoppingBag className="w-4 h-4" />
            {t('adventure.shop.title')}
          </motion.button>

          {onOpenWordAlbum && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
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
              {wordAlbumCount > 0 && (
                <span className="text-[10px] font-mono text-neo-cyan tabular-nums">
                  {wordAlbumCount}
                </span>
              )}
            </motion.button>
          )}
        </motion.div>
      </div>
    </div>
  );
});

AdventureHub.displayName = 'AdventureHub';

export default AdventureHub;
