'use client';

import React, { useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import {
  Star,
  Lock,
  Clock,
  Target,
  Play,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useParallax } from '@/hooks/useParallax';
import { PremiumCard } from './ui/PremiumCard';
import {
  LEVELS_PER_WORLD,
  MAX_STARS_PER_LEVEL,
  isLevelUnlocked,
  getLevelConfig,
  getGridSize,
  getTimerDuration,
  getWorldColors,
  getWorldGlow,
  type WorldConfig,
} from '@/lib/adventure';
import {
  WORLD_IMAGES,
  WORLD_PARTICLES,
  TILE_ICONS,
  containerVariants,
  cardVariants,
} from './levelGridConfig';
import { FloatingParticle, DifficultyIndicator } from './LevelGridComponents';
import './LevelGrid.css';

interface LevelGridProps {
  world: WorldConfig;
  completions: Array<{ world: number; level: number; stars: number }>;
  totalStars: number;
  onLevelSelect: (worldId: number, levelId: number) => void;
}


/**
 * LevelGrid - Displays all levels for a selected world
 * Features: World-themed parallax background, floating particles, glass-morphism cards
 */
export default function LevelGrid({
  world,
  completions,
  onLevelSelect,
}: LevelGridProps): React.JSX.Element {
  const { t } = useLanguage();

  // Interactive parallax from gyroscope/mouse/touch
  // Sets --parallax-x / --parallax-y CSS custom properties on :root
  // We use CSS calc() with these properties instead of JS values to avoid re-renders
  useParallax({
    intensity: 1.0,
    enableGyroscope: true,
    enableGesture: true,
    enableAmbient: true,
    ambientSpeed: 0.6,
  });

  // Track previous star counts to detect newly earned stars (skip animation for old completions)
  const prevStarsRef = useRef<Record<number, number>>({});

  // Generate levels for this world (memoized to avoid recalculation on parallax re-renders)
  const levels = useMemo(() => {
    const result = Array.from({ length: LEVELS_PER_WORLD }, (_, i) => {
      const levelNum = i + 1;
      const config = getLevelConfig(world.id, levelNum);
      const completion = completions.find(
        (c) => c.world === world.id && c.level === levelNum
      );
      const isUnlocked = isLevelUnlocked(world.id, levelNum, completions);
      const stars = completion?.stars || 0;
      const isPerfect = stars === MAX_STARS_PER_LEVEL;
      const prevStars = prevStarsRef.current[levelNum] ?? stars;
      const newStarsFrom = prevStars;

      return {
        levelNum,
        config,
        completion,
        isUnlocked,
        stars,
        isPerfect,
        newStarsFrom,
      };
    });

    // Update ref after computing diff
    const nextPrev: Record<number, number> = {};
    for (const l of result) {
      nextPrev[l.levelNum] = l.stars;
    }
    prevStarsRef.current = nextPrev;

    return result;
  }, [world.id, completions]);

  // World name translation
  const worldName = t(`adventure.worlds.${world.name}`) || world.name;

  // Memoize aggregate stats — avoids recomputing on every parallax/scroll render
  const { worldStars, maxWorldStars, completedLevels, worldColors, glowColor } = useMemo(() => ({
    worldStars: completions
      .filter((c) => c.world === world.id)
      .reduce((sum, c) => sum + c.stars, 0),
    maxWorldStars: LEVELS_PER_WORLD * MAX_STARS_PER_LEVEL,
    completedLevels: completions.filter((c) => c.world === world.id).length,
    worldColors: getWorldColors(world.colorPrimary),
    glowColor: getWorldGlow(world.colorPrimary),
  }), [world.id, world.colorPrimary, completions]);

  const worldImage = WORLD_IMAGES[world.id];
  const particleConfig = WORLD_PARTICLES[world.id];


  // Generate floating particles with stable positions
  const particles = useMemo(() => {
    const seededRandom = (seed: number) => {
      const x = Math.sin(seed * 9999) * 10000;
      return x - Math.floor(x);
    };

    return Array.from({ length: particleConfig.count }, (_, i) => ({
      id: i,
      emoji: particleConfig.emoji[Math.floor(seededRandom(i * 1.7) * particleConfig.emoji.length)],
      left: seededRandom(i * 2.3) * 100,
      top: seededRandom(i * 3.1) * 100,
      size: particleConfig.sizeRange[0] + seededRandom(i * 4.7) * (particleConfig.sizeRange[1] - particleConfig.sizeRange[0]),
      duration: particleConfig.speedRange[0] + seededRandom(i * 5.3) * (particleConfig.speedRange[1] - particleConfig.speedRange[0]),
      delay: seededRandom(i * 6.1) * 5,
    }));
  }, [particleConfig]);

  return (
    <div data-testid="level-grid" className="relative h-full overflow-y-auto scrollbar-thin scrollbar-thumb-neo-white/20 scrollbar-track-transparent">
      {/* Simplified parallax container - cleaner, less distracting */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {/* Layer 1: Solid dark base with world accent */}
        <div
          className="absolute inset-0 level-grid-parallax-css"
          style={{
            '--parallax-depth': '0.05',
            backgroundColor: 'rgb(12, 12, 35)',
          } as React.CSSProperties}
        />

        {/* Layer 2: Main world image - the hero background */}
        <div
          className="absolute inset-0 level-grid-parallax-layer level-grid-parallax-css-scaled"
          style={{
            '--parallax-depth': '0.12',
            '--parallax-scale': '1.15',
          } as React.CSSProperties}
        >
          <Image
            src={worldImage}
            alt=""
            fill
            sizes="100vw"
            className="object-cover opacity-50"
            priority
          />
          {/* Overlay to darken image */}
          <div
            className="absolute inset-0"
            style={{
              backgroundColor: 'rgba(10, 10, 30, 0.5)',
            }}
          />
        </div>

        {/* Layer 3: Subtle accent highlight - solid color with opacity */}
        <div
          className="absolute inset-0 level-grid-parallax-css"
          style={{
            '--parallax-depth': '0.2',
          } as React.CSSProperties}
        >
          <div
            className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[300px] h-[200px] rounded-full"
            style={{
              backgroundColor: glowColor,
              opacity: 0.15,
            }}
          />
        </div>

        {/* Layer 4: Floating particles for life */}
        <div className="absolute inset-0">
          {particles.map((particle) => (
            <FloatingParticle
              key={particle.id}
              emoji={particle.emoji}
              left={particle.left}
              top={particle.top}
              size={particle.size}
              duration={particle.duration}
              delay={particle.delay}
            />
          ))}
        </div>

        {/* Layer 5: Subtle vignette for depth */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            boxShadow: 'inset 0 0 100px rgba(0,0,0,0.5)',
          }}
        />
      </div>

      {/* Main content layer - scrolls independently */}
      <div className="relative z-10 space-y-6 sm:space-y-8 pt-6 sm:pt-8 pb-8 px-4 sm:px-6 max-w-7xl mx-auto">
        {/* World Header - Glass-morphism with world accent */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring' as const, stiffness: 200, damping: 20 }}
          className={cn(
            'relative overflow-hidden',
            'p-5 sm:p-8 rounded-neo-lg',
            'bg-neo-black/90',
            'border-4 border-neo-black shadow-hard-lg'
          )}
          style={{
            boxShadow: `0 0 60px ${glowColor}50, 8px 8px 0px black`,
          }}
        >
          {/* Animated accent overlay - solid color sweep */}
          <div
            className="absolute inset-0 opacity-20 level-grid-gradient-sweep"
            style={{
              backgroundColor: glowColor,
            }}
          />

          {/* World icon preview — contained by parent overflow-hidden */}
          <div className="absolute -top-4 -right-4 rtl:-right-auto rtl:-left-4 w-32 h-32 sm:w-40 sm:h-40 opacity-40 rotate-12">
            <Image
              src={worldImage}
              alt=""
              fill
              sizes="160px"
              className="object-contain"
            />
          </div>

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div>
              <motion.h2
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="text-3xl sm:text-4xl font-black text-neo-white uppercase tracking-tight"
              >
                {t('adventure.worldLabel')} {world.id}
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 }}
                className={cn('text-xl sm:text-2xl font-bold mt-1 break-words', worldColors.text)}
              >
                {worldName}
              </motion.p>
              {world.mechanic && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-neo-white/60 mt-2 text-sm sm:text-base"
                >
                  {t(`adventure.mechanics.${world.mechanic}`) || world.mechanic}
                </motion.p>
              )}
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-3 sm:gap-4 flex-wrap"
            >
              {/* World Progress - Prominent star count */}
              <div
                className={cn(
                  'flex items-center gap-2 px-4 py-3 rounded-neo',
                  'bg-neo-black/50 border-3 border-neo-black shadow-hard-sm'
                )}
                style={{
                  borderColor: glowColor,
                  boxShadow: `0 0 20px ${glowColor}30, 4px 4px 0px black`,
                }}
              >
                <Star className={cn('w-6 h-6 fill-current', worldColors.text)} />
                <span className={cn('font-black text-xl', worldColors.text)}>
                  {worldStars}/{maxWorldStars}
                </span>
              </div>

              {/* Completion Progress */}
              <div className="flex items-center gap-2 px-4 py-3 bg-neo-black/50 border-3 border-neo-white/20 rounded-neo shadow-hard-sm">
                <CheckCircle2 className="w-5 h-5 text-neo-lime" />
                <span className="font-bold text-neo-white">
                  {completedLevels}/{LEVELS_PER_WORLD}
                </span>
              </div>

              {/* World Info Pills */}
              <div className="hidden sm:flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-2 bg-neo-black/40 border-2 border-neo-white/20 rounded-neo">
                  <Target className="w-4 h-4 text-neo-white/60" />
                  <span className="font-bold text-neo-white/70 text-sm">
                    {getGridSize(world.id)}×{getGridSize(world.id)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-2 bg-neo-black/40 border-2 border-neo-white/20 rounded-neo">
                  <Clock className="w-4 h-4 text-neo-white/60" />
                  <span className="font-bold text-neo-white/70 text-sm">
                    {getTimerDuration(world.id)}s
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Level Grid - Premium 3D cards */}
        {/* Desktop: max 5 columns for better card sizing, centered with auto margins */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-5 lg:gap-6 lg:max-w-5xl lg:mx-auto"
        >
          {levels.map(({ levelNum, config, isUnlocked, stars, isPerfect, newStarsFrom }) => {
            // Determine card variant based on state
            const cardVariant = !isUnlocked 
              ? 'locked' 
              : isPerfect 
                ? 'perfect' 
                : stars > 0 
                  ? 'gold' 
                  : 'default';

            return (
              <motion.div
                key={levelNum}
                variants={cardVariants}
              >
                <PremiumCard
                  disabled={!isUnlocked}
                  onClick={() => isUnlocked && onLevelSelect(world.id, levelNum)}
                  data-testid={`level-button-${levelNum}`}
                  variant={cardVariant}
                  glowColor={glowColor}
                  tiltIntensity={0.3}
                  enableTilt={isUnlocked}
                  className="p-4 sm:p-5 h-full"
                >
                  {/* Level Number - Large and prominent */}
                  <div className="flex items-center justify-between mb-4">
                    <span
                      className={cn(
                        'text-3xl sm:text-4xl font-black',
                        isUnlocked ? 'text-neo-white' : 'text-neo-white/40'
                      )}
                    >
                      {levelNum}
                    </span>
                    {!isUnlocked ? (
                      <Lock className="w-6 h-6 text-neo-white/40" />
                    ) : stars === 0 ? (
                      <Play className={cn('w-5 h-5', worldColors.text)} />
                    ) : isPerfect ? (
                      <CheckCircle2 className="w-5 h-5 text-neo-yellow fill-neo-yellow" />
                    ) : (
                      <CheckCircle2 className={cn('w-5 h-5', worldColors.text)} />
                    )}
                  </div>

                  {/* Stars Display - shimmer on hover */}
                  <div className="flex items-center gap-1.5 mb-3 group-hover:animate-pulse-subtle">
                    {Array.from({ length: MAX_STARS_PER_LEVEL }).map((_, i) => {
                      const isEarned = stars > i;
                      const isNewlyEarned = isEarned && i >= newStarsFrom;
                      return (
                      <motion.div
                        key={`star-${i}`}
                        initial={isNewlyEarned ? { scale: 0.95, rotate: -180 } : false}
                        animate={isNewlyEarned ? { scale: 1, rotate: 0 } : undefined}
                        transition={isNewlyEarned ? { delay: levelNum * 0.03 + i * 0.08, type: 'spring', stiffness: 300, damping: 20 } : undefined}
                      >
                        <Star
                          className={cn(
                            'w-5 h-5 sm:w-6 sm:h-6 transition-all duration-300',
                            i < stars
                              ? 'text-neo-yellow fill-neo-yellow drop-shadow-[0_0_6px_rgba(255,225,53,0.7)] group-hover:drop-shadow-[0_0_10px_rgba(255,225,53,0.9)]'
                              : 'text-neo-white/20 group-hover:text-neo-white/30'
                          )}
                        />
                      </motion.div>
                      );
                    })}
                  </div>

                  {/* Level Info - Only show when unlocked */}
                  {isUnlocked && (
                    <div className="space-y-2">
                      {/* Primary Objective */}
                      {config.objectives
                        .filter((o) => o.isPrimary)
                        .slice(0, 1)
                        .map((obj) => (
                          <div
                            key={obj.type}
                            className="text-xs text-neo-white/60 flex items-center gap-1.5 min-w-0"
                          >
                            <Target className="w-3 h-3 flex-shrink-0" />
                            <span
                              className="truncate min-w-0"
                              title={`${t(`adventure.objectives.${obj.type}`) || obj.type}: ${obj.target}`}
                            >
                              {t(`adventure.objectives.${obj.type}`) || obj.type}:{' '}
                              {obj.target}
                            </span>
                          </div>
                        ))}

                      {/* Special Tiles - Compact badges */}
                      {config.specialTiles.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap">
                          {Object.entries(
                            config.specialTiles.reduce(
                              (acc, tile) => {
                                acc[tile.type] = (acc[tile.type] || 0) + 1;
                                return acc;
                              },
                              {} as Record<string, number>
                            )
                          )
                            .slice(0, 3)
                            .map(([type, count]) => (
                              <span
                                key={type}
                                className={cn(
                                  'inline-flex items-center gap-0.5 px-1.5 py-0.5',
                                  'text-[10px] font-bold rounded-sm',
                                  type === 'gold' && 'bg-neo-yellow/20 text-neo-yellow',
                                  type === 'ice' && 'bg-neo-cyan/20 text-neo-cyan',
                                  type === 'bomb' && 'bg-neo-red/20 text-neo-red',
                                  type === 'rainbow' && 'bg-neo-pink/20 text-neo-pink'
                                )}
                              >
                                {TILE_ICONS[type]}
                                <span>{count}</span>
                              </span>
                            ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Difficulty Indicator - Visual bars instead of cryptic letters */}
                  <DifficultyIndicator difficulty={config.difficulty} />

                  {/* Perfect completion indicator */}
                  {isPerfect && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                      className="absolute -top-2 -right-2 rtl:-right-auto rtl:-left-2 w-8 h-8 bg-neo-yellow rounded-full border-3 border-neo-black flex items-center justify-center shadow-hard z-10"
                    >
                      <span className="text-neo-black font-black text-sm">★</span>
                    </motion.div>
                  )}
                </PremiumCard>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
}
