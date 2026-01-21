'use client';

import React, { useRef, useEffect, useMemo, useCallback, useState } from 'react';
import { motion, useTransform, useMotionValue } from 'framer-motion';
import './WorldMap.css'; // CSS keyframe animations for performance
import { Star, Lock, Crown, Sparkles } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  LEVELS_PER_WORLD,
  MAX_STARS_PER_LEVEL,
  getWorldUnlockRequirement,
  isWorldUnlocked,
  WORLD_CONFIGS,
  getWorldGlow,
  type WorldConfig,
} from '@/lib/adventure';

interface WorldMapProps {
  totalStars: number;
  completions: Array<{ world: number; level: number; stars: number }>;
  onWorldSelect: (worldId: number) => void;
}

// World images mapping
const WORLD_IMAGES: Record<number, string> = {
  1: '/images/adventure/world-meadows-3d.png',     // Alphabet Meadows
  2: '/images/adventure/world-springs-3d.png',     // Synonym Springs
  3: '/images/adventure/world-caverns-3d.png',     // Root Caverns
  4: '/images/adventure/world-archipelago-3d.png', // Idiom Archipelago
  5: '/images/adventure/world-canyon-3d.png',      // Compound Canyon
  6: '/images/adventure/world-labyrinth-3d.png',   // Anagram Labyrinth
  7: '/images/adventure/world-palace-3d.png',      // Mirror Palace
  8: '/images/adventure/world-nebula-3d.png',      // Neologism Nebula
  9: '/images/adventure/world-peaks-3d.png',       // Polyglot Peaks
  10: '/images/adventure/world-throne-3d.png',     // The Lexicon Throne
};


// Floating cloud component - CSS animation for performance
const Cloud = ({
  className,
  size = 'md',
  speed = 1,
}: {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  speed?: number;
}) => {
  const sizes = { sm: 'w-16 h-10', md: 'w-24 h-14', lg: 'w-32 h-20' };

  return (
    <div
      className={cn('world-map-cloud', sizes[size], className)}
      style={{
        '--cloud-drift': `${20 * speed}px`,
        '--cloud-duration': `${15 / speed}s`,
      } as React.CSSProperties}
    >
      <Image
        src="/images/adventure/cloud.png"
        alt=""
        fill
        className="object-contain"
      />
    </div>
  );
};

// Orbiting letter that flies around a world - CSS animation for performance
// Pre-calculated circular path eliminates per-frame trig calculations
const OrbitingLetter = ({
  letter,
  radius,
  duration,
  delay,
  clockwise = true,
  color = 'text-neo-white',
}: {
  letter: string;
  radius: number;
  duration: number;
  delay: number;
  clockwise?: boolean;
  color?: string;
}) => (
  <div
    className={cn(
      'world-map-orbit-letter text-lg sm:text-xl',
      clockwise ? 'world-map-orbit-letter--clockwise' : 'world-map-orbit-letter--counter-clockwise',
      color
    )}
    style={{
      '--orbit-radius': `${radius}px`,
      '--orbit-duration': `${duration}s`,
      '--orbit-delay': `${delay}s`,
    } as React.CSSProperties}
  >
    {letter}
  </div>
);

// Letters that orbit around a world node
const WorldOrbitingLetters = ({
  worldId,
  isUnlocked,
  colorPrimary,
}: {
  worldId: number;
  isUnlocked: boolean;
  colorPrimary: string;
}) => {
  // Generate 3-4 letters per world based on world name
  const worldLetters = useMemo(() => {
    const letterSets: Record<number, string[]> = {
      1: ['A', 'B', 'C'],           // Alphabet Meadows
      2: ['S', 'Y', 'N'],           // Synonym Springs
      3: ['R', 'O', 'T'],           // Root Caverns
      4: ['I', 'D', 'M'],           // Idiom Archipelago
      5: ['C', 'M', 'P', 'D'],      // Compound Canyon
      6: ['A', 'N', 'G', 'M'],      // Anagram Labyrinth
      7: ['M', 'I', 'R'],           // Mirror Palace
      8: ['N', 'E', 'O'],           // Neologism Nebula
      9: ['P', 'O', 'L', 'Y'],      // Polyglot Peaks
      10: ['L', 'E', 'X'],          // Lexicon Throne
    };
    return letterSets[worldId] || ['W', 'O', 'R', 'D'];
  }, [worldId]);

  // Map colors to text classes
  const colorClasses: Record<string, string> = {
    'neo-lime': 'text-neo-lime',
    'neo-cyan': 'text-neo-cyan',
    'neo-purple': 'text-neo-purple',
    'neo-orange': 'text-neo-orange',
    'neo-red': 'text-neo-red',
    'neo-pink': 'text-neo-pink',
    'neo-yellow': 'text-neo-yellow',
  };

  if (!isUnlocked) return null;

  return (
    <>
      {worldLetters.map((letter, i) => (
        <OrbitingLetter
          key={`${worldId}-${letter}-${i}`}
          letter={letter}
          radius={55 + i * 12}
          duration={6 + i * 2}
          delay={i * 1.5}
          clockwise={i % 2 === 0}
          color={colorClasses[colorPrimary] || 'text-neo-white/60'}
        />
      ))}
    </>
  );
};

