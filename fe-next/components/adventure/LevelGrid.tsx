'use client';

import React, { memo, useMemo, useCallback, useEffect, useRef } from 'react';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import Image from 'next/image';
import { Sparkles, Star } from 'lucide-react';
import { useParallax } from '@/hooks/useParallax';
import {
  LEVELS_PER_WORLD,
  MAX_STARS_PER_LEVEL,
  isLevelUnlocked,
  getWorldColors,
  getWorldGlow,
  type WorldConfig,
} from '@/lib/adventure';
import {
  WORLD_IMAGES,
  containerVariants,
  cardVariants,
} from './levelGridConfig';
import LevelGridHeader from './LevelGridHeader';
import RPGLevelCard from './RPGLevelCard';
import MilestoneDivider from './MilestoneDivider';
import './LevelGrid.css';

interface LevelGridProps {
  world: WorldConfig;
  completions: Array<{ world: number; level: number; stars: number }>;
  totalStars: number;
  onLevelSelect: (worldId: number, levelId: number) => void;
}

// Milestone dividers appear after these level numbers
const MILESTONE_AFTER = [3, 6];

// Seeded random for stable particle positions
function seededRandom(seed: number) {
  const x = Math.sin(seed * 9999) * 10000;
  return x - Math.floor(x);
}

// Background particle count (Lucide icons instead of emojis)
const PARTICLE_COUNT = 9;

// Extracted to module-level constant to prevent useParallax re-subscribing RAF/listeners every render
const LEVEL_GRID_PARALLAX_OPTIONS = {
  intensity: 1.0,
  enableGyroscope: true,
  enableGesture: true,
  enableAmbient: true,
  ambientSpeed: 0.6,
} as const;

/**
 * LevelGrid — RPG-style level select with immersive world background
 * Features: Shield header, decluttered RPG cards, boss card, milestone dividers,
 * god-rays, Lucide icon particles, bottom mist
 */
