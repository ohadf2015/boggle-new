'use client';

import React, { useRef, useEffect, useMemo, useCallback, memo } from 'react';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { useTransform, useMotionValue } from 'framer-motion';
import './WorldMap.css';
import { Star, Lock, Crown } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useParallax } from '@/hooks/useParallax';
import {
  LEVELS_PER_WORLD,
  MAX_STARS_PER_LEVEL,
  getWorldUnlockRequirement,
  isWorldUnlocked,
  WORLD_CONFIGS,
  getWorldGlow,
  type WorldConfig,
} from '@/lib/adventure';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { WorldMapBackground } from './WorldMapBackground';
import { WorldOrbitingLetters, TrailPath } from './WorldMapDecorations';

interface WorldMapProps {
  totalStars: number;
  completions: Array<{ world: number; level: number; stars: number }>;
  onWorldSelect: (worldId: number) => void;
  masteryTiers?: Record<number, number>;
}

// Motion variants - extracted to constants to prevent re-creation on every render
const NOOP = () => {};
const WORLD_HOVER_VARIANT = { scale: 1.08, y: -4, rotate: 2 };
const WORLD_TAP_VARIANT = { scale: 0.95, rotate: -1 };

// Extracted to module-level constant to prevent useParallax re-subscribing RAF/listeners every render
const WORLD_MAP_PARALLAX_OPTIONS = {
  intensity: 0.8,
  enableGyroscope: true,
  enableGesture: true,
  enableAmbient: true,
  ambientSpeed: 0.5,
} as const;

// World images mapping (WebP for 91% smaller file sizes)
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

