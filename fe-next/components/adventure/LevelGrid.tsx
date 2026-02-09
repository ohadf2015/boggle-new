'use client';

import React, { useMemo, memo } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import {
  Star,
  Lock,
  Clock,
  Target,
  Snowflake,
  Bomb,
  Rainbow,
  Coins,
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
import './LevelGrid.css';

interface LevelGridProps {
  world: WorldConfig;
  completions: Array<{ world: number; level: number; stars: number }>;
  totalStars: number;
  onLevelSelect: (worldId: number, levelId: number) => void;
}

// World images mapping (WebP for smaller file sizes)
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

/**
 * World-specific parallax layer configuration
 * Each world can have up to 3 parallax layers (far, mid, near) using dedicated assets
 * Depth values: lower = slower movement (farther), higher = faster movement (closer)
 */
interface ParallaxLayerConfig {
  src: string;
  depth: number;
  opacity: number;
  scale?: number;
  position?: 'top' | 'bottom' | 'center';
}

interface WorldParallaxConfig {
  far?: ParallaxLayerConfig;
  mid?: ParallaxLayerConfig;
  near?: ParallaxLayerConfig;
}

const WORLD_PARALLAX_LAYERS: Record<number, WorldParallaxConfig> = {
  1: { // Meadows - rolling hills and grass
    far: {
      src: '/images/adventure/parallax/meadows-hills.webp',
      depth: 0.15,
      opacity: 0.5,
      scale: 1.3,
      position: 'bottom',
    },
    near: {
      src: '/images/adventure/parallax/meadows-grass.webp',
      depth: 0.5,
      opacity: 0.7,
      scale: 1.2,
      position: 'bottom',
    },
  },
  2: { // Springs - waterfalls and mist
    far: {
      src: '/images/adventure/parallax/springs-rocks.webp',
      depth: 0.15,
      opacity: 0.4,
      scale: 1.3,
      position: 'center',
    },
    mid: {
      src: '/images/adventure/parallax/springs-waterfall.webp',
      depth: 0.3,
      opacity: 0.6,
      scale: 1.2,
      position: 'center',
    },
    near: {
      src: '/images/adventure/parallax/springs-mist.webp',
      depth: 0.55,
      opacity: 0.5,
      scale: 1.4,
      position: 'bottom',
    },
  },
  3: { // Caverns - crystals and stalactites
    far: {
      src: '/images/adventure/parallax/caverns-crystals-far.webp',
      depth: 0.12,
      opacity: 0.5,
      scale: 1.3,
      position: 'center',
    },
    mid: {
      src: '/images/adventure/parallax/caverns-stalactites.webp',
      depth: 0.25,
      opacity: 0.6,
      scale: 1.2,
      position: 'top',
    },
    near: {
      src: '/images/adventure/parallax/caverns-crystals-near.webp',
      depth: 0.5,
      opacity: 0.7,
      scale: 1.3,
      position: 'bottom',
    },
  },
  // Worlds 4-10 use gradient-based parallax layers (no dedicated images yet)
  4: {}, // Archipelago
  5: {}, // Canyon
  6: {}, // Labyrinth
  7: {}, // Palace
  8: {}, // Nebula
  9: {}, // Peaks
  10: {}, // Throne
};

// World-specific floating particle configurations
interface ParticleConfig {
  count: number;
  emoji: string[];
  colors: string[];
  sizeRange: [number, number];
  speedRange: [number, number];
}

const WORLD_PARTICLES: Record<number, ParticleConfig> = {
  1: { // Meadows - flowers, leaves, butterflies
    count: 10,
    emoji: ['🌸', '🍃', '🦋', '✿', '❀'],
    colors: ['#a3e635', '#84cc16', '#22c55e', '#fbbf24'],
    sizeRange: [8, 14],
    speedRange: [15, 30],
  },
  2: { // Springs - water, sparkles
    count: 12,
    emoji: ['💧', '✨', '💎', '🫧'],
    colors: ['#22d3ee', '#06b6d4', '#67e8f9', '#a5f3fc'],
    sizeRange: [8, 14],
    speedRange: [10, 25],
  },
  3: { // Caverns - crystals, roots
    count: 8,
    emoji: ['💜', '🔮', '💎', '✦'],
    colors: ['#a855f7', '#8b5cf6', '#c084fc', '#d8b4fe'],
    sizeRange: [8, 16],
    speedRange: [20, 35],
  },
  4: { // Archipelago - islands, waves
    count: 10,
    emoji: ['🌊', '🐚', '🌴', '☀️'],
    colors: ['#fb923c', '#f97316', '#fbbf24', '#fdba74'],
    sizeRange: [8, 16],
    speedRange: [12, 28],
  },
  5: { // Canyon - rocks, dust
    count: 8,
    emoji: ['🔶', '🧱', '⬛', '🏜️'],
    colors: ['#ef4444', '#dc2626', '#f97316', '#fbbf24'],
    sizeRange: [8, 14],
    speedRange: [18, 32],
  },
  6: { // Labyrinth - puzzles, letters
    count: 12,
    emoji: ['🔷', '🔶', '✧', '◇'],
    colors: ['#ec4899', '#f472b6', '#f9a8d4', '#db2777'],
    sizeRange: [8, 14],
    speedRange: [15, 28],
  },
  7: { // Palace - ice, mirrors
    count: 10,
    emoji: ['❄️', '💠', '✧', '◈'],
    colors: ['#22d3ee', '#06b6d4', '#e0f2fe', '#ffffff'],
    sizeRange: [8, 16],
    speedRange: [12, 25],
  },
  8: { // Nebula - stars, cosmic
    count: 14,
    emoji: ['⭐', '✨', '💫', '🌟'],
    colors: ['#a855f7', '#ec4899', '#8b5cf6', '#f472b6'],
    sizeRange: [6, 14],
    speedRange: [8, 22],
  },
  9: { // Peaks - aurora, mountains
    count: 8,
    emoji: ['🏔️', '✦', '❄️', '🌌'],
    colors: ['#22d3ee', '#a3e635', '#67e8f9', '#84cc16'],
    sizeRange: [8, 16],
    speedRange: [15, 30],
  },
  10: { // Throne - gold, crowns
    count: 12,
    emoji: ['👑', '⭐', '💫', '✧'],
    colors: ['#fbbf24', '#f59e0b', '#fcd34d', '#fef08a'],
    sizeRange: [8, 16],
    speedRange: [10, 25],
  },
};

// Icon map for special tile types
const TILE_ICONS: Record<string, React.ReactNode> = {
  gold: <Coins className="w-3 h-3" />,
  ice: <Snowflake className="w-3 h-3" />,
  bomb: <Bomb className="w-3 h-3" />,
  rainbow: <Rainbow className="w-3 h-3" />,
};

// Staggered animation variants for level cards
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.1,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.9 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 300,
      damping: 20,
    },
  },
};