// Dynamic SVG trail connector between worlds - clean connection
const TrailPath = ({
  isUnlocked,
  fromLeft,
}: {
  isUnlocked: boolean;
  fromLeft: boolean; // true = connecting FROM left world TO right world
}) => {
  // World positions: left at ~22%, right at ~78%
  const leftX = 22;
  const rightX = 78;

  // S-curve that extends slightly beyond viewport to hide endpoints
  // Endpoints at y=-5 and y=65 (outside viewBox 0-60) so they connect cleanly under worlds
  const path = fromLeft
    ? `M ${leftX} -5 C ${leftX} 25, ${rightX} 35, ${rightX} 65`
    : `M ${rightX} -5 C ${rightX} 25, ${leftX} 35, ${leftX} 65`;

  return (
    <div className="relative h-16 sm:h-20 w-full -my-2">
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 100 60"
        preserveAspectRatio="none"
        style={{ overflow: 'visible' }}
      >
        {/* Subtle center glow only - no endpoint glow */}
        {isUnlocked && (
          <path
            d={path}
            fill="none"
            stroke="#FFE135"
            strokeWidth="8"
            strokeLinecap="butt"
            opacity={0.2}
            style={{ filter: 'blur(6px)' }}
          />
        )}
        {/* Main trail path - flat ends that go under world circles */}
        <path
          d={path}
          fill="none"
          stroke={isUnlocked ? '#FFE135' : 'rgba(255,255,255,0.08)'}
          strokeWidth="4"
          strokeLinecap="butt"
          strokeDasharray={isUnlocked ? '0' : '8 6'}
        />
        {/* Animated particle on unlocked path */}
        {isUnlocked && (
          <circle r="3" fill="#FFFFFF" opacity={0.8}>
            <animateMotion dur="2.5s" repeatCount="indefinite" path={path} />
          </circle>
        )}
      </svg>
    </div>
  );
};