// World node on the trail
const WorldNode = memo(function WorldNode({
  world,
  isUnlocked,
  unlockRequirement,
  currentStars,
  completedLevels,
  totalWorldStars,
  onClick,
  index,
  isLeft,
  isNextWorld,
  fogState = 'none',
  playerTotalStars = 0,
}: {
  world: WorldConfig;
  isUnlocked: boolean;
  unlockRequirement: number;
  currentStars: number;
  completedLevels: number;
  totalWorldStars: number;
  onClick: () => void;
  index: number;
  isLeft: boolean;
  isNextWorld?: boolean;
  fogState?: 'none' | 'shimmer' | 'heavy';
  playerTotalStars?: number;
}): React.JSX.Element {
  const { t } = useLanguage();
  const isFinalWorld = world.id === 10;
  const isComplete = completedLevels === LEVELS_PER_WORLD;
  const worldName = t(`adventure.worlds.${world.name}`) || world.name;
  const worldImage = WORLD_IMAGES[world.id];
  const glowColor = getWorldGlow(world.colorPrimary);

  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <AdaptiveMotion.div
      className={cn(
        'relative w-full px-4 sm:px-8 lg:px-12',
        'flex items-center gap-3 sm:gap-6 lg:gap-8',
        isLeft ? 'justify-start lg:justify-center' : 'justify-end lg:justify-center',
        isLeft ? 'flex-row' : 'flex-row-reverse'
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, type: 'spring', stiffness: 100, damping: 15 }}
    >
      {/* World node container */}
      <div className="flex-shrink-0 min-w-[6rem] sm:min-w-[7rem]">
        <div className="relative">
          <WorldOrbitingLetters
            worldId={world.id}
            worldName={worldName}
            isUnlocked={isUnlocked}
            colorPrimary={world.colorPrimary}
          />

          <AdaptiveMotion.button
            onClick={onClick}
            disabled={!isUnlocked}
            data-testid={`world-${world.id}`}
            aria-label={isUnlocked
              ? `${t('adventure.playWorld')} ${worldName} - ${currentStars}/${totalWorldStars} ${t('adventure.stars')}, ${completedLevels}/${LEVELS_PER_WORLD} ${t('adventure.levelsCompleted')}`
              : `${worldName} - ${t('adventure.locked')}, ${t('adventure.requires')} ${unlockRequirement} ${t('adventure.stars')}`
            }
            whileHover={isUnlocked ? WORLD_HOVER_VARIANT : undefined}
            whileTap={isUnlocked ? WORLD_TAP_VARIANT : undefined}
            className={cn(
              'relative flex-shrink-0',
              'focus:outline-none focus-visible:ring-4 focus-visible:ring-neo-lime rounded-full',
              isUnlocked ? 'cursor-pointer' : 'cursor-not-allowed'
            )}
            style={{
              filter: isUnlocked
                ? `drop-shadow(0 0 16px ${glowColor}) drop-shadow(0 0 32px ${glowColor})`
                : 'grayscale(1) brightness(0.5)',
            }}
          >
            {isUnlocked && (
              <div
                className="absolute inset-0 rounded-full pointer-events-none"
                style={{
                  background: `radial-gradient(circle, ${glowColor} 0%, ${glowColor.replace(/[\d.]+\)$/, '0.25)')} 45%, transparent 72%)`,
                  transform: 'scale(1.5)',
                  filter: 'blur(14px)',
                  zIndex: 0,
                }}
              />
            )}

            <div className={cn(
              'relative z-10 w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 lg:w-36 lg:h-36',
              'rounded-full overflow-hidden',
              'border-[5px] border-neo-black',
              isUnlocked && 'ring-[3px] ring-neo-yellow/60'
            )}>
            <Image
              src={worldImage}
              alt={worldName}
              fill
              className={cn(
                'object-cover scale-110',
                !isUnlocked && 'opacity-40'
              )}
            />
            {!isUnlocked && (
              <div className="absolute inset-0 flex items-center justify-center bg-neo-black/50">
                <Lock className="w-10 h-10 sm:w-12 sm:h-12 text-neo-white/70" />
              </div>
            )}
            {fogState === 'heavy' && (
              <div className="absolute inset-0 rounded-full bg-neo-navy/70 opacity-30 blur-sm pointer-events-none" />
            )}
            {fogState === 'shimmer' && (
              <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none world-fog-shimmer" />
            )}
          </div>

          {isFinalWorld && isUnlocked && (
            <AdaptiveMotion.div
              className="absolute -top-5 left-1/2 -translate-x-1/2"
              animate={prefersReducedMotion ? {} : { y: [0, -4, 0] }}
              transition={prefersReducedMotion ? { duration: 0 } : { duration: 2, repeat: Infinity }}
            >
              <Crown className="w-9 h-9 sm:w-10 sm:h-10 text-neo-yellow fill-neo-yellow drop-shadow-[0_0_10px_rgba(255,225,53,0.8)]" />
            </AdaptiveMotion.div>
          )}

          {isComplete && (
            <div className="absolute -bottom-1 -end-1 w-8 h-8 sm:w-10 sm:h-10 bg-neo-lime rounded-full border-3 border-neo-black flex items-center justify-center shadow-hard z-10">
              <span className="text-neo-black font-black text-base sm:text-lg">✓</span>
            </div>
          )}

          {isNextWorld && !isComplete && (
            <div className="absolute -top-2 -start-2 z-10 px-2 py-0.5 bg-neo-lime text-neo-black text-[10px] font-black uppercase rounded-neo border-2 border-neo-black shadow-hard-sm">
              {t('adventure.next')}
            </div>
          )}

          {isUnlocked && !isComplete && !prefersReducedMotion && (
            <AdaptiveMotion.div
              className="absolute -inset-1 rounded-full border-[3px] border-neo-yellow"
              animate={{ scale: [1, 1.18, 1], opacity: [0.7, 0, 0.7] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          )}
          {isUnlocked && !isComplete && prefersReducedMotion && (
            <div className="absolute -inset-1 rounded-full border-[3px] border-neo-yellow/50" />
          )}
        </AdaptiveMotion.button>
        </div>
      </div>

      {/* World Info Card */}
      <AdaptiveMotion.div
        className={cn(
          'flex-shrink min-w-0',
          'w-[140px] sm:w-[200px] lg:w-[220px]',
          'bg-neo-navy-light border-4 border-neo-black rounded-neo',
          'p-3 sm:p-4 shadow-hard overflow-hidden',
          !isUnlocked && 'opacity-60'
        )}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: index * 0.08 + 0.1 }}
      >
        <h3
          className={cn(
            'font-black text-xs sm:text-sm md:text-base uppercase tracking-tight leading-tight',
            'line-clamp-2',
            isUnlocked ? 'text-neo-white' : 'text-neo-white/50'
          )}
          title={worldName}
        >
          {worldName}
        </h3>

        <div dir="ltr" className="flex items-center gap-1.5 sm:gap-2 mt-2 whitespace-nowrap">
          <Star className={cn(
            'w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0',
            currentStars > 0 ? 'text-neo-yellow fill-neo-yellow' : 'text-neo-white/50 fill-neo-white/10'
          )} />
          <span className={cn(
            'text-xs sm:text-sm font-bold',
            isUnlocked ? 'text-neo-yellow' : 'text-neo-white/40'
          )}>
            {currentStars}/{totalWorldStars}
          </span>
          <span className={cn(
            'text-xs sm:text-sm',
            isUnlocked ? 'text-neo-white/60' : 'text-neo-white/30'
          )}>
            · {completedLevels}/{LEVELS_PER_WORLD}
          </span>
        </div>

        {!isUnlocked && (() => {
          const starsNeeded = Math.max(0, unlockRequirement - playerTotalStars);
          return (
            <div className="mt-2.5 space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-neo-white/50 whitespace-nowrap">
                <Lock className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{unlockRequirement}</span>
                <Star className="w-3.5 h-3.5 flex-shrink-0 text-neo-yellow/50" />
              </div>
              {starsNeeded > 0 && starsNeeded <= unlockRequirement && (
                <p className="text-[10px] font-bold text-neo-cyan/70">
                  {t('adventure.starsToUnlock', { count: starsNeeded })}
                </p>
              )}
            </div>
          );
        })()}
      </AdaptiveMotion.div>
    </AdaptiveMotion.div>
  );
});