// Floating particle component with CSS animations
// Performance: Uses CSS custom properties from :root (set by useParallax)
// instead of receiving parallax values as props, avoiding re-renders
const FloatingParticle = memo(({
  emoji,
  left,
  top,
  size,
  duration,
  delay,
}: {
  emoji: string;
  left: number;
  top: number;
  size: number;
  duration: number;
  delay: number;
}) => (
  <div
    className="level-grid-particle"
    style={{
      left: `${left}%`,
      top: `${top}%`,
      fontSize: `${size}px`,
      '--particle-duration': `${duration}s`,
      '--particle-delay': `${delay}s`,
      // --parallax-x and --parallax-y are set on :root by useParallax
      // CSS animation uses calc() with these values
    } as React.CSSProperties}
  >
    {emoji}
  </div>
));

FloatingParticle.displayName = 'FloatingParticle';

/**
 * ParallaxImageLayer - Renders a single parallax background layer
 * Uses CSS transforms for GPU-accelerated movement
 */
const ParallaxImageLayer = memo(({
  src,
  depth,
  opacity,
  scale = 1.2,
  position = 'center',
  parallaxX,
  parallaxY,
}: ParallaxLayerConfig & {
  parallaxX: number;
  parallaxY: number;
}) => {
  const positionClass = position === 'top'
    ? 'object-top'
    : position === 'bottom'
      ? 'object-bottom'
      : 'object-center';

  return (
    <div
      className="absolute inset-0 level-grid-parallax-layer"
      style={{
        transform: `translate(${parallaxX * depth}px, ${parallaxY * depth}px) scale(${scale})`,
        opacity,
      }}
    >
      <Image
        src={src}
        alt=""
        fill
        className={cn('object-cover', positionClass)}
      />
    </div>
  );
});

