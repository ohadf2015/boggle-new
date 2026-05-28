/**
 * AdventureHub — The first screen a returning player sees.
 *
 * Hero image from current world, streak + stats overlaid,
 * compact daily quest progress, big Continue CTA,
 * and a tidy row of secondary actions.
 */

'use client';

import { memo, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import Image from 'next/image';
const CrazyGamesBanner = dynamic(() => import('@/components/CrazyGamesBanner'), { ssr: false });
import { ArrowLeft, Flame, ChevronRight, Map, Swords, Coins, Star, ShoppingBag, Crown, Zap, Infinity as InfinityIcon, Trophy, Award } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { GhostRivalWidget } from '@/components/engagement/GhostRivalWidget';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { getStreakMultiplier } from '@/lib/adventure/adventureStreak';
import { getNextUnlockedLevel } from '@/lib/adventure/constants';
import { getWorldConfig } from '@/lib/adventure/levelConfig';
import { getAscensionLevel } from '@/lib/adventure/ascensionConfig';
import type { LevelCompletion } from '@/types/adventure';
import type { WeeklyModifier } from '@/lib/adventure/weeklyModifiers';

// ==============================================
// TYPES
// ==============================================

interface AdventureHubProps {
  streakDays: number;
  bestStreak: number;
  totalStars: number;
  playerLevel: number;
  gold: number;
  completions: LevelCompletion[];
  currentWorld: number;
  onOpenWorldMap: () => void;
  onPlayLevel: (worldId: number, levelId: number) => void;
  onOpenShop: () => void;

  onBossRush?: () => void;
  canBossRush?: boolean;
  onOpenCollection?: () => void;
  collectionCount?: number;
  onOpenAchievements?: () => void;
  ascensionLevel?: number;
  weeklyModifiers?: WeeklyModifier[];
  welcomeBanner?: React.ReactNode;
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
  onOpenCollection,
  collectionCount = 0,
  onOpenAchievements,
  ascensionLevel = 0,
  weeklyModifiers = [],
  welcomeBanner,
}) => {
  const { t } = useLanguageSafe();
  const multiplier = getStreakMultiplier(streakDays);
  const ascension = ascensionLevel > 0 ? getAscensionLevel(ascensionLevel) : null;

  const nextLevel = useMemo(() => {
    return getNextUnlockedLevel(currentWorld, completions);
  }, [currentWorld, completions]);

  const nextWorldConfig = nextLevel ? getWorldConfig(nextLevel.world) : null;
  const worldConfig = getWorldConfig(currentWorld);
  const heroImage = WORLD_IMAGES[currentWorld] ?? WORLD_IMAGES[1];

  return (
    <div className="flex flex-col min-h-[calc(100dvh-56px)] max-w-md mx-auto">
      {/* Hero Section — world image with overlaid stats */}
      <AdaptiveMotion.div
        initial={{ opacity: 0, scale: 1.05 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="relative w-full aspect-16/10 overflow-hidden"
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
        <div className="absolute inset-0 bg-linear-to-t from-neo-navy via-neo-navy/60 to-transparent" />

        {/* Back to home — overlaid top-start */}
        <Link
          href="/"
          aria-label={t('common.back')}
          className="absolute top-2 start-2 z-20 flex items-center justify-center w-10 h-10 rounded-neo bg-neo-navy/60 text-neo-white hover:text-neo-white hover:bg-neo-navy/80 transition-colors"
          style={{ marginTop: 'env(safe-area-inset-top, 0px)' }}
        >
          <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
        </Link>

        {/* Player stats — overlaid bottom */}
        <div className="absolute bottom-3 inset-x-3 flex items-end justify-between z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-neo-white font-black text-xl leading-tight">
                {t('adventure.level')} {playerLevel}
              </span>
              {ascension && (
                <span className="flex items-center gap-1 text-[10px] font-black text-neo-yellow bg-neo-yellow/20 border border-neo-yellow/40 px-1.5 py-0.5 rounded">
                  <Crown className="w-3 h-3" />
                  {t(ascension.nameKey)}
                </span>
              )}
            </div>
            <div className="text-neo-white text-xs font-bold mt-0.5">
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
      </AdaptiveMotion.div>

      {/* Content area */}
      <div className="flex flex-col gap-4 px-4 py-4 pb-20 flex-1">
        {welcomeBanner}

        {/* Streak + Daily Quests — single compact row */}
        <AdaptiveMotion.div
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
              streakDays > 0 ? 'text-neo-pink' : 'text-neo-white'
            )} />
            <span className={cn(
              'text-sm font-black tabular-nums',
              streakDays > 0 ? 'text-neo-pink' : 'text-neo-white'
            )}>
              {streakDays}
            </span>
            {multiplier > 1 && (
              <span className="text-neo-pink font-black text-[10px] px-1 py-0.5 bg-neo-pink/20 rounded">
                {multiplier.toFixed(1)}x
              </span>
            )}
            {bestStreak > 0 && (
              <span className="text-neo-white font-bold text-[10px] ms-0.5">
                {t('adventure.hub.bestStreak')}: {bestStreak}
              </span>
            )}
          </div>

        </AdaptiveMotion.div>

        {/* Weekly modifiers — active modifier pills */}
        {weeklyModifiers.length > 0 && (
          <AdaptiveMotion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.2 }}
            className="flex flex-wrap gap-1.5"
          >
            {weeklyModifiers.map((mod) => (
              <span
                key={mod.id}
                className="flex items-center gap-1 text-[10px] font-bold text-neo-purple bg-neo-purple/15 border border-neo-purple/30 px-2 py-1 rounded-neo"
                title={t(mod.descriptionKey)}
              >
                <Zap className="w-3 h-3" />
                {t(mod.nameKey)}
              </span>
            ))}
          </AdaptiveMotion.div>
        )}


        {/* Ghost Rival — weekly rivalry widget */}
        <GhostRivalWidget />

        {/* Spacer to push CTA + actions to bottom */}
        <div className="flex-1 min-h-2" />

        {/* Bottom actions — padded and spaced */}
        <div className="flex flex-col gap-2 px-4 pb-4">

        {/* Continue Button — hero CTA with subtle pulse */}
        {nextLevel && nextWorldConfig && (
          <AdaptiveMotion.button
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
          </AdaptiveMotion.button>
        )}

        {/* Secondary actions — compact row */}
        <AdaptiveMotion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.4 }}
          className="flex gap-2 w-full"
        >
          <AdaptiveMotion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onOpenWorldMap}
            className={cn(
              'flex-1 py-2.5 px-3',
              'flex items-center justify-center gap-1.5',
              'bg-neo-white/5 text-neo-white',
              'font-bold text-xs',
              'border border-neo-white/15 rounded-neo',
              'hover:bg-neo-white/10 transition-colors'
            )}
          >
            <Map className="w-4 h-4" />
            {t('adventure.hub.worldMap')}
          </AdaptiveMotion.button>


          {currentWorld >= 3 && (
            <Link
              href="/adventure/endless"
              className={cn(
                'flex-1 py-2.5 px-3',
                'flex items-center justify-center gap-1.5',
                'bg-neo-purple/10 text-neo-purple',
                'font-bold text-xs',
                'border border-neo-purple/30 rounded-neo',
                'hover:bg-neo-purple/20 transition-colors'
              )}
            >
              <InfinityIcon className="w-4 h-4" />
              {t('adventure.endlessMode.title')}
            </Link>
          )}

          {canBossRush && onBossRush && (
            <AdaptiveMotion.button
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
            </AdaptiveMotion.button>
          )}
        </AdaptiveMotion.div>

        {/* Tertiary actions — shop + word album */}
        <AdaptiveMotion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.5 }}
          className="flex gap-2 w-full"
        >
          <AdaptiveMotion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onOpenShop}
            className={cn(
              'flex-1 py-2.5 px-3',
              'flex items-center justify-center gap-1.5',
              'bg-neo-white/5 text-neo-white',
              'font-bold text-xs',
              'border border-neo-white/15 rounded-neo',
              'hover:bg-neo-white/10 transition-colors'
            )}
          >
            <ShoppingBag className="w-4 h-4" />
            {t('adventure.shop.title')}
          </AdaptiveMotion.button>

          {onOpenCollection && (
            <AdaptiveMotion.button
              data-testid="hub-open-collection"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onOpenCollection}
              className={cn(
                'flex-1 py-2.5 px-3',
                'flex items-center justify-center gap-1.5',
                'bg-neo-pink/10 text-neo-pink',
                'font-bold text-xs',
                'border border-neo-pink/30 rounded-neo',
                'hover:bg-neo-pink/20 transition-colors'
              )}
            >
              <Trophy className="w-4 h-4" />
              {t('adventure.collection.title')}
              {collectionCount > 0 && (
                <span className="text-[10px] font-mono text-neo-pink tabular-nums">
                  {collectionCount}
                </span>
              )}
            </AdaptiveMotion.button>
          )}

          {onOpenAchievements && (
            <AdaptiveMotion.button
              data-testid="hub-open-achievements"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onOpenAchievements}
              className={cn(
                'flex-1 py-2.5 px-3',
                'flex items-center justify-center gap-1.5',
                'bg-neo-purple/10 text-neo-purple',
                'font-bold text-xs',
                'border border-neo-purple/30 rounded-neo',
                'hover:bg-neo-purple/20 transition-colors'
              )}
            >
              <Award className="w-4 h-4" />
              {t('adventure.achievements.title')}
            </AdaptiveMotion.button>
          )}
        </AdaptiveMotion.div>

        </div>
        {/* B6 — CrazyGames Adventure Hub banner */}
        <div className="w-full flex justify-center mt-4 mb-2">
          <CrazyGamesBanner responsive />
        </div>
      </div>
    </div>
  );
});

AdventureHub.displayName = 'AdventureHub';

export default AdventureHub;
