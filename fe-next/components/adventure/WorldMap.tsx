'use client';

import React, { useRef, useEffect, useMemo, useCallback, memo, useState, CSSProperties } from 'react';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { useTransform, useMotionValue } from 'framer-motion';
import './WorldMap.css';
import { Star, Lock, Crown, Play } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import type { MasteryTier } from '@/types/adventure';
import { MasteryBadge } from './MasteryBadge';
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
import { getNextUnlockedLevel } from '@/lib/adventure/constants';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { WorldMapBackground } from './WorldMapBackground';
import { WorldOrbitingLetters, TrailPath } from './WorldMapDecorations';

interface WorldMapProps {
  totalStars: number;
  completions: Array<{ world: number; level: number; stars: number }>;
  onWorldSelect: (worldId: number) => void;
  masteryTiers?: Record<number, MasteryTier>;
  onContinue?: (worldId: number, levelId: number) => void;
  welcomeBanner?: React.ReactNode;
}

// Motion variants - extracted to constants to prevent re-creation on every render
const NOOP = () => {};
const WORLD_HOVER_VARIANT = { scale: 1.08, y: -4, rotate: 2 };
const WORLD_TAP_VARIANT = { scale: 0.95, rotate: -1 };

// Parallax options — ambient drift DISABLED to avoid a continuous 60fps RAF loop.
// Gyroscope + gesture provide enough parallax movement on interaction.
const WORLD_MAP_PARALLAX_OPTIONS = {
  intensity: 0.8,
  enableGyroscope: true,
  enableGesture: true,
  enableAmbient: false,
  ambientSpeed: 0,
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
  masteryTier,
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
  masteryTier?: MasteryTier;
}): React.JSX.Element {
  const { t } = useLanguage();
  const [showStarGate, setShowStarGate] = useState(false);
  const isFinalWorld = world.id === 10;
  const isComplete = completedLevels === LEVELS_PER_WORLD;
  const worldName = t(`adventure.worlds.${world.name}`) || world.name;
  const worldImage = WORLD_IMAGES[world.id];
  const glowColor = getWorldGlow(world.colorPrimary);

  const prefersReducedMotion = usePrefersReducedMotion();

  // Only render expensive animations (orbiting letters, pulsing ring) when near viewport
  const nodeRef = useRef<HTMLDivElement>(null);
  const [isNearViewport, setIsNearViewport] = useState(false);
  useEffect(() => {
    const el = nodeRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsNearViewport(entry.isIntersecting),
      { rootMargin: '200px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Progress ring SVG math
  const progressPct = totalWorldStars > 0 ? currentStars / totalWorldStars : 0;
  const ringR = 54;
  const ringC = 2 * Math.PI * ringR;
  const ringOffset = ringC - progressPct * ringC;

  // Memoize expensive inline styles to avoid object allocation churn on re-renders.
  // box-shadow is used instead of filter: drop-shadow() — box-shadow is compositor-friendly
  // while drop-shadow triggers a separate paint + compositing pipeline per element.
  const orbButtonStyle = useMemo<CSSProperties>(() => {
    if (!isUnlocked) return { filter: 'grayscale(1) brightness(0.5)' };
    // Neo-brutalist: hard solid offset shadow, NO blur glow.
    return {
      boxShadow: '5px 5px 0px rgba(10,10,18,0.9)',
    };
  }, [isUnlocked]);

  // Flat hard-edged colored halo behind the orb — graphic backing, NOT a blurred glow.
  const glowBgStyle = useMemo<CSSProperties>(() => ({
    background: glowColor,
    transform: 'scale(1.18)',
    zIndex: 0,
  }), [glowColor]);

  // box-shadow can't apply to SVG elements, so we use a subtle stroke-opacity
  // instead of drop-shadow() which triggers a heavyweight paint pipeline per element.
  const progressFillStyle = useMemo<CSSProperties>(() => ({
    opacity: 0.9,
  }), []);

  const numberBadgeStyle = useMemo<CSSProperties>(() => ({
    backgroundColor: isUnlocked ? glowColor : 'rgba(50,50,70,0.9)',
    color: isUnlocked ? '#000' : 'rgba(255,255,255,0.5)',
  }), [isUnlocked, glowColor]);

  const progressBarStyle = useMemo<CSSProperties>(() => ({
    width: `${(currentStars / totalWorldStars) * 100}%`,
    background: isUnlocked
      ? `linear-gradient(90deg, ${glowColor}, ${glowColor.replace(/[\d.]+\)$/, '0.6)')})`
      : 'rgba(255,255,255,0.1)',
    boxShadow: 'none',
  }), [isUnlocked, glowColor, currentStars, totalWorldStars]);

  const cardBottomGradientStyle = useMemo<CSSProperties>(() => ({
    background: `linear-gradient(to top, ${glowColor.replace(/[\d.]+\)$/, '0.06)')}, transparent)`,
  }), [glowColor]);

  const accentBarStyle = useMemo<CSSProperties>(() => ({
    background: isUnlocked ? `linear-gradient(90deg, ${glowColor}, transparent)` : 'rgba(255,255,255,0.05)',
  }), [isUnlocked, glowColor]);

  return (
    <div
      ref={nodeRef}
      className={cn(
        'relative w-full px-3 sm:px-6 lg:px-10',
        'flex items-center justify-center gap-3 sm:gap-4 lg:gap-6',
        isLeft ? 'flex-row' : 'flex-row-reverse',
        'world-node-entrance'
      )}
      style={{ '--entrance-delay': `${index * 0.08}s` } as React.CSSProperties}
    >
      {/* World orb with progress ring */}
      <div className="shrink-0">
        <div className="relative">
          {/* Only show orbiting letters on the NEXT world to play — not all 10.
              This cuts concurrent orbit CSS animations from ~20 to ~2. */}
          {isNearViewport && isNextWorld && (
            <WorldOrbitingLetters
              worldId={world.id}
              worldName={worldName}
              isUnlocked={isUnlocked}
              colorPrimary={world.colorPrimary}
            />
          )}

          <AdaptiveMotion.button
            onClick={isUnlocked ? onClick : () => setShowStarGate(true)}
            data-testid={`world-${world.id}`}
            aria-label={isUnlocked
              ? `${t('adventure.playWorld')} ${worldName} - ${currentStars}/${totalWorldStars} ${t('adventure.stars')}, ${completedLevels}/${LEVELS_PER_WORLD} ${t('adventure.levelsCompleted')}`
              : `${worldName} - ${t('adventure.locked')}, ${t('adventure.requires')} ${unlockRequirement} ${t('adventure.stars')}`
            }
            whileHover={isUnlocked ? WORLD_HOVER_VARIANT : undefined}
            whileTap={isUnlocked ? WORLD_TAP_VARIANT : undefined}
            className={cn(
              'relative shrink-0',
              'focus:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-lime rounded-full',
              isUnlocked ? 'cursor-pointer' : 'cursor-not-allowed'
            )}
            style={orbButtonStyle}
          >
            {/* Ambient glow behind the orb */}
            {isUnlocked && (
              <div
                className="absolute inset-0 rounded-full pointer-events-none"
                style={glowBgStyle}
              />
            )}

            {/* SVG progress ring wrapping the orb */}
            {isUnlocked && progressPct > 0 && (
              <svg
                className="absolute -inset-2 w-[calc(100%+16px)] h-[calc(100%+16px)] -rotate-90 pointer-events-none z-20"
                viewBox="0 0 120 120"
              >
                {/* Track */}
                <circle cx="60" cy="60" r={ringR} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3.5" />
                {/* Fill */}
                <circle
                  cx="60" cy="60" r={ringR}
                  fill="none"
                  stroke={glowColor}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeDasharray={ringC}
                  strokeDashoffset={ringOffset}
                  className="transition-all duration-700"
                  style={progressFillStyle}
                />
              </svg>
            )}

            <div className={cn(
              'relative z-10 w-[5.5rem] h-[5.5rem] sm:w-[6.5rem] sm:h-[6.5rem] md:w-30 md:h-30 lg:w-34 lg:h-34',
              'rounded-full overflow-hidden',
              'border-4 border-neo-black',
              isUnlocked && isComplete && 'ring-[3px] ring-neo-lime/70',
              isUnlocked && !isComplete && 'ring-[3px] ring-neo-white/20'
            )}>
              <Image
                src={worldImage}
                alt={worldName}
                fill
                sizes="(min-width: 1024px) 136px, (min-width: 640px) 104px, 88px"
                loading="lazy"
                className={cn(
                  'object-cover scale-110',
                  !isUnlocked && 'opacity-40'
                )}
              />
              {/* Inner vignette for depth */}
              {isUnlocked && (
                <div className="absolute inset-0 rounded-full" style={{ boxShadow: 'inset 0 0 20px rgba(0,0,0,0.4)' }} />
              )}
              {!isUnlocked && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-neo-black/50">
                  <Lock className="w-8 h-8 sm:w-10 sm:h-10 text-neo-white" />
                  {showStarGate && (() => {
                    const starsNeeded = Math.max(0, unlockRequirement - playerTotalStars);
                    return starsNeeded > 0 ? (
                      <span className="text-[9px] font-bold text-neo-yellow mt-1 text-center px-1 leading-tight">
                        {t('adventure.starsNeeded', { count: starsNeeded })}
                      </span>
                    ) : null;
                  })()}
                </div>
              )}
              {fogState === 'heavy' && (
                <div className="absolute inset-0 rounded-full bg-neo-navy/70 opacity-30 blur-xs pointer-events-none" />
              )}
              {fogState === 'shimmer' && (
                <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none world-fog-shimmer" />
              )}
            </div>

            {/* World number badge — overlaid at bottom-center of orb */}
            <div
              className="absolute -bottom-2 left-1/2 -translate-x-1/2 z-20 px-2.5 py-0.5 rounded-neo border-3 border-neo-black shadow-hard-sm font-neo-display font-black text-sm"
              style={numberBadgeStyle}
            >
              {world.id}
            </div>

            {isFinalWorld && isUnlocked && (
              <AdaptiveMotion.div
                className="absolute -top-5 left-1/2 -translate-x-1/2 z-20"
                animate={prefersReducedMotion ? {} : { y: [0, -4, 0] }}
                transition={prefersReducedMotion ? { duration: 0 } : { duration: 2, repeat: Infinity }}
              >
                <Crown className="w-9 h-9 sm:w-10 sm:h-10 text-neo-yellow fill-neo-yellow drop-shadow-[0_0_10px_rgba(255,225,53,0.8)]" />
              </AdaptiveMotion.div>
            )}

            {isComplete && (
              <div className="absolute -top-1 -inset-e-1 w-7 h-7 sm:w-8 sm:h-8 bg-neo-lime rounded-full border-3 border-neo-black flex items-center justify-center shadow-hard z-20">
                <span className="text-neo-black font-black text-sm">✓</span>
              </div>
            )}

            {isNextWorld && !isComplete && (
              <div className="absolute -top-2 -inset-s-2 z-20 px-2 py-0.5 bg-neo-lime text-neo-black text-[10px] font-black uppercase rounded-neo border-2 border-neo-black shadow-hard-sm animate-pulse motion-reduce:animate-none">
                {t('adventure.next')}
              </div>
            )}

            {/* Static subtle ring for incomplete unlocked worlds — replaced infinite
                Framer Motion scale+opacity animation that ran per-world. CSS pulse
                on only the next world is much cheaper than JS-driven animations on all. */}
            {isUnlocked && !isComplete && (
              <div
                className={cn(
                  'absolute -inset-1 rounded-full border-3 pointer-events-none',
                  isNextWorld && !prefersReducedMotion && 'animate-pulse motion-reduce:animate-none'
                )}
                style={{ borderColor: glowColor, opacity: isNextWorld ? 0.6 : 0.25 }}
              />
            )}
          </AdaptiveMotion.button>
        </div>
      </div>

      {/* World Info Card — CSS entrance instead of framer-motion spring */}
      <div
        className={cn(
          'shrink min-w-0 relative',
          'w-[180px] sm:w-[210px] lg:w-[240px]',
          !isUnlocked && 'opacity-50',
          'world-card-entrance'
        )}
        style={{
          '--card-delay': `${index * 0.08 + 0.12}s`,
          '--card-x': isLeft ? '-20px' : '20px',
        } as React.CSSProperties}
      >
        {/* Card background with world-colored top accent bar */}
        <div className={cn(
          'relative overflow-hidden rounded-neo-lg border-3 border-neo-black shadow-hard',
          'bg-neo-navy-light',
        )}>
          {/* Colored accent bar at top */}
          <div
            className="h-1.5"
            style={accentBarStyle}
          />

          <div className="p-3 sm:p-3.5">
            {/* World name */}
            <h3
              className={cn(
                'font-neo-display font-black text-sm sm:text-base uppercase tracking-tight leading-tight',
                'line-clamp-2',
                isUnlocked ? 'text-neo-white' : 'text-neo-white'
              )}
              title={worldName}
            >
              {worldName}
            </h3>

            {/* Star progress bar */}
            <div className="mt-2.5">
              <div dir="ltr" className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1">
                  <Star className={cn(
                    'w-3.5 h-3.5 shrink-0',
                    currentStars > 0 ? 'text-neo-yellow fill-neo-yellow' : 'text-neo-white fill-neo-white/10'
                  )} />
                  <span className={cn(
                    'text-xs font-mono font-bold tabular-nums',
                    isUnlocked ? 'text-neo-yellow' : 'text-neo-white'
                  )}>
                    {currentStars}/{totalWorldStars}
                  </span>
                </div>
                <span className={cn('text-[10px] font-mono tabular-nums', isUnlocked ? 'text-neo-white' : 'text-neo-white')}>
                  {completedLevels}/{LEVELS_PER_WORLD} {t('adventure.lvl')}
                </span>
              </div>
              <div className="h-2 rounded-full bg-neo-black/50 overflow-hidden border border-neo-black/30">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={progressBarStyle}
                />
              </div>
            </div>

            {masteryTier != null && masteryTier > 0 && (
              <div className="mt-2">
                <MasteryBadge tier={masteryTier} />
              </div>
            )}
          </div>

          {/* Locked state — star requirement */}
          {!isUnlocked && (() => {
            const starsNeeded = Math.max(0, unlockRequirement - playerTotalStars);
            return (
              <div className="px-3 pb-3 space-y-1">
                <div className="flex items-center gap-1.5 text-[11px] text-neo-white font-mono">
                  <Lock className="w-3 h-3 shrink-0" />
                  <span>{unlockRequirement}</span>
                  <Star className="w-3 h-3 shrink-0 text-neo-yellow/40" />
                  <span>{t('adventure.stars')}</span>
                </div>
                {starsNeeded > 0 && starsNeeded <= unlockRequirement && (
                  <p className="text-[10px] font-bold text-neo-cyan/60">
                    {t('adventure.starsToUnlock', { count: starsNeeded })}
                  </p>
                )}
              </div>
            );
          })()}

          {/* Subtle world-colored gradient at bottom for depth */}
          {isUnlocked && (
            <div
              className="absolute bottom-0 left-0 right-0 h-12 pointer-events-none"
              style={cardBottomGradientStyle}
            />
          )}
        </div>
      </div>
    </div>
  );
});

/**
 * WorldMap - Trail-based adventure map with word game elements
 * Features: dynamic SVG trails, floating clouds & letters, scrollable world navigation
 */
const WorldMap = memo(function WorldMap({
  totalStars,
  completions,
  onWorldSelect,
  masteryTiers,
  onContinue,
  welcomeBanner,
}: WorldMapProps): React.JSX.Element {
  const { t, dir } = useLanguage();
  const isRtl = dir === 'rtl';
  const containerRef = useRef<HTMLDivElement>(null);
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

  // Scroll to bottom on mount (shows World 1 first).
  // Scroll the container directly — Element.scrollIntoView() bubbles to every
  // scrollable ancestor incl. the document, dragging the whole page to the footer.
  useEffect(() => {
    const timer = setTimeout(() => {
      const c = containerRef.current;
      if (c) c.scrollTo({ top: c.scrollHeight, behavior: 'smooth' });
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

  // Next level for the continue button
  const nextLevel = useMemo(() => {
    if (!nextWorldId) return null;
    return getNextUnlockedLevel(nextWorldId, completions);
  }, [nextWorldId, completions]);

  const nextWorldConfig = nextLevel ? WORLD_CONFIGS.find(w => w.id === nextLevel.world) : null;

  const handleContinue = useCallback(() => {
    if (nextLevel && onContinue) {
      onContinue(nextLevel.world, nextLevel.level);
    } else if (nextLevel) {
      onWorldSelect(nextLevel.world);
    }
  }, [nextLevel, onContinue, onWorldSelect]);

  return (
    <div
      ref={containerRef}
      data-testid="world-map"
      className="relative h-full overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-neo-white/20 scrollbar-track-transparent"
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      <WorldMapBackground
        parallaxX={parallaxX}
        parallaxY={parallaxY}
        starsY={starsY}
        cloudsY={cloudsY}
      />

      {/* World trail */}
      <div className="relative z-10 pt-16 pb-8 sm:pt-20 sm:pb-12 lg:max-w-4xl lg:mx-auto">
        {worldsData.map((data, index) => {
          const isLeft = isRtl ? index % 2 !== 0 : index % 2 === 0;

          return (
            <React.Fragment key={data.world.id}>
              <div className="world-node-container">
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
                masteryTier={masteryTiers?.[data.world.id]}
                fogState={
                  data.isUnlocked
                    ? 'none'
                    : data.world.id === furthestUnlockedId + 1
                      ? 'shimmer'
                      : 'heavy'
                }
              />
              </div>

              {index < worldsData.length - 1 && (
                <TrailPath
                  isUnlocked={worldsData[index + 1].isUnlocked}
                  fromLeft={isLeft}
                />
              )}
            </React.Fragment>
          );
        })}

        {welcomeBanner && (
          <div className="px-4 pb-4">
            {welcomeBanner}
          </div>
        )}
        <div className="h-32" />
      </div>

      {/* Floating Continue Button */}
      {nextLevel && nextWorldConfig && (
        <div className="sticky bottom-4 left-1/2 -translate-x-1/2 z-30 w-[90%] max-w-xs mx-auto">
          <AdaptiveMotion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, type: 'spring', stiffness: 200, damping: 20 }}
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleContinue}
            className={cn(
              'w-full py-3 px-5',
              'flex items-center justify-between',
              'bg-neo-lime text-neo-black',
              'font-black text-base uppercase tracking-tight',
              'border-3 border-neo-black rounded-neo shadow-hard-lg',
            )}
          >
            <div className="flex flex-col items-start">
              <span>{t('adventure.hub.continue')}</span>
              <span className="text-[11px] font-bold opacity-70 normal-case">
                {t(`adventure.worlds.${nextWorldConfig.name}`)} — {t('adventure.level')} {nextLevel.level}
              </span>
            </div>
            <Play className="w-5 h-5 fill-neo-black" />
          </AdaptiveMotion.button>
        </div>
      )}
    </div>
  );
});

export default WorldMap;
