'use client';

import React, { useRef, useEffect, useLayoutEffect, useMemo, useCallback, useState, memo } from 'react';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { useTransform, useMotionValue } from 'framer-motion';
import './WorldMap.css';
import { canPlayLevel, nextRunWorld } from '@/lib/adventure/play/progress';
import { readRun } from './play/runStorage';
import { Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import type { MasteryTier } from '@/types/adventure';
import { useParallax } from '@/hooks/useParallax';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import {
  LEVELS_PER_WORLD,
  MAX_STARS_PER_LEVEL,
  getWorldUnlockRequirement,
  WORLD_CONFIGS,
} from '@/lib/adventure';
import { WorldMapBackground } from './WorldMapBackground';
import { TrailPath } from './WorldMapDecorations';
import { WorldNode } from './WorldMapNode';

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

// Parallax options — ambient drift DISABLED to avoid a continuous 60fps RAF loop.
// Gyroscope + gesture provide enough parallax movement on interaction.
const WORLD_MAP_PARALLAX_OPTIONS = {
  intensity: 0.8,
  enableGyroscope: true,
  enableGesture: true,
  enableAmbient: false,
  ambientSpeed: 0,
} as const;


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
  const prefersReducedMotion = usePrefersReducedMotion();
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

  // Track which world we've already focused on to prevent re-focus races
  const focusedWorldRef = useRef<number | null>(null);

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
      const unlocked = canPlayLevel(completions, world.id, 1);
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
  }, [completions]);

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

  // The world the next run opens in: the furthest one whose boss still stands.
  // It used to be the first world with a LevelSpec slot un-cleared, which a
  // branching run never fills — so beating world 1's boss kept "Continue" on world 1.
  const nextWorldId = useMemo(() => nextRunWorld(completions), [completions]);
  const nextWorldConfig = WORLD_CONFIGS.find(w => w.id === nextWorldId) ?? null;

  // Compute scroll position for a given world ID
  const scrollToWorld = useCallback((worldId: number, behavior: 'auto' | 'smooth') => {
    const c = containerRef.current;
    if (!c) return;

    const nextWorldNode = c.querySelector(`[data-world-id="${worldId}"]`);
    if (!nextWorldNode) return;

    const containerRect = c.getBoundingClientRect();
    const nodeRect = (nextWorldNode as HTMLElement).getBoundingClientRect();

    // Relative position within the scrollable container
    const nodeTopRelative = nodeRect.top - containerRect.top + c.scrollTop;
    const nodeHeight = nodeRect.height;

    // Center the node in the viewport
    const scrollTarget = nodeTopRelative - (c.clientHeight - nodeHeight) / 2;

    // Clamp to valid scroll range [0, scrollHeight - clientHeight]
    const maxScroll = Math.max(0, c.scrollHeight - c.clientHeight);
    const clampedTop = Math.max(0, Math.min(scrollTarget, maxScroll));

    c.scrollTo({ top: clampedTop, behavior });
  }, []);

  // Focus on the player's next world (first mount = auto/instant, updates = smooth if motion allowed).
  // Uses a ref guard to prevent StrictMode double-invoke from creating a race.
  useLayoutEffect(() => {
    // If we've already focused on this world, nothing to do
    if (focusedWorldRef.current === nextWorldId) return;

    // Determine scroll behavior: instant on first focus, smooth on updates (if motion allowed)
    const isFirstFocus = focusedWorldRef.current === null;
    const behavior = isFirstFocus || prefersReducedMotion ? 'auto' : 'smooth';

    focusedWorldRef.current = nextWorldId;
    scrollToWorld(nextWorldId, behavior);
  }, [nextWorldId, prefersReducedMotion, scrollToWorld]);

  // A run in progress there says which floor it stands on; otherwise it is a new run.
  // Read after mount (localStorage), and again whenever the hub re-renders with new progress.
  const [runFloorStep, setRunFloorStep] = useState<number | null>(null);
  useEffect(() => {
    const steps = readRun(nextWorldId)?.run.path.length ?? 0;
    setRunFloorStep(steps > 0 ? steps : null);
  }, [nextWorldId, completions]);

  const handleContinue = useCallback(() => {
    if (onContinue) onContinue(nextWorldId, 1);
    else onWorldSelect(nextWorldId);
  }, [nextWorldId, onContinue, onWorldSelect]);

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
              <div className="world-node-container" data-world-id={data.world.id}>
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
      {nextWorldConfig && (
        <div className="sticky bottom-4 z-30 w-[90%] max-w-xs mx-auto">
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
                {t(`adventure.worlds.${nextWorldConfig.name}`)} — {runFloorStep ? t('adventurePlay.map.depth', { step: runFloorStep }) : t('adventurePlay.map.newRun')}
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
