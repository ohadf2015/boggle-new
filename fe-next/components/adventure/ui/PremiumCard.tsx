/**
 * PremiumCard Component
 *
 * 3D tilt card with glare effect, hover animations, and premium glass-morphism.
 * Used for level cards, world selectors, and achievement displays.
 */

'use client';

import React, { useRef, useState, useCallback, memo } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { cn } from '@/lib/utils';

// ==============================================
// TYPES
// ==============================================

interface PremiumCardProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
  disabled?: boolean;
  onClick?: () => void;
  /**
   * Card variant determines the visual style
   * - default: Standard glass card
   * - gold: Gold-accented for premium/reward
   * - locked: Grayscale with chain effect
   * - perfect: Rainbow shimmer for perfect completion
   */
  variant?: 'default' | 'gold' | 'locked' | 'perfect';
  /**
   * Rotation intensity (0-1, default: 0.5)
   */
  tiltIntensity?: number;
  /**
   * Enable/disable 3D tilt effect
   */
  enableTilt?: boolean;
  /**
   * Data attribute for testing
   */
  'data-testid'?: string;
}

// ==============================================
// COMPONENT
// ==============================================

export const PremiumCard = memo(function PremiumCard({
  children,
  className,
  glowColor = '#FFE135',
  disabled = false,
  onClick,
  variant = 'default',
  tiltIntensity = 0.5,
  enableTilt = true,
  'data-testid': dataTestId,
}: PremiumCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Motion values for 3D tilt
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Spring configuration for smooth return
  const springConfig = { stiffness: 300, damping: 30 };
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [10 * tiltIntensity, -10 * tiltIntensity]), springConfig);
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-10 * tiltIntensity, 10 * tiltIntensity]), springConfig);

  // Glare position
  const glareX = useTransform(rotateY, [-10, 10], [0, 100]);
  const glareY = useTransform(rotateX, [-10, 10], [0, 100]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!enableTilt || disabled || !cardRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    // Normalize to -0.5 to 0.5
    const normalizedX = (e.clientX - centerX) / rect.width;
    const normalizedY = (e.clientY - centerY) / rect.height;

    x.set(normalizedX);
    y.set(normalizedY);
  }, [enableTilt, disabled, x, y]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    x.set(0);
    y.set(0);
  }, [x, y]);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  const handleClick = useCallback(() => {
    if (!disabled && onClick) {
      onClick();
    }
  }, [disabled, onClick]);

  // Variant-specific styles
  const variantStyles = {
    default: {
      border: 'border-4 border-neo-black',
      bg: 'bg-neo-black/50 backdrop-blur-md',
      shadow: `0 0 30px ${glowColor}30, 6px 6px 0px black`,
      hoverShadow: `0 0 50px ${glowColor}50, 8px 8px 0px black`,
    },
    gold: {
      border: 'border-4 border-neo-yellow',
      bg: 'bg-gradient-to-br from-neo-yellow/20 to-amber-500/20 backdrop-blur-md',
      shadow: `0 0 40px ${glowColor}60, 6px 6px 0px black, inset 0 0 20px ${glowColor}20`,
      hoverShadow: `0 0 60px ${glowColor}80, 8px 8px 0px black, inset 0 0 30px ${glowColor}30`,
    },
    locked: {
      border: 'border-4 border-neo-white/20',
      bg: 'bg-neo-black/30 backdrop-blur-sm',
      shadow: '6px 6px 0px rgba(0,0,0,0.5)',
      hoverShadow: '6px 6px 0px rgba(0,0,0,0.5)',
    },
    perfect: {
      border: 'border-4 border-neo-yellow',
      bg: 'bg-neo-black/60 backdrop-blur-md',
      shadow: `0 0 50px ${glowColor}70, 6px 6px 0px black`,
      hoverShadow: `0 0 80px ${glowColor}90, 8px 8px 0px black`,
    },
  };

  const styles = variantStyles[variant];

  return (
    <motion.div
      ref={cardRef}
      data-testid={dataTestId}
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseEnter={handleMouseEnter}
      style={{
        rotateX: enableTilt ? rotateX : 0,
        rotateY: enableTilt ? rotateY : 0,
        transformStyle: 'preserve-3d',
        boxShadow: isHovered && !disabled ? styles.hoverShadow : styles.shadow,
      }}
      whileHover={!disabled ? { scale: 1.02, y: -4 } : {}}
      whileTap={!disabled ? { scale: 0.98 } : {}}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={cn(
        'relative overflow-hidden rounded-neo-lg',
        'transition-colors duration-300',
        styles.border,
        styles.bg,
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
        className
      )}
    >
      {/* Glare effect - always render but control opacity */}
      <motion.div
        className="absolute inset-0 pointer-events-none z-10"
        style={{
          background: useTransform(
            [glareX, glareY],
            ([latestX, latestY]) => 
              `radial-gradient(circle at ${latestX}% ${latestY}%, rgba(255,255,255,0.25) 0%, transparent 60%)`
          ),
          opacity: enableTilt && variant !== 'locked' && isHovered ? 1 : 0,
        }}
      />

      {/* Perfect variant rainbow shimmer */}
      {variant === 'perfect' && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div 
            className="absolute inset-0 animate-shimmer"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(255,215,0,0.3), rgba(255,105,180,0.3), rgba(0,255,255,0.3), transparent)',
              backgroundSize: '200% 100%',
            }}
          />
        </div>
      )}

      {/* Locked variant chain overlay */}
      {variant === 'locked' && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-50">
          <div 
            className="absolute inset-0"
            style={{
              background: `repeating-linear-gradient(
                45deg,
                transparent,
                transparent 10px,
                rgba(100,100,100,0.2) 10px,
                rgba(100,100,100,0.2) 12px
              )`,
            }}
          />
        </div>
      )}

      {/* Content */}
      <div className="relative z-20">
        {children}
      </div>
    </motion.div>
  );
});

PremiumCard.displayName = 'PremiumCard';

export default PremiumCard;
