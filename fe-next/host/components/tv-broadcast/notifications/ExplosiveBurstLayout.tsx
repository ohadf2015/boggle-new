'use client';

import { memo, useMemo } from 'react';
import { m } from 'framer-motion';
import Image from 'next/image';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../../../lib/utils';
import { Mascot, type MascotVariant } from '../../../../components/ui/Mascot';

interface ExplosiveBurstLayoutProps {
  headline: string;
  subtext?: string;
  player?: string;
  icon: LucideIcon;
  mascotVariant: MascotVariant;
  bgGradient: string;
  textColor: string;
  borderColor: string;
}

// Particle positions - deterministic for consistent rendering
const PARTICLE_POSITIONS = [
  { angle: 0, distance: 120, size: 'lg', delay: 0 },
  { angle: 45, distance: 140, size: 'md', delay: 0.05 },
  { angle: 90, distance: 130, size: 'lg', delay: 0.1 },
  { angle: 135, distance: 150, size: 'sm', delay: 0.15 },
  { angle: 180, distance: 125, size: 'md', delay: 0.08 },
  { angle: 225, distance: 145, size: 'lg', delay: 0.12 },
  { angle: 270, distance: 135, size: 'sm', delay: 0.06 },
  { angle: 315, distance: 155, size: 'md', delay: 0.18 },
];

const PARTICLE_SIZES = {
  sm: 'w-2 h-2',
  md: 'w-3 h-3',
  lg: 'w-4 h-4',
};

const PARTICLE_COLORS = [
  'bg-neo-yellow',
  'bg-neo-pink',
  'bg-neo-cyan',
  'bg-neo-cream',
];

/**
 * ExplosiveBurstLayout - Radial burst with particles for mega events
 * Used for legendary words, max combos, comebacks, first blood
 */
const ExplosiveBurstLayout = memo<ExplosiveBurstLayoutProps>(({
  headline,
  subtext,
  player,
  icon: Icon,
  mascotVariant,
  bgGradient,
  textColor,
  borderColor,
}) => {
  // Calculate particle positions based on angle and distance
  const particles = useMemo(() => PARTICLE_POSITIONS.map((p, i) => {
    const radians = (p.angle * Math.PI) / 180;
    return {
      x: Math.cos(radians) * p.distance,
      y: Math.sin(radians) * p.distance,
      size: PARTICLE_SIZES[p.size as keyof typeof PARTICLE_SIZES],
      color: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
      delay: p.delay,
    };
  }), []);

  return (
    <m.div
      initial={{ opacity: 0, scale: 0.3 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.2 }}
      transition={{ type: 'spring', stiffness: 600, damping: 20 }}
      className="relative flex flex-col items-center"
    >
      {/* Burst particles */}
      {particles.map((particle, i) => (
        <m.div
          key={`p-${i}-${particle.x}-${particle.y}`}
          className={cn(
            'absolute rounded-full',
            particle.size,
            particle.color,
          )}
          initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
          animate={{
            x: particle.x,
            y: particle.y,
            scale: [0, 1.5, 0],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: 1.5,
            delay: particle.delay,
            repeat: Infinity,
            repeatDelay: 0.5,
          }}
        />
      ))}

      {/* Combo burst image behind content */}
      <m.div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 1.8, 1.5], opacity: [0, 0.8, 0.4] }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        aria-hidden="true"
      >
        <Image
          src="/images/tv-broadcast/fx-combo-burst.png"
          alt=""
          width={400}
          height={400}
          className="opacity-70"
        />
      </m.div>

      {/* Glow effect */}
      <m.div
        className="absolute inset-0 rounded-full"
        animate={{
          boxShadow: [
            '0 0 30px rgba(255,107,53,0.4)',
            '0 0 60px rgba(255,51,102,0.6)',
            '0 0 30px rgba(255,107,53,0.4)',
          ],
        }}
        transition={{ duration: 1, repeat: Infinity }}
      />

      {/* Main content container */}
      <m.div
        initial={{ scale: 0.5, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 15 }}
        className={cn(
          'relative px-8 py-6 rounded-neo border-4',
          `bg-linear-to-r ${bgGradient}`,
          textColor,
          borderColor,
          'shadow-hard-xl',
        )}
      >
        {/* Mascot at top */}
        <m.div
          className="absolute -top-16 left-1/2 -translate-x-1/2"
          initial={{ y: -50, scale: 0 }}
          animate={{ y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.2 }}
        >
          <Mascot
            variant={mascotVariant}
            size="xl"
            animated
            className="drop-shadow-[4px_4px_0px_rgba(0,0,0,1)]"
            clipBorder="none"
          />
        </m.div>

        {/* Content */}
        <div className="flex flex-col items-center gap-2 pt-8">
          <m.div
            animate={{ rotate: [0, -10, 10, 0] }}
            transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1 }}
          >
            <Icon className="w-12 h-12" />
          </m.div>

          <m.h3
            className="font-black uppercase tracking-wider text-3xl md:text-4xl text-center"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 0.5, repeat: Infinity }}
          >
            {headline}
          </m.h3>

          {subtext && (
            <p className="font-bold text-lg opacity-90 text-center">
              {subtext}
            </p>
          )}

          {player && (
            <div className="mt-1 px-4 py-1 bg-neo-black/20 rounded-full">
              <span className="font-black text-sm">{player}</span>
            </div>
          )}
        </div>
      </m.div>
    </m.div>
  );
});

ExplosiveBurstLayout.displayName = 'ExplosiveBurstLayout';

export default ExplosiveBurstLayout;
