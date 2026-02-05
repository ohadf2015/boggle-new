/**
 * DecorativeCard Component
 *
 * Enhanced card with ornate corner flourishes, inner glow effects,
 * and thematic decorations. Perfect for game mode cards and premium content.
 */

'use client';

import React, { memo, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';

type CornerStyle = 'scroll' | 'leaf' | 'star' | 'wave' | 'pixel' | 'none';
type CardTheme = 'default' | 'arcade' | 'library' | 'nature' | 'mythic';

export interface DecorativeCardProps {
  children: React.ReactNode;
  className?: string;
  /**
   * Corner decoration style
   */
  cornerStyle?: CornerStyle;
  /**
   * Card theme determines color accents
   */
  theme?: CardTheme;
  /**
   * Enable inner glow effect
   */
  innerGlow?: boolean;
  /**
   * Enable shimmer effect on hover
   */
  shimmer?: boolean;
  /**
   * Border width (1-4)
   */
  borderWidth?: 1 | 2 | 3 | 4;
  /**
   * Card is interactive (hover effects)
   */
  interactive?: boolean;
  /**
   * Disabled state
   */
  disabled?: boolean;
  /**
   * Click handler
   */
  onClick?: () => void;
  /**
   * Data attribute for testing
   */
  'data-testid'?: string;
}

// Corner SVG paths for different styles
const CORNER_PATHS: Record<CornerStyle, { topLeft: string; topRight: string; bottomLeft: string; bottomRight: string }> = {
  scroll: {
    topLeft: 'M0,0 L20,0 Q15,5 12,12 Q5,15 0,20 Z',
    topRight: 'M0,0 L-20,0 Q-15,5 -12,12 Q-5,15 0,20 Z',
    bottomLeft: 'M0,0 L20,0 Q15,-5 12,-12 Q5,-15 0,-20 Z',
    bottomRight: 'M0,0 L-20,0 Q-15,-5 -12,-12 Q-5,-15 0,-20 Z',
  },
  leaf: {
    topLeft: 'M0,0 Q10,0 15,5 Q20,10 18,18 Q10,20 5,15 Q0,10 0,0 Z',
    topRight: 'M0,0 Q-10,0 -15,5 Q-20,10 -18,18 Q-10,20 -5,15 Q0,10 0,0 Z',
    bottomLeft: 'M0,0 Q10,0 15,-5 Q20,-10 18,-18 Q10,-20 5,-15 Q0,-10 0,0 Z',
    bottomRight: 'M0,0 Q-10,0 -15,-5 Q-20,-10 -18,-18 Q-10,-20 -5,-15 Q0,-10 0,0 Z',
  },
  star: {
    topLeft: 'M8,0 L10,6 L16,8 L10,10 L8,16 L6,10 L0,8 L6,6 Z',
    topRight: 'M-8,0 L-10,6 L-16,8 L-10,10 L-8,16 L-6,10 L0,8 L-6,6 Z',
    bottomLeft: 'M8,0 L10,-6 L16,-8 L10,-10 L8,-16 L6,-10 L0,-8 L6,-6 Z',
    bottomRight: 'M-8,0 L-10,-6 L-16,-8 L-10,-10 L-8,-16 L-6,-10 L0,-8 L-6,-6 Z',
  },
  wave: {
    topLeft: 'M0,0 Q8,2 12,8 Q15,15 8,18 Q2,15 0,8 Z',
    topRight: 'M0,0 Q-8,2 -12,8 Q-15,15 -8,18 Q-2,15 0,8 Z',
    bottomLeft: 'M0,0 Q8,-2 12,-8 Q15,-15 8,-18 Q2,-15 0,-8 Z',
    bottomRight: 'M0,0 Q-8,-2 -12,-8 Q-15,-15 -8,-18 Q-2,-15 0,-8 Z',
  },
  pixel: {
    topLeft: 'M0,0 L4,0 L4,4 L8,4 L8,8 L4,8 L4,12 L0,12 Z',
    topRight: 'M0,0 L-4,0 L-4,4 L-8,4 L-8,8 L-4,8 L-4,12 L0,12 Z',
    bottomLeft: 'M0,0 L4,0 L4,-4 L8,-4 L8,-8 L4,-8 L4,-12 L0,-12 Z',
    bottomRight: 'M0,0 L-4,0 L-4,-4 L-8,-4 L-8,-8 L-4,-8 L-4,-12 L0,-12 Z',
  },
  none: {
    topLeft: '',
    topRight: '',
    bottomLeft: '',
    bottomRight: '',
  },
};

const THEME_COLORS: Record<CardTheme, { primary: string; secondary: string; accent: string }> = {
  default: { primary: '#FFE135', secondary: '#1a1a2e', accent: '#00FFFF' },
  arcade: { primary: '#FF1493', secondary: '#1a1a2e', accent: '#00FFFF' },
  library: { primary: '#8B4513', secondary: '#2d1b0e', accent: '#FFD700' },
  nature: { primary: '#32CD32', secondary: '#1a3d1a', accent: '#98FB98' },
  mythic: { primary: '#9932CC', secondary: '#2e003e', accent: '#FF69B4' },
};

// Corner decoration component
const CornerDecoration = memo(function CornerDecoration({
  style,
  theme,
  position,
}: {
  style: CornerStyle;
  theme: CardTheme;
  position: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';
}) {
  if (style === 'none') return null;

  const colors = THEME_COLORS[theme];
  const path = CORNER_PATHS[style][position];

  const positionClasses = {
    topLeft: 'top-0 left-0',
    topRight: 'top-0 right-0',
    bottomLeft: 'bottom-0 left-0',
    bottomRight: 'bottom-0 right-0',
  };

  return (
    <svg
      className={cn('absolute w-6 h-6 pointer-events-none z-10', positionClasses[position])}
      viewBox="0 0 20 20"
      fill="none"
    >
      <path d={path} fill={colors.primary} stroke={colors.secondary} strokeWidth="1.5" />
    </svg>
  );
});

export const DecorativeCard = memo(function DecorativeCard({
  children,
  className,
  cornerStyle = 'scroll',
  theme = 'default',
  innerGlow = true,
  shimmer = true,
  borderWidth = 3,
  interactive = true,
  disabled = false,
  onClick,
  'data-testid': dataTestId,
}: DecorativeCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const { enableComplexAnimations, prefersReducedMotion } = useDevicePerformance();

  const colors = THEME_COLORS[theme];

  const borderClasses = {
    1: 'border',
    2: 'border-2',
    3: 'border-3',
    4: 'border-4',
  };

  const handleMouseEnter = () => {
    if (interactive && !disabled) setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  const handleClick = () => {
    if (!disabled && onClick) onClick();
  };

  return (
    <motion.div
      data-testid={dataTestId}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(
        'relative rounded-neo-lg overflow-hidden',
        borderClasses[borderWidth],
        'border-neo-black',
        'bg-neo-navy/80 backdrop-blur-sm',
        interactive && !disabled && 'cursor-pointer',
        disabled && 'cursor-not-allowed opacity-50',
        className
      )}
      style={{
        boxShadow: isHovered
          ? `${colors.accent}40 0 0 20px, 6px 6px 0 ${colors.secondary}`
          : `6px 6px 0 ${colors.secondary}`,
      }}
      whileHover={interactive && !disabled ? { scale: 1.02, y: -2 } : {}}
      whileTap={interactive && !disabled ? { scale: 0.98 } : {}}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      {/* Corner decorations */}
      {cornerStyle !== 'none' && (
        <>
          <CornerDecoration style={cornerStyle} theme={theme} position="topLeft" />
          <CornerDecoration style={cornerStyle} theme={theme} position="topRight" />
          <CornerDecoration style={cornerStyle} theme={theme} position="bottomLeft" />
          <CornerDecoration style={cornerStyle} theme={theme} position="bottomRight" />
        </>
      )}

      {/* Inner glow effect */}
      {innerGlow && (
        <div
          className="absolute inset-0 pointer-events-none rounded-neo-lg"
          style={{
            background: `radial-gradient(ellipse at center, ${colors.primary}10 0%, transparent 70%)`,
          }}
        />
      )}

      {/* Shimmer effect on hover */}
      {shimmer && enableComplexAnimations && !prefersReducedMotion && (
        <motion.div
          className="absolute inset-0 pointer-events-none overflow-hidden rounded-neo-lg"
          initial={false}
          animate={isHovered ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(90deg, transparent, ${colors.primary}30, transparent)`,
            }}
            initial={{ x: '-100%' }}
            animate={isHovered ? { x: '100%' } : { x: '-100%' }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </motion.div>
      )}

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
});

export default DecorativeCard;
