/**
 * BossVictory Component
 *
 * Displays boss battle results with boss-specific personality-driven messages.
 * Replaces LevelCompleteModal for boss levels (level 7 of each world).
 * Victory shows celebratory green/lime theme, defeat shows encouraging red/orange theme.
 */

'use client';

import { memo, useEffect, useMemo, useRef } from 'react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { Star, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useHaptics } from '@/hooks/useHaptics';
import type { BossVictoryProps } from '@/types/boss';
import { SilentVideo } from '@/components/ui/SilentVideo';

// ==============================================
// CONSTANTS
// ==============================================

const STAR_SLOTS = [0, 1, 2] as const;

// ==============================================
// HELPER COMPONENTS
// ==============================================

const BossStarDisplay = memo<{ filled: boolean; index: number }>(
  ({ filled, index }) => (
    <AdaptiveMotion.div
      data-testid={filled ? 'star-filled' : 'star-empty'}
      initial={{ scale: 0, rotate: -180 }}
      animate={filled ? {
        scale: [0, 1.3, 1],
        rotate: [180, -10, 0],
      } : {
        scale: 1,
        rotate: 0,
      }}
      transition={{
        delay: 0.5 + index * 0.2,
        type: 'spring',
        stiffness: 180,
        damping: 12,
      }}
    >
      <Star
        className={cn(
          'w-10 h-10 md:w-14 md:h-14',
          filled
            ? 'text-neo-yellow fill-neo-yellow drop-shadow-[0_0_15px_rgba(255,225,53,0.9)]'
            : 'text-neo-white fill-transparent'
        )}
      />
    </AdaptiveMotion.div>
  )
);

BossStarDisplay.displayName = 'BossStarDisplay';

// ==============================================
// COMPONENT
// ==============================================

