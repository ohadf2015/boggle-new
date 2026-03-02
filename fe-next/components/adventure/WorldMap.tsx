'use client';

import React, { useRef, useEffect, useMemo, useCallback } from 'react';
import { motion, useTransform, useMotionValue } from 'framer-motion';
import './WorldMap.css'; // CSS keyframe animations for performance
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

interface WorldMapProps {
  totalStars: number;
  completions: Array<{ world: number; level: number; stars: number }>;
  onWorldSelect: (worldId: number) => void;
}

// Motion variants - extracted to constants to prevent re-creation on every render
// This improves performance by avoiding unnecessary animation recalculations
const WORLD_HOVER_VARIANT = { scale: 1.08, y: -4, rotate: 2 };
const WORLD_TAP_VARIANT = { scale: 0.95, rotate: -1 };

// World images mapping (WebP for 91% smaller file sizes)
const WORLD_IMAGES: Record<number, string> = {
  1: '/images/adventure/world-meadows-3d.webp',     // Alphabet Meadows
  2: '/images/adventure/world-springs-3d.webp',     // Synonym Springs
  3: '/images/adventure/world-caverns-3d.webp',     // Root Caverns
  4: '/images/adventure/world-archipelago-3d.webp', // Idiom Archipelago
  5: '/images/adventure/world-canyon-3d.webp',      // Compound Canyon
  6: '/images/adventure/world-labyrinth-3d.webp',   // Anagram Labyrinth
  7: '/images/adventure/world-palace-3d.webp',      // Mirror Palace
  8: '/images/adventure/world-nebula-3d.webp',      // Neologism Nebula
  9: '/images/adventure/world-peaks-3d.webp',       // Polyglot Peaks
  10: '/images/adventure/world-throne-3d.webp',     // The Lexicon Throne
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
        src="/images/adventure/cloud.webp"
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

// Letters that orbit around a world node - uses localized world name
const WorldOrbitingLetters = ({
  worldId,
  worldName,
  isUnlocked,
  colorPrimary,
}: {
  worldId: number;
  worldName: string; // Translated world name from parent
  isUnlocked: boolean;
  colorPrimary: string;
}) => {
  // Extract 3-4 unique characters from the localized world name
  const worldLetters = useMemo(() => {
    // Get unique characters, filtering out spaces and punctuation
    const chars = worldName
      .split('')
      .filter(char => /\p{L}/u.test(char)) // Only letters (works with all scripts)
      .map(char => char.toUpperCase());

    // Get unique characters, preserving order
    const uniqueChars = [...new Set(chars)];

    // Take 3-4 characters (prefer 3 for cleaner look)
    const count = uniqueChars.length >= 4 ? 4 : Math.min(3, uniqueChars.length);
    return uniqueChars.slice(0, count);
  }, [worldName]);

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

  if (!isUnlocked || worldLetters.length === 0) return null;

  return (
    <>
      {worldLetters.map((letter, i) => (
        <OrbitingLetter
          key={`${worldId}-${letter}-${i}`}
          letter={letter}
          radius={52 + i * 10} // Tighter radius to prevent overflow beyond world node
          duration={8 + i * 3} // Slower, more varied durations
          delay={i * 2.5} // More staggered delays
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
  // World positions: more centered for desktop (30% and 70%)
  const leftX = 30;
  const rightX = 70;

  // S-curve that extends slightly beyond viewport to hide endpoints
  // Endpoints at y=-5 and y=65 (outside viewBox 0-60) so they connect cleanly under worlds
  const path = fromLeft
    ? `M ${leftX} -5 C ${leftX} 25, ${rightX} 35, ${rightX} 65`
    : `M ${rightX} -5 C ${rightX} 25, ${leftX} 35, ${leftX} 65`;

  return (
    <div className="relative h-20 sm:h-24 w-full -my-2 lg:max-w-4xl lg:mx-auto overflow-hidden">
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 100 60"
        preserveAspectRatio="none"
        style={{ overflow: 'visible' }}
      >
        {/* Subtle glow for unlocked paths - more blended */}
        {isUnlocked && (
          <path
            d={path}
            fill="none"
            stroke="#FFE135"
            strokeWidth="10"
            strokeLinecap="round"
            opacity={0.2}
            style={{ filter: 'blur(12px)' }}
          />
        )}
        {/* Main trail path - thinner and softer */}
        <path
          d={path}
          fill="none"
          stroke={isUnlocked ? '#FFE135' : 'rgba(255,255,255,0.12)'}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={isUnlocked ? '0' : '10 8'}
          opacity={isUnlocked ? 0.7 : 1}
        />
        {/* Animated particle traveling bottom-to-top (reversed with keyPoints) */}
        {isUnlocked && (
          <circle r="3" fill="#FFFFFF" opacity={0.8}>
            <animateMotion
              dur="3s"
              repeatCount="indefinite"
              path={path}
              keyPoints="1;0"
              keyTimes="0;1"
              calcMode="spline"
              keySplines="0.4 0 0.2 1"
            />
            {/* Subtle pulse effect */}
            <animate
              attributeName="opacity"
              values="0.6;1;0.6"
              dur="3s"
              repeatCount="indefinite"
            />
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
  isNextWorld,
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
      className={cn(
        'relative w-full px-4 sm:px-8 lg:px-12',
        // Flex layout with justify for proper centering on desktop
        'flex items-center gap-3 sm:gap-6 lg:gap-8',
        isLeft ? 'justify-start lg:justify-center' : 'justify-end lg:justify-center',
        isLeft ? 'flex-row' : 'flex-row-reverse'
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, type: 'spring', stiffness: 100, damping: 15 }}
    >
      {/* World node container — min-w prevents squishing on small viewports */}
      <div className="flex-shrink-0 min-w-[6rem] sm:min-w-[7rem]">
        {/* Container for world + orbiting letters — overflow visible for glow/orbits */}
        <div className="relative">
          {/* Orbiting letters around unlocked worlds */}
          <WorldOrbitingLetters
            worldId={world.id}
            worldName={worldName}
            isUnlocked={isUnlocked}
            colorPrimary={world.colorPrimary}
          />

          <motion.button
            onClick={onClick}
            disabled={!isUnlocked}
            data-testid={`world-${world.id}`}
            aria-label={isUnlocked
              ? `${t('adventure.playWorld') || 'Play'} ${worldName} - ${currentStars}/${totalWorldStars} ${t('adventure.stars') || 'stars'}, ${completedLevels}/${LEVELS_PER_WORLD} ${t('adventure.levelsCompleted') || 'levels completed'}`
              : `${worldName} - ${t('adventure.locked') || 'Locked'}, ${t('adventure.requires') || 'requires'} ${unlockRequirement} ${t('adventure.stars') || 'stars'}`
            }
            whileHover={isUnlocked ? WORLD_HOVER_VARIANT : undefined}
            whileTap={isUnlocked ? WORLD_TAP_VARIANT : undefined}
            className={cn(
              'relative flex-shrink-0',
              'focus:outline-none focus-visible:ring-4 focus-visible:ring-neo-lime rounded-full',
              isUnlocked ? 'cursor-pointer' : 'cursor-not-allowed'
            )}
            style={{
              // Double-layer drop-shadow for outer glow (constrained to avoid overflow)
              filter: isUnlocked
                ? `drop-shadow(0 0 16px ${glowColor}) drop-shadow(0 0 32px ${glowColor})`
                : 'grayscale(1) brightness(0.5)',
            }}
          >
            {/* Aura: radial gradient halo that sits behind the world sphere */}
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

            {/* Circular World Image - larger and more prominent (96-144px range) */}
            <div className={cn(
              'relative z-10 w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 lg:w-36 lg:h-36',
              'rounded-full overflow-hidden',
              'border-[5px] border-neo-black',
              // Stronger ring for unlocked worlds
              isUnlocked && 'ring-[3px] ring-neo-yellow/60'
            )}>
            <Image
              src={worldImage}
              alt={worldName}
              fill
              className={cn(
                'object-cover scale-110', // Slight zoom to show more of the world
                !isUnlocked && 'opacity-40'
              )}
            />
            {/* Lock overlay for locked worlds */}
            {!isUnlocked && (
              <div className="absolute inset-0 flex items-center justify-center bg-neo-black/50">
                <Lock className="w-10 h-10 sm:w-12 sm:h-12 text-neo-white/70" />
              </div>
            )}
          </div>

          {/* Crown for final world - larger and more prominent */}
          {isFinalWorld && isUnlocked && (
            <motion.div
              className="absolute -top-5 left-1/2 -translate-x-1/2"
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Crown className="w-9 h-9 sm:w-10 sm:h-10 text-neo-yellow fill-neo-yellow drop-shadow-[0_0_10px_rgba(255,225,53,0.8)]" />
            </motion.div>
          )}

          {/* Completion badge - larger with stronger shadow */}
          {isComplete && (
            <div className="absolute -bottom-1 -right-1 w-8 h-8 sm:w-10 sm:h-10 bg-neo-lime rounded-full border-3 border-neo-black flex items-center justify-center shadow-hard z-10">
              <span className="text-neo-black font-black text-base sm:text-lg">✓</span>
            </div>
          )}

          {/* "NEXT" badge for the next world to play */}
          {isNextWorld && !isComplete && (
            <div className="absolute -top-2 -left-2 z-10 px-2 py-0.5 bg-neo-lime text-neo-black text-[10px] font-black uppercase rounded-neo border-2 border-neo-black shadow-hard-sm">
              {t('adventure.next') || 'NEXT'}
            </div>
          )}

          {/* Animated pulse ring for unlocked - thicker border */}
          {isUnlocked && !isComplete && (
            <motion.div
              className="absolute -inset-1 rounded-full border-[3px] border-neo-yellow"
              animate={{ scale: [1, 1.18, 1], opacity: [0.7, 0, 0.7] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          )}
        </motion.button>
        </div>
      </div>

      {/* World Info Card - in flex flow next to world */}
      <motion.div
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
        {/* World name - bolder with truncation for overflow */}
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

        {/* Stars progress — compact row with no-wrap to prevent breaking */}
        <div className="flex items-center gap-1.5 sm:gap-2 mt-2 whitespace-nowrap">
          <Star className={cn(
            'w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0',
            currentStars > 0 ? 'text-neo-yellow fill-neo-yellow' : 'text-neo-white/30'
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

        {/* Unlock requirement */}
        {!isUnlocked && (
          <div className="flex items-center gap-1.5 mt-2.5 text-xs text-neo-white/50 whitespace-nowrap">
            <Lock className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{unlockRequirement}</span>
            <Star className="w-3.5 h-3.5 flex-shrink-0 text-neo-yellow/50" />
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

/**
 * WorldMap - Trail-based adventure map with word game elements
 * Features: dynamic SVG trails, floating clouds & letters, scrollable world navigation
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

  // Scroll-based parallax transforms for different layers
  const starsY = useTransform(scrollProgress, [0, 1], [0, -100]);
  const cloudsY = useTransform(scrollProgress, [0, 1], [0, -150]);

  // Interactive parallax from gyroscope/mouse/touch - match game view intensity
  const { x: parallaxX, y: parallaxY } = useParallax({
    intensity: 0.8,
    enableGyroscope: true,
    enableGesture: true,
    enableAmbient: true,
    ambientSpeed: 0.5,
  });

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

  // Derive next world to play: first unlocked but not fully completed
  const nextWorldId = useMemo(() => {
    // worldsData is reversed (10→1), so iterate from end to find lowest-id incomplete world
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
      {/* Deep space background gradient - very subtle parallax (depth: 0.05) */}
      <div
        className="fixed inset-0 bg-gradient-to-b from-[#050510] via-[#0a0a2a] to-[#0d1033] pointer-events-none"
        style={{
          transform: `translate(${parallaxX * 0.05}px, ${parallaxY * 0.05}px)`,
        }}
      />

      {/* Milky Way band - diagonal gradient across screen (depth: 0.1) */}
      <div
        className="fixed inset-0 pointer-events-none opacity-30"
        style={{
          background: 'linear-gradient(135deg, transparent 20%, rgba(139,92,246,0.1) 35%, rgba(236,72,153,0.08) 50%, rgba(34,211,238,0.1) 65%, transparent 80%)',
          transform: `translate(${parallaxX * 0.1}px, ${parallaxY * 0.1}px)`,
        }}
      />

      {/* Cosmic dust particles (depth: 0.15) */}
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
          transform: `translate(${parallaxX * 0.15}px, ${parallaxY * 0.15}px)`,
        }}
      />

      {/* Nebula clouds for cosmic atmosphere - CSS animations for performance (depth: 0.25) */}
      <div
        className="fixed inset-0 pointer-events-none overflow-hidden"
        style={{
          transform: `translate(${parallaxX * 0.25}px, ${parallaxY * 0.25}px)`,
        }}
      >
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

      {/* Shooting stars - CSS animations for performance (depth: 0.2) */}
      <div
        className="fixed inset-0 pointer-events-none overflow-hidden"
        style={{
          transform: `translate(${parallaxX * 0.2}px, ${parallaxY * 0.2}px)`,
        }}
      >
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

      {/* Starfield background with parallax - scroll + interactive (depth: 0.4) */}
      <motion.div
        className="fixed inset-0 pointer-events-none overflow-hidden"
        style={{
          y: starsY,
          x: parallaxX * 0.4,
          translateY: parallaxY * 0.4,
        }}
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

      {/* Floating clouds with parallax - scroll + interactive (depth: 0.6) */}
      <motion.div
        className="fixed inset-0 pointer-events-none"
        style={{
          y: cloudsY,
          x: parallaxX * 0.6,
          translateY: parallaxY * 0.6,
        }}
      >
        <Cloud className="top-[15%] left-[5%]" size="md" speed={0.5} />
        <Cloud className="top-[50%] right-[6%]" size="lg" speed={0.4} />
        <Cloud className="top-[80%] left-[8%]" size="sm" speed={0.6} />
      </motion.div>

      {/* World trail - centered on desktop with max width */}
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
                onClick={() => data.isUnlocked && onWorldSelect(data.world.id)}
                index={index}
                isLeft={isLeft}
                isNextWorld={data.world.id === nextWorldId}
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

        {/* Bottom scroll anchor - extra height ensures bottom world is fully visible */}
        <div ref={bottomRef} className="h-24" />
      </div>

    </div>
  );
}
