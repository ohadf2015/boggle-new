/**
 * BossRushPageClient — Client component for the Boss Rush page.
 *
 * Uses useBossRushArcade hook to manage rush state.
 * Embeds AdventureGame for actual boss fights (same pattern as Endless mode).
 * Gated behind having defeated at least 1 boss (level 7 completion).
 */

'use client';

import { useMemo, useRef, useCallback, useState } from 'react';
import nextDynamic from 'next/dynamic';
import Link from 'next/link';
import { ArrowLeft, Swords, Skull, Trophy, Coins, Zap, Lock, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { useProgressionData } from '@/contexts/ProgressionContext';
import { useBossRushArcade } from '@/hooks/useBossRushArcade';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { PageLoader } from '@/components/ui/PageLoader';
import { LEVELS_PER_WORLD, generateAdventureGrid } from '@/lib/adventure';
import { getLevelConfig, getWorldConfig } from '@/lib/adventure/levelConfig';
import type { LevelConfig } from '@/types/adventure';

const AdventureGame = nextDynamic(
  () => import('@/components/adventure/AdventureGame'),
  {
    ssr: false,
    loading: () => (
      <div className="h-screen bg-neo-navy flex items-center justify-center">
        <PageLoader size="lg" />
      </div>
    ),
  },
);

export function BossRushPageClient() {
  const { t, language } = useLanguageSafe();
  const { progression, isLoading } = useProgressionData();
  const { state, currentBossWorldId, isActive, startRush, reportResult, rewards, reset } = useBossRushArcade();

  // Generate boss level config for AdventureGame
  const [seed] = useState(() => Date.now());
  const seedRef = useRef(seed);
  const levelConfig: LevelConfig | null = useMemo(() => {
    if (!currentBossWorldId) return null;
    return getLevelConfig(currentBossWorldId, LEVELS_PER_WORLD);
  }, [currentBossWorldId]);

  const grid = useMemo(() => {
    if (!levelConfig || !currentBossWorldId) return null;
    const seed = seedRef.current + state.currentBossIndex;
    return generateAdventureGrid(levelConfig.gridSize, seed, language);
  }, [levelConfig, currentBossWorldId, state.currentBossIndex, language]);

  const handleBossComplete = useCallback(
    (stars: number) => {
      reportResult(stars >= 1 ? 'victory' : 'defeat');
    },
    [reportResult],
  );

  const handleBossExit = useCallback(() => {
    reportResult('defeat');
  }, [reportResult]);

  const completions = useMemo(() => progression?.completions ?? [], [progression?.completions]);
  const hasBossDefeat = useMemo(
    () => completions.some(c => c.level === LEVELS_PER_WORLD && c.stars >= 1),
    [completions],
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neo-navy flex items-center justify-center">
        <div className="text-neo-white font-bold animate-pulse">
          {t('common.loading')}
        </div>
      </div>
    );
  }

  // Gate: must have defeated at least 1 boss
  if (!hasBossDefeat) {
    return (
      <div className="min-h-screen bg-neo-navy flex flex-col items-center justify-center gap-6 px-4">
        <div className={cn(
          'p-6 rounded-neo border-3 border-neo-black shadow-hard',
          'bg-neo-white/5 text-center max-w-sm',
        )}>
          <Lock className="w-12 h-12 text-neo-white mx-auto mb-4" />
          <h1 className="text-xl font-black text-neo-white mb-2">
            {t('adventure.hub.bossRush')}
          </h1>
          <p className="text-neo-white text-sm font-bold">
            {t('adventure.hub.bossRushLocked')}
          </p>
        </div>
        <Link
          href={`/${language}/adventure`}
          className="text-neo-white hover:text-neo-white font-bold text-sm flex items-center gap-2 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 rtl:scale-x-[-1]" />
          {t('adventure.bossRush.backToHub')}
        </Link>
      </div>
    );
  }

  // Results screen (rush complete)
  if (state.isComplete && !isActive) {
    const isFullClear = state.defeatedCount >= state.totalBosses;
    return (
      <div className="min-h-screen bg-neo-navy flex flex-col items-center justify-center gap-6 px-4">
        <AdaptiveMotion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
          className={cn(
            'p-8 rounded-neo border-3 border-neo-black shadow-hard-lg',
            'text-center max-w-sm w-full',
            isFullClear ? 'bg-neo-lime/10' : 'bg-neo-pink/10',
          )}
        >
          {isFullClear ? (
            <Trophy className="w-16 h-16 text-neo-lime mx-auto mb-4" />
          ) : (
            <Skull className="w-16 h-16 text-neo-pink mx-auto mb-4" />
          )}

          <h1 className="text-2xl font-black text-neo-white mb-1">
            {isFullClear ? t('adventure.bossRush.fullClear') : t('adventure.bossRush.runOver')}
          </h1>

          <p className="text-neo-white text-sm font-bold mb-6">
            {t('adventure.bossRush.bossOf', {
              current: String(state.defeatedCount),
              total: String(state.totalBosses),
            })} {t('adventure.bossRush.defeated')}
          </p>

          {isFullClear && (
            <p className="text-neo-lime text-xs font-black uppercase mb-4">
              {t('adventure.bossRush.fullClearBonus')}
            </p>
          )}

          {/* Rewards */}
          <div className={cn(
            'p-4 rounded-neo border-2 border-neo-white/10 bg-neo-white/5 mb-6',
            'flex items-center justify-center gap-6',
          )}>
            <div className="flex items-center gap-1.5">
              <Coins className="w-5 h-5 text-neo-lime" />
              <span className="text-neo-lime font-black">
                {t('adventure.bossRush.goldEarned', { gold: String(rewards.gold) })}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Zap className="w-5 h-5 text-neo-purple" />
              <span className="text-neo-purple font-black">
                {t('adventure.bossRush.xpEarned', { xp: String(rewards.xp) })}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={reset}
              className={cn(
                'flex-1 py-3 px-4',
                'bg-neo-pink text-neo-black font-black text-sm uppercase',
                'border-3 border-neo-black rounded-neo shadow-hard',
                'hover:shadow-hard-sm active:shadow-hard-pressed active:translate-y-0.5',
                'transition-all duration-150',
                'flex items-center justify-center gap-2',
              )}
            >
              <RotateCcw className="w-4 h-4" />
              {t('adventure.bossRush.tryAgain')}
            </button>
            <Link
              href={`/${language}/adventure`}
              className={cn(
                'flex-1 py-3 px-4',
                'bg-neo-white/10 text-neo-white font-bold text-sm',
                'border-2 border-neo-white/20 rounded-neo',
                'hover:bg-neo-white/15',
                'transition-all duration-150',
                'flex items-center justify-center gap-2',
              )}
            >
              {t('adventure.bossRush.backToHub')}
            </Link>
          </div>
        </AdaptiveMotion.div>
      </div>
    );
  }

  // Pre-start or active state
  const currentWorldConfig = currentBossWorldId ? getWorldConfig(currentBossWorldId) : null;

  return (
    <div className="min-h-screen bg-neo-navy flex flex-col items-center justify-center gap-6 px-4">
      {/* Back link */}
      <Link
        href={`/${language}/adventure`}
        className="absolute top-4 inset-s-4 text-neo-white hover:text-neo-white font-bold text-sm flex items-center gap-2 transition-colors"
      >
        <ArrowLeft className="w-4 h-4 rtl:scale-x-[-1]" />
        {t('adventure.bossRush.backToHub')}
      </Link>

      {/* Title */}
      <AdaptiveMotion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <Swords className="w-12 h-12 text-neo-pink mx-auto mb-3" />
        <h1 className="text-3xl font-black text-neo-white uppercase tracking-tight">
          {t('adventure.bossRush.title')}
        </h1>
        <p className="text-neo-white text-sm font-bold mt-1">
          {t('adventure.bossRush.subtitle')}
        </p>
      </AdaptiveMotion.div>

      {/* Progress indicator */}
      {isActive && (
        <AdaptiveMotion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="w-full max-w-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-neo-white text-sm font-bold">
              {t('adventure.bossRush.bossOf', {
                current: String(state.currentBossIndex + 1),
                total: String(state.totalBosses),
              })}
            </span>
            <span className="text-neo-pink text-sm font-black">
              {state.defeatedCount} {t('adventure.bossRush.defeated')}
            </span>
          </div>

          {/* Boss progress dots */}
          <div className="flex gap-2 mb-6">
            {state.bossSequence.map((_, i) => (
              <div
                key={`boss-progress-${i}`}
                className={cn(
                  'flex-1 h-2 rounded-full transition-colors',
                  i < state.defeatedCount
                    ? 'bg-neo-lime'
                    : i === state.currentBossIndex
                      ? 'bg-neo-pink animate-pulse'
                      : 'bg-neo-white/10',
                )}
              />
            ))}
          </div>

          {/* Actual boss fight via AdventureGame */}
          {levelConfig && grid && (
            <div className="w-full -mx-4">
              <div className="mb-3 text-center">
                <p className="text-neo-white text-sm font-bold">
                  {currentWorldConfig && t(`adventure.worlds.${currentWorldConfig.name}`)}
                </p>
              </div>
              <AdventureGame
                levelConfig={levelConfig}
                initialGrid={grid}
                onLevelComplete={handleBossComplete}
                onExit={handleBossExit}
              />
            </div>
          )}
        </AdaptiveMotion.div>
      )}

      {/* Start button (pre-start) */}
      {!isActive && !state.isComplete && (
        <AdaptiveMotion.button
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          onClick={startRush}
          className={cn(
            'py-4 px-8',
            'bg-neo-pink text-neo-black',
            'font-black text-lg uppercase tracking-tight',
            'border-3 border-neo-black rounded-neo shadow-hard-lg',
            'hover:shadow-hard hover:-translate-y-0.5',
            'active:translate-y-0.5 active:shadow-hard-pressed',
            'transition-all duration-150',
            'flex items-center gap-3',
          )}
        >
          <Swords className="w-6 h-6" />
          {t('adventure.bossRush.startRush')}
        </AdaptiveMotion.button>
      )}
    </div>
  );
}