const LevelGrid = memo(function LevelGrid({
  world,
  completions,
  onLevelSelect,
}: LevelGridProps): React.JSX.Element {
  // Interactive parallax from gyroscope/mouse/touch
  useParallax(LEVEL_GRID_PARALLAX_OPTIONS);

  // Compute level data
  const levels = useMemo(() => {
    const result = Array.from({ length: LEVELS_PER_WORLD }, (_, i) => {
      const levelNum = i + 1;
      const completion = completions.find(
        (c) => c.world === world.id && c.level === levelNum
      );
      const isUnlocked = isLevelUnlocked(world.id, levelNum, completions);
      const stars = completion?.stars || 0;
      const isPerfect = stars === MAX_STARS_PER_LEVEL;
      const isBoss = levelNum === LEVELS_PER_WORLD;

      return { levelNum, isUnlocked, stars, isPerfect, isBoss };
    });

    // Find first unlocked level with 0 stars = current level
    const currentNum = result.find((l) => l.isUnlocked && l.stars === 0)?.levelNum ?? -1;

    return result.map((l) => ({
      ...l,
      isCurrent: l.levelNum === currentNum,
    }));
  }, [world.id, completions]);

  // Aggregate stats — reuse levels array instead of re-filtering completions
  const { worldStars, maxWorldStars, completedLevels, worldColors, glowColor } = useMemo(() => ({
    worldStars: levels.reduce((sum, l) => sum + l.stars, 0),
    maxWorldStars: LEVELS_PER_WORLD * MAX_STARS_PER_LEVEL,
    completedLevels: levels.filter((l) => l.stars > 0).length,
    worldColors: getWorldColors(world.colorPrimary),
    glowColor: getWorldGlow(world.colorPrimary),
  }), [levels, world.colorPrimary]);

  const worldImage = WORLD_IMAGES[world.id];

  // Auto-scroll to current level on mount
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const currentLevelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = currentLevelRef.current;
    if (!el) return;

    // Wait for parent slide-in (300ms) + stagger animations to settle
    const timer = setTimeout(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 600);

    return () => clearTimeout(timer);
  }, [world.id]);

  // Stable click handler
  const handleLevelClick = useCallback(
    (levelNum: number) => onLevelSelect(world.id, levelNum),
    [world.id, onLevelSelect]
  );

  // Generate particle positions (stable across renders)
  const particles = useMemo(() =>
    Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      id: i,
      icon: i % 2 === 0 ? 'sparkles' : 'star',
      left: seededRandom(i * 2.3) * 90 + 5,
      top: seededRandom(i * 3.1) * 80 + 10,
      size: 8 + seededRandom(i * 4.7) * 8,
      duration: 5 + seededRandom(i * 5.3) * 3,
      delay: seededRandom(i * 6.1) * 3,
      opacity: 0.12 + seededRandom(i * 7.2) * 0.18,
    })),
  []);

  // Build grid items with milestone dividers inserted
  const gridItems: React.ReactNode[] = [];
  let chapterIndex = 0;

  for (const level of levels) {
    gridItems.push(
      <AdaptiveMotion.div key={level.levelNum} variants={cardVariants} ref={level.isCurrent ? currentLevelRef : undefined}>
        <RPGLevelCard
          levelNum={level.levelNum}
          stars={level.stars}
          maxStars={MAX_STARS_PER_LEVEL}
          isUnlocked={level.isUnlocked}
          isPerfect={level.isPerfect}
          isCurrent={level.isCurrent}
          isBoss={level.isBoss}
          worldAccentColor={glowColor}
          glowColor={glowColor}
          onClick={() => handleLevelClick(level.levelNum)}
        />
      </AdaptiveMotion.div>
    );

    if (MILESTONE_AFTER.includes(level.levelNum)) {
      chapterIndex++;
      gridItems.push(
        <MilestoneDivider key={`milestone-${chapterIndex}`} chapter={chapterIndex} />
      );
    }
  }

  return (
    <div data-testid="level-grid" className="relative h-full">
      {/* Background layers — absolute sibling, NOT fixed inside scroll container */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {/* Dark base */}
        <div
          className="absolute inset-0 level-grid-parallax-css"
          style={{ '--parallax-depth': '0.05', backgroundColor: 'rgb(12, 12, 35)' } as React.CSSProperties}
        />

        {/* World image — higher opacity for immersion */}
        <div
          className="absolute inset-0 level-grid-parallax-layer level-grid-parallax-css-scaled"
          style={{ '--parallax-depth': '0.12', '--parallax-scale': '1.15' } as React.CSSProperties}
        >
          <Image src={worldImage} alt="" role="presentation" fill sizes="100vw" className="object-cover opacity-[0.45]" priority />
          <div className="absolute inset-0" style={{ backgroundColor: 'rgba(10, 10, 30, 0.4)' }} />
        </div>

        {/* God-rays */}
        <div className="absolute top-0 right-0 w-full h-full pointer-events-none level-grid-god-rays">
          <div
            className="absolute"
            style={{
              top: '-50px', right: '-30px', width: '300px', height: '600px',
              background: `linear-gradient(210deg, ${glowColor}18 0%, transparent 60%)`,
              transform: 'rotate(-5deg)',
            }}
          />
          <div
            className="absolute"
            style={{
              top: '-20px', right: '60px', width: '150px', height: '450px',
              background: `linear-gradient(220deg, ${glowColor}0F 0%, transparent 50%)`,
              transform: 'rotate(-15deg)',
            }}
          />
        </div>

        {/* Accent highlight */}
        <div
          className="absolute inset-0 level-grid-parallax-css"
          style={{ '--parallax-depth': '0.2' } as React.CSSProperties}
        >
          <div
            className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[min(90%,300px)] h-[min(60%,200px)] rounded-full"
            style={{ backgroundColor: glowColor, opacity: 0.15 }}
          />
        </div>

        {/* Lucide icon particles */}
        <div className="absolute inset-0">
          {particles.map((p) => (
            <div
              key={p.id}
              className="absolute pointer-events-none level-grid-particle"
              style={{
                left: `${p.left}%`,
                top: `${p.top}%`,
                opacity: p.opacity,
                '--particle-duration': `${p.duration}s`,
                '--particle-delay': `${p.delay}s`,
              } as React.CSSProperties}
            >
              {p.icon === 'sparkles' ? (
                <Sparkles style={{ width: p.size, height: p.size, color: glowColor }} />
              ) : (
                <Star style={{ width: p.size, height: p.size, color: 'rgba(255,225,53,0.5)' }} />
              )}
            </div>
          ))}
        </div>

        {/* Bottom mist */}
        <div
          className="absolute bottom-0 left-0 w-full h-32 pointer-events-none"
          style={{ background: `linear-gradient(180deg, transparent 0%, ${glowColor}08 60%, ${glowColor}15 100%)` }}
        />

        {/* Vignette */}
        <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: 'inset 0 0 100px rgba(0,0,0,0.5)' }} />
      </div>

      {/* Scrollable content layer */}
      <div ref={scrollContainerRef} className="relative h-full overflow-y-auto scrollbar-thin scrollbar-thumb-neo-white/20 scrollbar-track-transparent z-10" style={{ WebkitOverflowScrolling: 'touch' }}>
      <div className="relative pt-6 sm:pt-8 pb-8 px-4 sm:px-6 max-w-3xl mx-auto">
        <LevelGridHeader
          world={world}
          worldStars={worldStars}
          maxWorldStars={maxWorldStars}
          completedLevels={completedLevels}
          totalLevels={LEVELS_PER_WORLD}
          glowColor={glowColor}
          worldColors={worldColors}
        />

        {/* Level Grid — RPG cards with milestone dividers */}
        <AdaptiveMotion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-5 mt-6"
        >
          {gridItems}
        </AdaptiveMotion.div>
      </div>
      </div>
    </div>
  );
});

LevelGrid.displayName = 'LevelGrid';
export default LevelGrid;