/**
 * WorldMap - Trail-based adventure map with word game elements
 * Features: dynamic SVG trails, floating clouds & letters, scrollable world navigation
 */
export default function WorldMap({
  totalStars,
  completions,
  onWorldSelect,
}: WorldMapProps): React.JSX.Element {
  const { t } = useLanguage();
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollProgress = useMotionValue(0);

  // RAF-throttled scroll handler for parallax effect
  const rafIdRef = useRef<number | null>(null);
  const handleScroll = useCallback(() => {
    if (rafIdRef.current !== null) return;

    rafIdRef.current = requestAnimationFrame(() => {
      if (containerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
        const maxScroll = scrollHeight - clientHeight;
        const progress = maxScroll > 0 ? scrollTop / maxScroll : 0;
        scrollProgress.set(progress);
      }
      rafIdRef.current = null;
    });
  }, [scrollProgress]);

  // Scroll to bottom on mount (shows World 1 first)
  useEffect(() => {
    const timer = setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Add scroll listener with passive option
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [handleScroll]);

  const starsY = useTransform(scrollProgress, [0, 1], [0, -100]);
  const cloudsY = useTransform(scrollProgress, [0, 1], [0, -150]);

  const { x: parallaxX, y: parallaxY } = useParallax(WORLD_MAP_PARALLAX_OPTIONS);

  // Prepare worlds data (World 10 at top, World 1 at bottom)
  const worldsData = useMemo(() => {
    return [...WORLD_CONFIGS].reverse().map((world) => {
      const unlocked = isWorldUnlocked(world.id, totalStars);
      const unlockRequirement = getWorldUnlockRequirement(world.id);
      const worldCompletions = completions.filter((c) => c.world === world.id);
      const worldStars = worldCompletions.reduce((sum, c) => sum + c.stars, 0);
      const worldTotalStars = LEVELS_PER_WORLD * MAX_STARS_PER_LEVEL;

      return {
        world,
        isUnlocked: unlocked,
        unlockRequirement,
        currentStars: worldStars,
        completedLevels: worldCompletions.length,
        totalWorldStars: worldTotalStars,
      };
    });
  }, [totalStars, completions]);

  // Stable per-world click handlers to preserve WorldNode memo
  const worldClickHandlers = useMemo(() => {
    const handlers: Record<number, () => void> = {};
    for (const config of WORLD_CONFIGS) {
      const id = config.id;
      handlers[id] = () => onWorldSelect(id);
    }
    return handlers;
  }, [onWorldSelect]);

  // Furthest unlocked world ID for fog-of-war calculation
  const furthestUnlockedId = useMemo(() => {
    let max = 0;
    for (const d of worldsData) {
      if (d.isUnlocked && d.world.id > max) max = d.world.id;
    }
    return max;
  }, [worldsData]);

  // Derive next world to play: first unlocked but not fully completed
  const nextWorldId = useMemo(() => {
    for (let i = worldsData.length - 1; i >= 0; i--) {
      const d = worldsData[i];
      if (d.isUnlocked && d.completedLevels < LEVELS_PER_WORLD) {
        return d.world.id;
      }
    }
    return null;
  }, [worldsData]);

  return (
    <div
      ref={containerRef}
      data-testid="world-map"
      className="relative h-full overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-neo-white/20 scrollbar-track-transparent"
    >
      <WorldMapBackground
        parallaxX={parallaxX}
        parallaxY={parallaxY}
        starsY={starsY}
        cloudsY={cloudsY}
      />

      {/* World trail */}
      <div className="relative z-10 py-8 sm:py-12 lg:max-w-4xl lg:mx-auto">
        {worldsData.map((data, index) => {
          const isLeft = index % 2 === 0;

          return (
            <React.Fragment key={data.world.id}>
              <WorldNode
                world={data.world}
                isUnlocked={data.isUnlocked}
                unlockRequirement={data.unlockRequirement}
                currentStars={data.currentStars}
                completedLevels={data.completedLevels}
                totalWorldStars={data.totalWorldStars}
                onClick={data.isUnlocked ? (worldClickHandlers[data.world.id] ?? NOOP) : NOOP}
                index={index}
                isLeft={isLeft}
                isNextWorld={data.world.id === nextWorldId}
                playerTotalStars={totalStars}
                fogState={
                  data.isUnlocked ? 'none'
                    : data.world.id === furthestUnlockedId + 1 ? 'shimmer'
                    : data.world.id > furthestUnlockedId + 1 ? 'heavy'
                    : 'none'
                }
              />

              {index < worldsData.length - 1 && (
                <TrailPath
                  isUnlocked={worldsData[index + 1].isUnlocked}
                  fromLeft={isLeft}
                />
              )}
            </React.Fragment>
          );
        })}

        {/* Endless Mode Tease — visible once player reaches World 5+ */}
        {furthestUnlockedId >= 5 && (
          <AdaptiveMotion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className={cn(
              'mx-auto max-w-[200px] p-4 rounded-neo border-3 border-dashed',
              'border-neo-purple/40 bg-neo-purple/10',
              'text-center',
              furthestUnlockedId >= 5 ? 'opacity-70' : 'opacity-30'
            )}
          >
            <div className="text-2xl mb-1">∞</div>
            <p className="text-neo-purple font-black text-sm uppercase tracking-wide">
              {t('adventure.endlessMode.teaser')}
            </p>
            <p className="text-neo-white/40 text-xs mt-1">
              {t('adventure.endlessMode.comingSoon')}
            </p>
          </AdaptiveMotion.div>
        )}

        <div ref={bottomRef} className="h-24" />
      </div>
    </div>
  );
}
