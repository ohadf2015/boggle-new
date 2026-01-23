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

// World images mapping
const WORLD_IMAGES: Record<number, string> = {
  1: '/images/adventure/world-meadows-3d.png',
  2: '/images/adventure/world-springs-3d.png',
  3: '/images/adventure/world-caverns-3d.png',
  4: '/images/adventure/world-archipelago-3d.png',
  5: '/images/adventure/world-canyon-3d.png',
  6: '/images/adventure/world-labyrinth-3d.png',
  7: '/images/adventure/world-palace-3d.png',
  8: '/images/adventure/world-nebula-3d.png',
  9: '/images/adventure/world-peaks-3d.png',
  10: '/images/adventure/world-throne-3d.png',
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
    count: 15,
    emoji: ['🌸', '🍃', '🦋', '✿', '❀'],
    colors: ['#a3e635', '#84cc16', '#22c55e', '#fbbf24'],
    sizeRange: [14, 24],
    speedRange: [15, 30],
  },
  2: { // Springs - water, sparkles
    count: 18,
    emoji: ['💧', '✨', '💎', '🫧'],
    colors: ['#22d3ee', '#06b6d4', '#67e8f9', '#a5f3fc'],
    sizeRange: [12, 20],
    speedRange: [10, 25],
  },
  3: { // Caverns - crystals, roots
    count: 12,
    emoji: ['💜', '🔮', '💎', '✦'],
    colors: ['#a855f7', '#8b5cf6', '#c084fc', '#d8b4fe'],
    sizeRange: [14, 22],
    speedRange: [20, 35],
  },
  4: { // Archipelago - islands, waves
    count: 14,
    emoji: ['🌊', '🐚', '🌴', '☀️'],
    colors: ['#fb923c', '#f97316', '#fbbf24', '#fdba74'],
    sizeRange: [14, 22],
    speedRange: [12, 28],
  },
  5: { // Canyon - rocks, dust
    count: 10,
    emoji: ['🔶', '🧱', '⬛', '🏜️'],
    colors: ['#ef4444', '#dc2626', '#f97316', '#fbbf24'],
    sizeRange: [12, 20],
    speedRange: [18, 32],
  },
  6: { // Labyrinth - puzzles, letters
    count: 16,
    emoji: ['🔷', '🔶', '✧', '◇'],
    colors: ['#ec4899', '#f472b6', '#f9a8d4', '#db2777'],
    sizeRange: [12, 18],
    speedRange: [15, 28],
  },
  7: { // Palace - ice, mirrors
    count: 14,
    emoji: ['❄️', '💠', '✧', '◈'],
    colors: ['#22d3ee', '#06b6d4', '#e0f2fe', '#ffffff'],
    sizeRange: [14, 22],
    speedRange: [12, 25],
  },
  8: { // Nebula - stars, cosmic
    count: 20,
    emoji: ['⭐', '✨', '💫', '🌟'],
    colors: ['#a855f7', '#ec4899', '#8b5cf6', '#f472b6'],
    sizeRange: [10, 20],
    speedRange: [8, 22],
  },
  9: { // Peaks - aurora, mountains
    count: 12,
    emoji: ['🏔️', '✦', '❄️', '🌌'],
    colors: ['#22d3ee', '#a3e635', '#67e8f9', '#84cc16'],
    sizeRange: [14, 24],
    speedRange: [15, 30],
  },
  10: { // Throne - gold, crowns
    count: 16,
    emoji: ['👑', '⭐', '💫', '✧'],
    colors: ['#fbbf24', '#f59e0b', '#fcd34d', '#fef08a'],
    sizeRange: [14, 24],
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
  const { x: parallaxX, y: parallaxY } = useParallax({
    intensity: 0.6,
    enableGyroscope: true,
    enableGesture: true,
    enableAmbient: true,
    ambientSpeed: 0.3,
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
      {/* Parallax container - stays fixed while content scrolls */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {/* Parallax World Background - Deep layer (0.1x movement) */}
        <div
          className="absolute inset-0"
          style={{
            transform: `translate(${parallaxX * 0.1}px, ${parallaxY * 0.1}px)`,
          }}
        >
          {/* World image as blurred background */}
          <div className="absolute inset-0 scale-150 opacity-30">
            <Image
              src={worldImage}
              alt=""
              fill
              className="object-cover blur-xl"
              priority
            />
          </div>
          {/* World-colored gradient overlay */}
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(180deg, transparent 0%, ${glowColor}20 50%, ${glowColor}40 100%)`,
            }}
          />
        </div>

        {/* Atmospheric glow - Mid layer (0.2x movement) */}
        <div
          className="absolute inset-0"
          style={{
            transform: `translate(${parallaxX * 0.2}px, ${parallaxY * 0.2}px)`,
          }}
        >
          {/* Radial glow from world color */}
          <div
            className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-30"
            style={{
              background: `radial-gradient(circle, ${glowColor}60 0%, transparent 70%)`,
              filter: 'blur(60px)',
            }}
          />
        </div>

        {/* Floating particles layer (0.3x movement via CSS custom properties) */}
        {/* Particles use --parallax-x/--parallax-y from :root set by useParallax */}
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
            'bg-neo-black/60 backdrop-blur-xl',
            'border-4 border-neo-black shadow-hard-lg'
          )}
          style={{
            boxShadow: `0 0 60px ${glowColor}50, 8px 8px 0px black`,
          }}
        >
          {/* Animated gradient accent overlay */}
          <div
            className="absolute inset-0 opacity-30 level-grid-gradient-sweep"
            style={{
              background: `linear-gradient(135deg, ${glowColor}40 0%, transparent 40%, transparent 60%, ${glowColor}30 100%)`,
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

        {/* Level Grid - Staggered glass cards */}
        {/* Desktop: max 5 columns for better card sizing, centered with auto margins */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-5 lg:gap-6 lg:max-w-5xl lg:mx-auto"
        >
          {levels.map(({ levelNum, config, isUnlocked, stars, isPerfect }) => (
            <motion.button
              key={levelNum}
              variants={cardVariants}
              disabled={!isUnlocked}
              onClick={() => isUnlocked && onLevelSelect(world.id, levelNum)}
              data-testid={`level-button-${levelNum}`}
              whileHover={isUnlocked ? { scale: 1.05, y: -4 } : undefined}
              whileTap={isUnlocked ? { scale: 0.97 } : undefined}
              className={cn(
                'relative p-4 sm:p-5 rounded-neo-lg transition-all duration-200',
                'border-4 border-neo-black',
                isUnlocked
                  ? cn(
                      'bg-neo-black/50 backdrop-blur-md',
                      'shadow-hard hover:shadow-hard-lg cursor-pointer',
                      stars > 0 && 'ring-2 ring-inset',
                      isPerfect && 'ring-neo-yellow'
                    )
                  : 'bg-neo-black/20 cursor-not-allowed opacity-40'
              )}
              style={
                isUnlocked
                  ? {
                      boxShadow:
                        stars > 0
                          ? `0 0 25px ${glowColor}50, 6px 6px 0px black`
                          : `6px 6px 0px black`,
                      ...(stars > 0 && !isPerfect
                        ? ({ '--tw-ring-color': glowColor } as React.CSSProperties)
                        : {}),
                    }
                  : undefined
              }
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

              {/* Stars Display */}
              <div className="flex items-center gap-1.5 mb-3">
                {Array.from({ length: MAX_STARS_PER_LEVEL }).map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      'w-5 h-5 sm:w-6 sm:h-6 transition-all duration-300',
                      i < stars
                        ? 'text-neo-yellow fill-neo-yellow drop-shadow-[0_0_6px_rgba(255,225,53,0.7)]'
                        : 'text-neo-white/20'
                    )}
                  />
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
                        <span className="truncate">
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

              {/* Difficulty Badge - More subtle */}
              <div
                className={cn(
                  'absolute top-2 right-2 text-[9px] font-black px-1.5 py-0.5 rounded-sm uppercase tracking-wider',
                  config.difficulty === 'EASY' && 'bg-neo-lime/30 text-neo-lime',
                  config.difficulty === 'MEDIUM' && 'bg-neo-orange/30 text-neo-orange',
                  config.difficulty === 'HARD' && 'bg-neo-red/30 text-neo-red'
                )}
              >
                {config.difficulty[0]}
              </div>

              {/* Perfect completion indicator */}
              {isPerfect && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1.5 -right-1.5 w-7 h-7 bg-neo-yellow rounded-full border-3 border-neo-black flex items-center justify-center shadow-hard-sm"
                >
                  <span className="text-neo-black font-black text-xs">★</span>
                </motion.div>
              )}
            </motion.button>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