ParallaxImageLayer.displayName = 'ParallaxImageLayer';

/**
 * ForegroundFrame - Creates depth framing effect around viewport edges
 * Adds subtle vignette and edge blur for "looking through a window" effect
 */
const ForegroundFrame = memo(({
  glowColor,
  parallaxX,
  parallaxY,
}: {
  glowColor: string;
  parallaxX: number;
  parallaxY: number;
}) => (
  <>
    {/* Top edge shadow - moves slightly with parallax */}
    <div
      className="level-grid-foreground-edge level-grid-foreground-edge--top"
      style={{
        transform: `translateY(${parallaxY * 0.6}px)`,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
      }}
    />
    {/* Bottom edge with world color accent */}
    <div
      className="level-grid-foreground-edge level-grid-foreground-edge--bottom"
      style={{
        transform: `translateY(${-parallaxY * 0.6}px)`,
        backgroundColor: glowColor,
        opacity: 0.2,
      }}
    />
    {/* Side vignettes */}
    <div
      className="level-grid-foreground-vignette"
      style={{
        transform: `translate(${parallaxX * 0.4}px, ${parallaxY * 0.4}px)`,
      }}
    />
  </>
));

ForegroundFrame.displayName = 'ForegroundFrame';

/**
 * DifficultyIndicator - Visual difficulty indicator using bars
 * Shows 1 bar for EASY, 2 for MEDIUM, 3 for HARD
 * More intuitive than cryptic single letters (E, M, H)
 */
const DifficultyIndicator = memo(({
  difficulty,
}: {
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
}) => {
  const filledBars = difficulty === 'EASY' ? 1 : difficulty === 'MEDIUM' ? 2 : 3;
  const colorClass =
    difficulty === 'EASY'
      ? 'bg-neo-lime'
      : difficulty === 'MEDIUM'
        ? 'bg-neo-orange'
        : 'bg-neo-red';
  const containerColorClass =
    difficulty === 'EASY'
      ? 'text-neo-lime'
      : difficulty === 'MEDIUM'
        ? 'text-neo-orange'
        : 'text-neo-red';

  return (
    <div
      data-testid="difficulty-indicator"
      aria-label={`Difficulty: ${difficulty.toLowerCase()}`}
      className={cn(
        'absolute top-2 right-2 rtl:right-auto rtl:left-2',
        'flex items-end gap-0.5 px-1.5 py-1 rounded-sm',
        'bg-neo-black/50 border border-neo-black/30',
        containerColorClass
      )}
    >
      {[1, 2, 3].map((barNum) => (
        <div
          key={barNum}
          data-filled={barNum <= filledBars ? 'true' : 'false'}
          className={cn(
            'w-1 rounded-sm transition-all',
            barNum === 1 && 'h-1.5',
            barNum === 2 && 'h-2.5',
            barNum === 3 && 'h-3.5',
            barNum <= filledBars ? colorClass : 'bg-neo-white/20'
          )}
        />
      ))}
    </div>
  );
});