// World node on the trail
const WorldNode = ({
  world,
  isUnlocked,
  unlockRequirement,
  currentStars,
  completedLevels,
  totalWorldStars,
  onClick,
  index,
  isLeft,
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
}) => {
  const { t } = useLanguage();
  const isFinalWorld = world.id === 10;
  const isComplete = completedLevels === LEVELS_PER_WORLD;
  const worldName = t(`adventure.worlds.${world.name}`) || world.name;
  const worldImage = WORLD_IMAGES[world.id];

  // Get colors from world config
  const glowColor = getWorldGlow(world.colorPrimary);

  return (
    <motion.div
      className="relative w-full px-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, type: 'spring', stiffness: 100, damping: 15 }}
    >
      {/* World positioned at fixed percentage from edge */}
      <div
        className={cn(
          'absolute top-1/2 -translate-y-1/2',
          isLeft ? 'left-[22%] -translate-x-1/2' : 'right-[22%] translate-x-1/2'
        )}
      >
        {/* Container for world + orbiting letters */}
        <div className="relative">
          {/* Orbiting letters around unlocked worlds */}
          <WorldOrbitingLetters
            worldId={world.id}
            isUnlocked={isUnlocked}
            colorPrimary={world.colorPrimary}
          />

          <motion.button
            onClick={onClick}
            disabled={!isUnlocked}
            whileHover={isUnlocked ? { scale: 1.08, y: -4 } : undefined}
            whileTap={isUnlocked ? { scale: 0.95 } : undefined}
            className={cn(
              'relative flex-shrink-0',
              'focus:outline-none focus-visible:ring-4 focus-visible:ring-neo-lime rounded-full',
              isUnlocked ? 'cursor-pointer' : 'cursor-not-allowed'
            )}
            style={{
              filter: isUnlocked ? `drop-shadow(0 0 16px ${glowColor})` : 'grayscale(1) brightness(0.5)',
            }}
          >
            {/* Circular World Image */}
            <div className={cn(
              'relative w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28',
              'rounded-full overflow-hidden',
              'border-4 border-neo-black',
              isUnlocked && 'ring-2 ring-neo-yellow/50'
            )}>
            <Image
              src={worldImage}
              alt={worldName}
              fill
              className={cn(
                'object-cover',
                !isUnlocked && 'opacity-40'
              )}
            />
            {/* Lock overlay for locked worlds */}
            {!isUnlocked && (
              <div className="absolute inset-0 flex items-center justify-center bg-neo-black/50">
                <Lock className="w-8 h-8 sm:w-10 sm:h-10 text-neo-white/70" />
              </div>
            )}
          </div>

          {/* Crown for final world */}
          {isFinalWorld && isUnlocked && (
            <motion.div
              className="absolute -top-4 left-1/2 -translate-x-1/2"
              animate={{ y: [0, -3, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Crown className="w-7 h-7 text-neo-yellow fill-neo-yellow drop-shadow-lg" />
            </motion.div>
          )}

          {/* Completion badge */}
          {isComplete && (
            <div className="absolute -bottom-1 -right-1 w-7 h-7 sm:w-8 sm:h-8 bg-neo-lime rounded-full border-2 border-neo-black flex items-center justify-center shadow-hard-sm z-10">
              <span className="text-neo-black font-black text-sm">✓</span>
            </div>
          )}

          {/* Animated pulse ring for unlocked */}
          {isUnlocked && !isComplete && (
            <motion.div
              className="absolute -inset-1 rounded-full border-2 border-neo-yellow"
              animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0, 0.6] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          )}
        </motion.button>
        </div>
      </div>

      {/* World Info Card - positioned on the opposite side */}
      <motion.div
        className={cn(
          'absolute top-1/2 -translate-y-1/2',
          'max-w-[150px] sm:max-w-[180px]',
          'bg-neo-navy-light/95 backdrop-blur-sm',
          'border-3 border-neo-black rounded-neo',
          'p-2.5 sm:p-3 shadow-hard-sm',
          !isUnlocked && 'opacity-60',
          // Position card on opposite side of world
          isLeft ? 'left-[42%]' : 'right-[42%]'
        )}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: index * 0.08 + 0.1 }}
      >
        {/* World name */}
        <h3 className={cn(
          'font-black text-xs sm:text-sm uppercase tracking-tight leading-tight',
          isUnlocked ? 'text-neo-white' : 'text-neo-white/50'
        )}>
          {worldName}
        </h3>

        {/* Stars progress */}
        <div className="flex items-center gap-1.5 mt-1.5">
          <Star className={cn(
            'w-3.5 h-3.5',
            currentStars > 0 ? 'text-neo-yellow fill-neo-yellow' : 'text-neo-white/30'
          )} />
          <span className={cn(
            'text-xs font-bold',
            isUnlocked ? 'text-neo-yellow' : 'text-neo-white/40'
          )}>
            {currentStars}/{totalWorldStars}
          </span>
          <span className={cn(
            'text-xs',
            isUnlocked ? 'text-neo-white/60' : 'text-neo-white/30'
          )}>
            · {completedLevels}/{LEVELS_PER_WORLD}
          </span>
        </div>

        {/* Unlock requirement */}
        {!isUnlocked && (
          <div className="flex items-center gap-1 mt-2 text-[11px] text-neo-white/50">
            <Lock className="w-3 h-3" />
            <span>{unlockRequirement}</span>
            <Star className="w-3 h-3 text-neo-yellow/50" />
          </div>
        )}
      </motion.div>

      {/* Spacer for layout height */}
      <div className="h-24 sm:h-28 md:h-32" />
    </motion.div>
  );
};

/**
 * WorldMap - Trail-based adventure map with word game elements
 * Features: dynamic SVG trails, floating clouds & letters, mascot GIFs
 */