const BossVictory = memo<BossVictoryProps>(
  ({ boss, isVictory, stars, score, wordsFound, gameState, onContinue, onRetry }) => {
    const { t } = useLanguage();

    // Near-miss detection: boss was at <15% HP when player lost
    const bossObjective = gameState?.objectives?.find((o: { type: string }) => o.type === 'defeatBoss');
    const bossHpDepleted = bossObjective?.current ?? 0; // percentage depleted (0-100)
    const isNearMiss = !isVictory && bossHpDepleted >= 85; // boss had <15% HP left
    const dialogRef = useRef<HTMLDivElement>(null);
    const hapticFiredRef = useRef(false);
    const haptics = useHaptics();

    useFocusTrap(dialogRef, true, onContinue);

    // GF-003 — fire victory haptic once on mount when isVictory.
    // Mobile players expect rumble on big wins; absence felt empty.
    useEffect(() => {
      if (!isVictory || hapticFiredRef.current) return;
      hapticFiredRef.current = true;
      void haptics.levelComplete();
    }, [isVictory, haptics]);

    const formattedScore = useMemo(
      () => score.toLocaleString(),
      [score]
    );

    // Resolve boss taunt based on outcome
    const bossTaunt = useMemo(
      () => t(isVictory ? boss.taunts.onVictory : boss.taunts.onDefeat),
      [t, isVictory, boss.taunts.onVictory, boss.taunts.onDefeat]
    );

    const bossName = useMemo(() => t(boss.displayName), [t, boss.displayName]);

    return (
      <AdaptiveAnimatePresence>
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="boss-victory-title"
          className={cn(
            'fixed inset-0 z-50',
            'flex items-center justify-center',
            'bg-neo-black/85 backdrop-blur-xs'
          )}
        >
          {/* Themed background glow */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <AdaptiveMotion.div
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8 }}
              style={{
                background: isVictory
                  ? 'radial-gradient(ellipse at 50% 30%, rgba(163,230,53,0.2) 0%, transparent 60%)'
                  : 'radial-gradient(ellipse at 50% 30%, rgba(239,68,68,0.15) 0%, transparent 60%)',
              }}
            />
          </div>

          {/* Modal Content */}
          <AdaptiveMotion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className={cn(
              'relative w-full max-w-md mx-4',
              'bg-neo-navy border-4 border-neo-black',
              'rounded-neo shadow-hard-lg',
              'p-6 md:p-8'
            )}
          >
            {/* Title */}
            <AdaptiveMotion.h2
              id="boss-victory-title"
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className={cn(
                'text-center text-2xl md:text-3xl font-black mb-2',
                isVictory ? 'text-neo-lime' : 'text-neo-red'
              )}
            >
              {isVictory
                ? t('adventure.bosses.bossDefeated')
                : t('adventure.bosses.bossWins')}
            </AdaptiveMotion.h2>

            {/* Boss Image — victory: defeated boss wobbles in, defeat: attack boss slams in */}
            <AdaptiveMotion.div
              className="flex justify-center mb-3"
              initial={isVictory
                ? { scale: 0, rotate: 10, y: -20 }
                : { scale: 0, x: 40, rotate: 8 }
              }
              animate={isVictory
                ? { scale: [0, 1.15, 0.95, 1.02, 1], rotate: [10, -8, 4, -1, 0], y: [-20, 5, -2, 0] }
                : { scale: [0, 1.2, 1], x: [40, -5, 0], rotate: [8, -2, 0] }
              }
              transition={{
                delay: 0.2,
                type: 'spring',
                stiffness: isVictory ? 150 : 300,
                damping: isVictory ? 10 : 18,
                mass: 1.2,
              }}
            >
              <div className="relative">
                <AdaptiveMotion.img
                  src={isVictory ? (boss.images?.defeated ?? boss.imagePath) : (boss.images?.attack ?? boss.imagePath)}
                  alt={bossName}
                  className={cn(
                    'w-28 h-28 md:w-36 md:h-36',
                    'object-contain',
                    'border-3 border-neo-black rounded-neo',
                    isVictory
                      ? 'opacity-90 grayscale-20'
                      : 'drop-shadow-[0_0_16px_rgba(239,68,68,0.6)]'
                  )}
                  animate={isVictory
                    ? { rotate: [0, 1, -1, 0] }
                    : { scale: [1, 1.02, 1] }
                  }
                  transition={isVictory
                    ? { delay: 1, duration: 2, repeat: Infinity, ease: 'easeInOut' }
                    : { duration: 1.5, repeat: Infinity, ease: 'easeInOut' }
                  }
                />
                {/* Victory: defeated X eyes overlay shimmer */}
                {isVictory && (
                  <AdaptiveMotion.div
                    className="absolute inset-0 rounded-neo"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 0.15, 0] }}
                    transition={{ delay: 0.8, duration: 1.5, repeat: 2 }}
                    style={{ background: 'linear-gradient(135deg, transparent 30%, rgba(191,255,0,0.2) 50%, transparent 70%)' }}
                  />
                )}
              </div>
            </AdaptiveMotion.div>

            {/* Boss Name */}
            <AdaptiveMotion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-center text-lg font-black text-neo-white mb-1"
            >
              {bossName}
            </AdaptiveMotion.p>

            {/* Boss Taunt */}
            <AdaptiveMotion.p
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className={cn(
                'text-center text-sm font-bold italic mb-4',
                isVictory ? 'text-neo-lime/80' : 'text-neo-orange/80'
              )}
            >
              &ldquo;{bossTaunt}&rdquo;
            </AdaptiveMotion.p>

            {/* Near-miss encouragement */}
            {isNearMiss && (
              <AdaptiveMotion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
                className={cn(
                  'mx-auto mb-4 px-4 py-2 rounded-neo',
                  'bg-neo-yellow/20 border-2 border-neo-yellow/50',
                  'text-center'
                )}
              >
                <p className="text-neo-yellow font-black text-sm">
                  {t('adventure.bosses.nearMiss')}
                </p>
                <p className="text-neo-white text-xs mt-0.5">
                  {t('adventure.bosses.nearMissDesc', { hp: 100 - bossHpDepleted })}
                </p>
              </AdaptiveMotion.div>
            )}

            {/* Stars */}
            <div className="flex justify-center gap-2 mb-4">
              {STAR_SLOTS.map((i) => (
                <BossStarDisplay key={`star-${i}`} filled={i < stars} index={i} />
              ))}
            </div>

            {/* Lexicon Fragment collected (victory only) */}
            {isVictory && (
              <AdaptiveMotion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6, type: 'spring', stiffness: 200, damping: 15 }}
                className={cn(
                  'mx-auto mb-4 px-4 py-2.5 rounded-neo',
                  'bg-neo-lime/10 border-2 border-neo-lime/40',
                  'text-center'
                )}
              >
                <p className="text-neo-lime font-black text-sm">
                  {t('adventure.bosses.fragmentCollected')}
                </p>
                <p className="text-neo-white text-xs mt-0.5">
                  {t('adventure.bosses.fragmentCount', { current: boss.worldId, total: 10 })}
                </p>
              </AdaptiveMotion.div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              {/* Score */}
              <div className="text-center">
                <p className="text-neo-white text-xs font-bold uppercase tracking-wide">
                  {t('common.score')}
                </p>
                <p className="text-2xl md:text-3xl font-black text-neo-white">
                  {formattedScore}
                </p>
              </div>

              {/* Words Found */}
              <div className="text-center">
                <p className="text-neo-white text-xs font-bold uppercase tracking-wide">
                  {t('adventure.game.wordsFound')}
                </p>
                <p className="text-2xl md:text-3xl font-black text-neo-white">
                  {wordsFound.length}
                </p>
              </div>
            </div>

            {/* Mascot reaction */}
            <AdaptiveMotion.div
              className="flex justify-center mb-4"
              initial={{ scale: 0, rotate: isVictory ? 10 : -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.7, type: 'spring', stiffness: 200, damping: 14 }}
            >
              <SilentVideo
                src={isVictory ? '/mascot/flexing.webp' : '/mascot/encouraging.webp'}
                width={80}
                height={80}
                className="drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]"
                preload="metadata"
                aria-hidden="true"
              />
            </AdaptiveMotion.div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3">
              {/* Continue Button (victory only) */}
              {isVictory && (
                <button
                  onClick={onContinue}
                  className={cn(
                    'w-full py-3 px-4',
                    'bg-neo-lime text-neo-black',
                    'font-black text-lg',
                    'border-3 border-neo-black rounded-neo',
                    'shadow-hard hover:shadow-hard-lg hover:-translate-y-0.5',
                    'active:translate-y-0.5 active:shadow-hard-pressed',
                    'focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-cyan',
                    'transition-all duration-200'
                  )}
                >
                  {t('adventure.continueToNext')}
                </button>
              )}

              {/* Retry Button */}
              <button
                onClick={onRetry}
                className={cn(
                  'w-full py-3 px-4',
                  'flex items-center justify-center gap-2',
                  !isVictory
                    ? 'bg-neo-orange text-neo-black'
                    : 'bg-neo-white/10 text-neo-white',
                  'font-black text-lg',
                  'border-3 border-neo-black rounded-neo',
                  'shadow-hard hover:shadow-hard-lg hover:-translate-y-0.5',
                  'active:translate-y-0.5 active:shadow-hard-pressed',
                  'focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-cyan',
                  'transition-all duration-200'
                )}
              >
                <RotateCcw className="w-5 h-5" />
                {t('adventure.retryLevel')}
              </button>
            </div>
          </AdaptiveMotion.div>
        </div>
      </AdaptiveAnimatePresence>
    );
  }
);

BossVictory.displayName = 'BossVictory';

export default BossVictory;