DifficultyIndicator.displayName = 'DifficultyIndicator';

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
  // Higher intensity (1.0) and faster ambient (0.6) for more reactive movement
  const { x: parallaxX, y: parallaxY } = useParallax({
    intensity: 1.0,
    enableGyroscope: true,
    enableGesture: true,
    enableAmbient: true,
    ambientSpeed: 0.6,
  });

  // Generate levels for this world
  const levels = Array.from({ length: LEVELS_PER_WORLD }, (_, i) => {
    const levelNum = i + 1;
    const config = getLevelConfig(world.id, levelNum);
    const completion = completions.find(
      (c) => c.world === world.id && c.level === levelNum
    );
    const isUnlocked = isLevelUnlocked(world.id, levelNum, completions);
    const stars = completion?.stars || 0;
    const isPerfect = stars === MAX_STARS_PER_LEVEL;

    return {
      levelNum,
      config,
      completion,
      isUnlocked,
      stars,
      isPerfect,
    };
  });

  // World name translation
  const worldName = t(`adventure.worlds.${world.name}`) || world.name;
  const worldStars = completions
    .filter((c) => c.world === world.id)
    .reduce((sum, c) => sum + c.stars, 0);
  const maxWorldStars = LEVELS_PER_WORLD * MAX_STARS_PER_LEVEL;
  const completedLevels = completions.filter((c) => c.world === world.id).length;

  // Get world-specific colors for consistent theming
  const worldColors = getWorldColors(world.colorPrimary);
  const glowColor = getWorldGlow(world.colorPrimary);
  const worldImage = WORLD_IMAGES[world.id];
  const particleConfig = WORLD_PARTICLES[world.id];
  const parallaxLayers = WORLD_PARALLAX_LAYERS[world.id] || {};

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
          className="absolute inset-0"
          style={{
            transform: `translate(${parallaxX * 0.05}px, ${parallaxY * 0.05}px)`,
            backgroundColor: 'rgb(12, 12, 35)',
          }}
        />

        {/* Layer 2: Main world image - the hero background */}
        <div
          className="absolute inset-0 level-grid-parallax-layer"
          style={{
            transform: `translate(${parallaxX * 0.12}px, ${parallaxY * 0.12}px) scale(1.15)`,
          }}
        >
          <Image
            src={worldImage}
            alt=""
            fill
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
          className="absolute inset-0"
          style={{
            transform: `translate(${parallaxX * 0.2}px, ${parallaxY * 0.2}px)`,
          }}
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

          {/* World icon preview */}
          <div className="absolute -top-4 -right-4 w-32 h-32 sm:w-40 sm:h-40 opacity-40 rotate-12">
            <Image
              src={worldImage}
              alt=""
              fill
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
                {t('adventure.worldLabel') || 'World'} {world.id}
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 }}
                className={cn('text-xl sm:text-2xl font-bold mt-1', worldColors.text)}
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
          {levels.map(({ levelNum, config, isUnlocked, stars, isPerfect }) => {
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
                    {Array.from({ length: MAX_STARS_PER_LEVEL }).map((_, i) => (
                      <motion.div
                        key={i}
                        initial={stars > i ? { scale: 0, rotate: -180 } : { scale: 0.5 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ delay: levelNum * 0.05 + i * 0.1, type: 'spring' }}
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
                    ))}
                  </div>

                  {/* Level Info - Only show when unlocked */}
                  {isUnlocked && (
                    <div className="space-y-2">
                      {/* Primary Objective */}
                      {config.objectives
                        .filter((o) => o.isPrimary)
                        .slice(0, 1)
                        .map((obj, i) => (
                          <div
                            key={i}
                            className="text-xs text-neo-white/60 flex items-center gap-1.5"
                          >
                            <Target className="w-3 h-3 flex-shrink-0" />
                            <span
                              className="truncate"
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
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                      className="absolute -top-2 -right-2 w-8 h-8 bg-neo-yellow rounded-full border-3 border-neo-black flex items-center justify-center shadow-hard"
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
