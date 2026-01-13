'use client';

import { motion } from 'framer-motion';
import { memo } from 'react';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';
import { Mascot, MascotVariant } from './Mascot';

const LEXI_LETTERS = ['L', 'E', 'X', 'I', 'C', 'L', 'A', 'S', 'H'] as const;

const LETTER_COLORS = [
  'bg-neo-lime',
  'bg-neo-cyan',
  'bg-neo-pink',
  'bg-neo-lime',
  'bg-neo-cyan',
  'bg-neo-pink',
  'bg-neo-lime',
  'bg-neo-cyan',
  'bg-neo-lime',
] as const;

interface NeoLoaderProps {
  /** Optional text to show below the animation */
  text?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Loading animation variant */
  variant?: 'letters' | 'mascot' | 'dots' | 'mascot-letters';
  /** Mascot variant for mascot mode (default: 'thinking') */
  mascotVariant?: MascotVariant;
}

/**
 * Playful neo-brutalist loading animation
 * Features bouncing letter tiles spelling "LEXICLASH"
 */
export const NeoLoader = memo(function NeoLoader({
  text,
  size = 'md',
  variant = 'letters',
  mascotVariant = 'thinking',
}: NeoLoaderProps) {
  const { prefersReducedMotion, enableComplexAnimations } = useDevicePerformance();

  const sizeClasses = {
    sm: { tile: 'w-6 h-6 text-xs', gap: 'gap-0.5' },
    md: { tile: 'w-8 h-8 text-sm', gap: 'gap-1' },
    lg: { tile: 'w-10 h-10 text-base', gap: 'gap-1.5' },
  };

  // Simplified loader for reduced motion or low-end devices
  if (prefersReducedMotion || !enableComplexAnimations) {
    return (
      <div className="flex flex-col items-center justify-center">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-neo-lime rounded-full animate-pulse" />
          <div className="w-3 h-3 bg-neo-cyan rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
          <div className="w-3 h-3 bg-neo-pink rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
        </div>
        {text && (
          <p className="text-neo-white/70 text-sm mt-3 font-neo-body">{text}</p>
        )}
      </div>
    );
  }

  if (variant === 'dots') {
    return (
      <div className="flex flex-col items-center justify-center">
        <div className="flex items-center gap-2">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-3 h-3 bg-neo-cyan rounded-full"
              animate={{ y: [0, -12, 0] }}
              transition={{
                duration: 0.6,
                delay: i * 0.15,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>
        {text && (
          <p className="text-neo-white/70 text-sm mt-3 font-neo-body">{text}</p>
        )}
      </div>
    );
  }

  if (variant === 'mascot') {
    return (
      <div className="flex flex-col items-center justify-center">
        {/* Animated Mascot using the reusable component */}
        <Mascot
          variant={mascotVariant}
          size={size}
          animated={true}
          priority={true}
        />
        {text && (
          <motion.p
            className="text-neo-white/70 text-sm mt-3 font-neo-body"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            {text}
          </motion.p>
        )}
      </div>
    );
  }

  // Combined mascot with spinner variant
  if (variant === 'mascot-letters') {
    const spinnerSizes = {
      sm: 'w-12 h-12',
      md: 'w-16 h-16',
      lg: 'w-20 h-20',
    };

    return (
      <div className="flex flex-col items-center justify-center gap-6">
        {/* Animated Mascot */}
        <Mascot
          variant={mascotVariant}
          size={size}
          animated={true}
          priority={true}
        />
        {/* Simple spinner */}
        <div className={`${spinnerSizes[size]} relative`}>
          <motion.div
            className="absolute inset-0 rounded-full border-4 border-neo-cyan/20"
          />
          <motion.div
            className="absolute inset-0 rounded-full border-4 border-transparent border-t-neo-cyan border-r-neo-pink"
            animate={{ rotate: 360 }}
            transition={{
              duration: 1,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
        </div>
        {text && (
          <motion.p
            className="text-neo-white/70 text-sm font-neo-body"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            {text}
          </motion.p>
        )}
      </div>
    );
  }

  // Letter tiles variant (default)
  return (
    <div className="flex flex-col items-center justify-center">
      <div className={`flex ${sizeClasses[size].gap}`}>
        {LEXI_LETTERS.map((letter, i) => (
          <motion.div
            key={i}
            className={`
              ${sizeClasses[size].tile}
              ${LETTER_COLORS[i]}
              border-2 border-neo-black rounded-neo shadow-hard-sm
              flex items-center justify-center
              font-neo-display font-black text-neo-black
            `}
            animate={{
              y: [0, -15, 0],
              rotate: [0, -5, 5, 0],
            }}
            transition={{
              duration: 0.6,
              delay: i * 0.08,
              repeat: Infinity,
              repeatDelay: 0.8,
              ease: 'easeOut',
            }}
          >
            {letter}
          </motion.div>
        ))}
      </div>
      {text && (
        <motion.p
          className="text-neo-white/70 text-sm mt-4 font-neo-body"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {text}
        </motion.p>
      )}
    </div>
  );
});

export default NeoLoader;