export default function WorldMap({
  totalStars,
  completions,
  onWorldSelect,
}: WorldMapProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollProgress = useMotionValue(0);

  // RAF-throttled scroll handler for parallax effect
  // Performance: Throttles from 60-120 calls/sec to max 60 calls/sec (RAF rate)
  const rafIdRef = useRef<number | null>(null);
  const handleScroll = useCallback(() => {
    // Skip if a RAF is already pending
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

  // Add scroll listener with passive option for better scroll performance
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Passive listener doesn't block scroll (improves scroll smoothness)
    container.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      container.removeEventListener('scroll', handleScroll);
      // Clean up any pending RAF on unmount
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [handleScroll]);

  // Parallax transforms for different layers
  const starsY = useTransform(scrollProgress, [0, 1], [0, -100]);
  const cloudsY = useTransform(scrollProgress, [0, 1], [0, -150]);

  // Pre-generate star positions for galaxy background
  const stars = useMemo(() => {
    const seededRandom = (seed: number) => {
      const x = Math.sin(seed * 9999) * 10000;
      return x - Math.floor(x);
    };

    // Fewer stars for cleaner look
    return Array.from({ length: 40 }, (_, i) => ({
      id: i,
      left: seededRandom(i * 1.1) * 100,
      top: seededRandom(i * 2.3) * 100,
      opacity: 0.15 + seededRandom(i * 3.7) * 0.6,
      duration: 2 + seededRandom(i * 4.2) * 4,
      delay: seededRandom(i * 5.1) * 3,
      size: i % 5 === 0 ? 4 : i % 3 === 0 ? 3 : i % 2 === 0 ? 2 : 1,
      // Some stars have color tints for galaxy effect
      color: i % 7 === 0 ? '#a5f3fc' : i % 11 === 0 ? '#fcd34d' : i % 13 === 0 ? '#f9a8d4' : '#ffffff',
    }));
  }, []);

  // Fewer nebula clouds for cleaner look
  const nebulaClouds = useMemo(() => [
    { left: '10%', top: '10%', color: 'rgba(139, 92, 246, 0.08)', size: 300, blur: 120 },
    { left: '75%', top: '35%', color: 'rgba(236, 72, 153, 0.06)', size: 280, blur: 100 },
    { left: '5%', top: '60%', color: 'rgba(34, 211, 238, 0.07)', size: 260, blur: 110 },
    { left: '70%', top: '80%', color: 'rgba(251, 191, 36, 0.06)', size: 250, blur: 100 },
  ], []);

  // Fewer shooting stars for cleaner look
  const shootingStars = useMemo(() => [
    { delay: 0, duration: 2, startX: 15, startY: 15 },
    { delay: 8, duration: 1.8, startX: 75, startY: 50 },
  ], []);


  // Prepare worlds data (World 10 at top, World 1 at bottom)
  const worldsData = useMemo(() => {
    return [...WORLD_CONFIGS].reverse().map((world) => {
      const isUnlocked = isWorldUnlocked(world.id, totalStars);
      const unlockRequirement = getWorldUnlockRequirement(world.id);
      const worldCompletions = completions.filter((c) => c.world === world.id);
      const worldStars = worldCompletions.reduce((sum, c) => sum + c.stars, 0);
      const totalWorldStars = LEVELS_PER_WORLD * MAX_STARS_PER_LEVEL;

      return {
        world,
        isUnlocked,
        unlockRequirement,
        currentStars: worldStars,
        completedLevels: worldCompletions.length,
        totalWorldStars,
      };
    });
  }, [totalStars, completions]);

  return (
    <div
      ref={containerRef}
      className="relative h-full overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-neo-white/20 scrollbar-track-transparent"
    >
      {/* Deep space background gradient */}
      <div className="fixed inset-0 bg-gradient-to-b from-[#050510] via-[#0a0a2a] to-[#0d1033] pointer-events-none" />

      {/* Milky Way band - diagonal gradient across screen */}
      <div
        className="fixed inset-0 pointer-events-none opacity-30"
        style={{
          background: 'linear-gradient(135deg, transparent 20%, rgba(139,92,246,0.1) 35%, rgba(236,72,153,0.08) 50%, rgba(34,211,238,0.1) 65%, transparent 80%)',
        }}
      />

      {/* Cosmic dust particles */}
      <div
        className="fixed inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage: `radial-gradient(1px 1px at 20px 30px, rgba(255,255,255,0.3), transparent),
                           radial-gradient(1px 1px at 40px 70px, rgba(255,255,255,0.2), transparent),
                           radial-gradient(1px 1px at 50px 160px, rgba(255,255,255,0.3), transparent),
                           radial-gradient(1px 1px at 90px 40px, rgba(255,255,255,0.2), transparent),
                           radial-gradient(1px 1px at 130px 80px, rgba(255,255,255,0.3), transparent),
                           radial-gradient(2px 2px at 160px 120px, rgba(255,255,255,0.15), transparent)`,
          backgroundSize: '200px 200px',
        }}
      />

      {/* Nebula clouds for cosmic atmosphere - CSS animations for performance */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {nebulaClouds.map((nebula, i) => (
          <div
            key={i}
            className="world-map-nebula"
            style={{
              left: nebula.left,
              top: nebula.top,
              width: nebula.size,
              height: nebula.size,
              background: `radial-gradient(circle, ${nebula.color} 0%, transparent 70%)`,
              filter: `blur(${nebula.blur}px)`,
              '--nebula-duration': `${12 + i * 2}s`,
            } as React.CSSProperties}
          />
        ))}
      </div>

      {/* Shooting stars - CSS animations for performance */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {shootingStars.map((star, i) => (
          <div
            key={i}
            className="world-map-shooting-star"
            style={{
              left: `${star.startX}%`,
              top: `${star.startY}%`,
              '--shooting-duration': `${star.duration}s`,
              '--shooting-delay': `${star.delay + i * 15}s`,
            } as React.CSSProperties}
          />
        ))}
      </div>

      {/* Starfield background with parallax - CSS animations for performance */}
      <motion.div
        className="fixed inset-0 pointer-events-none overflow-hidden"
        style={{ y: starsY }}
      >
        {stars.map((star) => (
          <div
            key={star.id}
            className={cn(
              'world-map-star',
              star.size > 3 ? 'world-map-star--large' :
              star.size > 2 ? 'world-map-star--medium' :
              'world-map-star--small'
            )}
            style={{
              left: `${star.left}%`,
              top: `${star.top}%`,
              width: star.size,
              height: star.size,
              backgroundColor: star.color,
              boxShadow: star.size > 2 ? `0 0 ${star.size * 2}px ${star.color}` : 'none',
              // CSS custom properties for animation
              '--star-opacity-min': star.opacity * 0.4,
              '--star-opacity-max': star.opacity,
              '--star-duration': `${star.duration}s`,
              '--star-delay': `${star.delay}s`,
              '--star-scale': star.size > 2 ? 1.3 : 1.5,
            } as React.CSSProperties}
          />
        ))}
      </motion.div>

      {/* Floating clouds with parallax - fewer clouds for cleaner look */}
      <motion.div className="fixed inset-0 pointer-events-none" style={{ y: cloudsY }}>
        <Cloud className="top-[15%] left-[5%]" size="md" speed={0.5} />
        <Cloud className="top-[50%] right-[6%]" size="lg" speed={0.4} />
        <Cloud className="top-[80%] left-[8%]" size="sm" speed={0.6} />
      </motion.div>

      {/* World trail */}
      <div className="relative z-10 py-8 sm:py-12">
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
                onClick={() => data.isUnlocked && onWorldSelect(data.world.id)}
                index={index}
                isLeft={isLeft}
              />

              {/* Dynamic trail connector - connects FROM this world TO the next */}
              {index < worldsData.length - 1 && (
                <TrailPath
                  isUnlocked={worldsData[index + 1].isUnlocked}
                  fromLeft={isLeft}
                />
              )}
            </React.Fragment>
          );
        })}

        {/* Journey Start section with mascot - at the END of the trail (bottom) */}
        <motion.div
          className="relative mt-8 flex flex-col items-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          {/* Connection to last world */}
          <div className="w-1.5 h-8 bg-neo-yellow mb-2" />

          {/* Mascot GIF */}
          <motion.div
            className="relative w-24 h-24 sm:w-32 sm:h-32 mb-3"
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Image
              src="/mascot/play-nobg.gif"
              alt="Mascot ready to play"
              fill
              className="object-contain"
              unoptimized
            />
          </motion.div>

          {/* Start banner */}
          <motion.div
            className="px-5 py-2.5 bg-neo-lime border-3 border-neo-black rounded-neo shadow-hard"
            whileHover={{ scale: 1.05 }}
          >
            <span className="text-neo-black font-black text-sm sm:text-base">
              Start Your Journey!
            </span>
          </motion.div>
        </motion.div>

        {/* Bottom scroll anchor */}
        <div ref={bottomRef} className="h-8" />
      </div>

      {/* Scroll hint at top with mascot */}
      <motion.div
        className="fixed top-20 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, y: [0, -3, 0] }}
        transition={{ delay: 2, duration: 1.5, repeat: Infinity }}
      >
        <div className="w-8 h-8 relative">
          <Image
            src="/mascot/study-nobg.gif"
            alt=""
            fill
            className="object-contain"
            unoptimized
          />
        </div>
        <div className="px-3 py-1.5 bg-neo-black/70 rounded-full text-neo-white/70 text-xs font-medium backdrop-blur-sm">
          ↑ Scroll up for more worlds
        </div>
      </motion.div>
    </div>
  );
}
