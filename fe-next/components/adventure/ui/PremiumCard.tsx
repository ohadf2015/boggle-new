/**
 * PremiumCard Component
 *
 * 3D tilt card with glare effect, shimmer animations, corner decorations,
 * and premium glass-morphism. Used for level cards, world selectors,
 * and achievement displays.
 */

'use client';

import React, { useRef, useState, useCallback, memo } from 'react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { useMotionValue, useSpring, useTransform } from 'framer-motion';
import { cn } from '@/lib/utils';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';

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
   * - gold: Gold-accented for premium/reward with animated shimmer
   * - locked: Grayscale with chain effect
   * - perfect: Subtle gold highlight for perfect completion
   * - mythic: Rainbow border with animated glow
   */
  variant?: 'default' | 'gold' | 'locked' | 'perfect' | 'mythic';
  /**
   * Rotation intensity (0-1, default: 0.5)
   */
  tiltIntensity?: number;
  /**
   * Enable/disable 3D tilt effect
   */
  enableTilt?: boolean;
  /**
   * Enable decorative corners
   */
  decorative?: boolean;
  /**
   * Corner style
   */
  cornerStyle?: 'star' | 'diamond' | 'rounded';
  /**
   * Enable continuous shimmer animation (for gold/mythic variants)
   */
  autoShimmer?: boolean;
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
  decorative = true,
  cornerStyle = 'star',
  autoShimmer = false,
  'data-testid': dataTestId,
}: PremiumCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();
  const { enableComplexAnimations } = useDevicePerformance();

  // Disable tilt when user prefers reduced motion (accessibility)
  const effectiveTiltEnabled = enableTilt && !prefersReducedMotion;
  const shouldAnimate = enableComplexAnimations && !prefersReducedMotion;

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
    if (!effectiveTiltEnabled || disabled || !cardRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    // Normalize to -0.5 to 0.5
    const normalizedX = (e.clientX - centerX) / rect.width;
    const normalizedY = (e.clientY - centerY) / rect.height;

    x.set(normalizedX);
    y.set(normalizedY);
  }, [effectiveTiltEnabled, disabled, x, y]);

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

  // Variant-specific styles - neo-brutalist: hard shadows, no blur glow
  const variantStyles = {
    default: {
      border: 'border-4 border-neo-black',
      bg: 'bg-neo-black/50 backdrop-blur-xs',
      shadow: '6px 6px 0px black',
      hoverShadow: '8px 8px 0px black',
      glowColor: 'rgba(0,0,0,0)',
      cornerColor: '#FFE135',
    },
    gold: {
      border: 'border-4 border-neo-yellow',
      bg: 'bg-linear-to-br from-neo-yellow/20 via-neo-yellow/10 to-transparent backdrop-blur-xs',
      shadow: '6px 6px 0px #8B7508',
      hoverShadow: '8px 8px 0px #8B7508',
      glowColor: 'rgba(255, 225, 53, 0.4)',
      cornerColor: '#FFE135',
    },
    locked: {
      border: 'border-4 border-neo-white/20',
      bg: 'bg-neo-black/30 backdrop-blur-xs',
      shadow: '6px 6px 0px rgba(0,0,0,0.5)',
      hoverShadow: '6px 6px 0px rgba(0,0,0,0.5)',
      glowColor: 'rgba(0,0,0,0)',
      cornerColor: '#666666',
    },
    perfect: {
      border: 'border-4 border-neo-yellow',
      bg: 'bg-linear-to-br from-neo-yellow/15 via-white/5 to-transparent backdrop-blur-xs',
      shadow: '6px 6px 0px #8B7508',
      hoverShadow: '8px 8px 0px #8B7508',
      glowColor: 'rgba(255, 225, 53, 0.3)',
      cornerColor: '#FFE135',
    },
    mythic: {
      border: 'border-4 border-transparent',
      bg: 'bg-linear-to-br from-purple-500/20 via-pink-500/20 to-cyan-500/20 backdrop-blur-xs',
      shadow: '6px 6px 0px #4B0082',
      hoverShadow: '8px 8px 0px #4B0082',
      glowColor: 'rgba(255, 0, 255, 0.4)',
      cornerColor: '#FF00FF',
    },
  };

  const styles = variantStyles[variant];

  // Corner SVG paths
  const cornerPaths = {
    star: 'M8,0 L10,6 L16,8 L10,10 L8,16 L6,10 L0,8 L6,6 Z',
    diamond: 'M8,0 L16,8 L8,16 L0,8 Z',
    rounded: 'M0,0 Q8,0 8,8 Q8,16 0,16 Z',
  };

  return (
    <AdaptiveMotion.div
      ref={cardRef}
      data-testid={dataTestId}
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseEnter={handleMouseEnter}
      style={{
        transform: effectiveTiltEnabled ? `rotateX(${rotateX}deg) rotateY(${rotateY}deg)` : undefined,
        transformStyle: 'preserve-3d',
        boxShadow: isHovered && !disabled
          ? `${styles.hoverShadow}, 0 0 30px ${styles.glowColor}`
          : styles.shadow,
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
        variant === 'mythic' && shouldAnimate && 'animate-rainbow-border',
        className
      )}
    >
      {/* Decorative corners */}
      {decorative && variant !== 'locked' && (
        <>
          <svg className="absolute top-2 left-2 w-4 h-4 pointer-events-none z-20" viewBox="0 0 16 16" fill="none">
            <path d={cornerPaths[cornerStyle]} fill={styles.cornerColor} stroke="#1a1a2e" strokeWidth="1" />
          </svg>
          <svg className="absolute top-2 right-2 w-4 h-4 pointer-events-none z-20" viewBox="0 0 16 16" fill="none" style={{ transform: 'scaleX(-1)' }}>
            <path d={cornerPaths[cornerStyle]} fill={styles.cornerColor} stroke="#1a1a2e" strokeWidth="1" />
          </svg>
          <svg className="absolute bottom-2 left-2 w-4 h-4 pointer-events-none z-20" viewBox="0 0 16 16" fill="none" style={{ transform: 'scaleY(-1)' }}>
            <path d={cornerPaths[cornerStyle]} fill={styles.cornerColor} stroke="#1a1a2e" strokeWidth="1" />
          </svg>
          <svg className="absolute bottom-2 right-2 w-4 h-4 pointer-events-none z-20" viewBox="0 0 16 16" fill="none" style={{ transform: 'scale(-1, -1)' }}>
            <path d={cornerPaths[cornerStyle]} fill={styles.cornerColor} stroke="#1a1a2e" strokeWidth="1" />
          </svg>
        </>
      )}

      {/* Inner glow effect */}
      <div
        className="absolute inset-0 pointer-events-none rounded-neo-lg z-10"
        style={{
          background: `radial-gradient(ellipse at 30% 30%, ${styles.glowColor} 0%, transparent 60%)`,
        }}
      />

      {/* Subtle glare effect on hover */}
      <AdaptiveMotion.div
        className="absolute inset-0 pointer-events-none z-10"
        style={{
          background: useTransform(
            [glareX, glareY],
            ([latestX, latestY]) =>
              `radial-gradient(circle at ${latestX}% ${latestY}%, rgba(255,255,255,0.15) 0%, transparent 50%)`
          ),
          opacity: effectiveTiltEnabled && variant !== 'locked' && isHovered ? 1 : 0,
        }}
      />

      {/* Shimmer effect on hover */}
      {shouldAnimate && (
        <AdaptiveAnimatePresence>
          {(isHovered || (autoShimmer && (variant === 'gold' || variant === 'mythic'))) && (
            <AdaptiveMotion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 pointer-events-none overflow-hidden rounded-neo-lg z-15"
            >
              <AdaptiveMotion.div
                className="absolute inset-0"
                style={{
                  background: variant === 'mythic'
                    ? 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)'
                    : 'linear-gradient(90deg, transparent, rgba(255,225,53,0.4), transparent)',
                }}
                initial={{ x: '-100%' }}
                animate={{ x: '200%' }}
                transition={{ 
                  duration: autoShimmer ? 2 : 0.8, 
                  ease: 'easeInOut',
                  repeat: autoShimmer ? Infinity : 0,
                  repeatDelay: autoShimmer ? 1 : 0,
                }}
              />
            </AdaptiveMotion.div>
          )}
        </AdaptiveAnimatePresence>
      )}

      {/* Locked variant chain overlay */}
      {variant === 'locked' && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-50 z-10">
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

      {/* Mythic variant animated border */}
      {variant === 'mythic' && shouldAnimate && (
        <div 
          className="absolute inset-0 pointer-events-none rounded-neo-lg z-20"
          style={{
            background: 'linear-gradient(90deg, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #4b0082, #9400d3, #ff0000)',
            backgroundSize: '200% 100%',
            animation: 'rainbow-shift 3s linear infinite',
            WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude',
            padding: '2px',
          }}
        />
      )}

      {/* Content */}
      <div className="relative z-20">
        {children}
      </div>
    </AdaptiveMotion.div>
  );
});

PremiumCard.displayName = 'PremiumCard';

export default PremiumCard;
