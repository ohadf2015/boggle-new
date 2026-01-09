'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';
import { cn } from '@/lib/utils';

interface SkeletonShimmerProps {
  /** Width of the skeleton (CSS value or number for pixels) */
  width?: string | number;
  /** Height of the skeleton (CSS value or number for pixels) */
  height?: string | number;
  /** Border radius variant */
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full' | 'neo';
  /** Base color */
  baseColor?: string;
  /** Shimmer highlight color */
  highlightColor?: string;
  /** Animation duration in seconds */
  duration?: number;
  /** Show neo-brutalist styling */
  neoStyle?: boolean;
  /** Additional className */
  className?: string;
}

/**
 * SkeletonShimmer - Animated loading placeholder
 *
 * Features:
 * - Smooth shimmer animation
 * - Neo-brutalist styling option
 * - Performance-adaptive (disables on low-end devices)
 * - Multiple size/shape presets
 *
 * @example
 * ```tsx
 * // Basic usage
 * <SkeletonShimmer width={200} height={20} />
 *
 * // Neo-brutalist card placeholder
 * <SkeletonShimmer
 *   width="100%"
 *   height={120}
 *   rounded="neo"
 *   neoStyle
 * />
 *
 * // Avatar placeholder
 * <SkeletonShimmer width={48} height={48} rounded="full" />
 * ```
 */
export function SkeletonShimmer({
  width = '100%',
  height = 20,
  rounded = 'md',
  baseColor,
  highlightColor,
  duration = 1.5,
  neoStyle = false,
  className,
}: SkeletonShimmerProps) {
  const { prefersReducedMotion, isLowEnd } = useDevicePerformance();

  const roundedClasses = {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    full: 'rounded-full',
    neo: 'rounded-neo',
  };

  const base = baseColor || (neoStyle ? 'rgb(40, 40, 60)' : 'rgb(55, 55, 80)');
  const highlight = highlightColor || (neoStyle ? 'rgb(60, 60, 85)' : 'rgb(75, 75, 105)');

  const style: React.CSSProperties = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
    backgroundColor: base,
  };

  // Static skeleton for reduced motion
  if (prefersReducedMotion || isLowEnd) {
    return (
      <div
        className={cn(
          roundedClasses[rounded],
          neoStyle && 'border-3 border-neo-black/30',
          className
        )}
        style={style}
        role="status"
        aria-label="Loading"
      />
    );
  }

  return (
    <div
      className={cn(
        'relative overflow-hidden',
        roundedClasses[rounded],
        neoStyle && 'border-3 border-neo-black/30 shadow-hard',
        className
      )}
      style={style}
      role="status"
      aria-label="Loading"
    >
      {/* Shimmer animation */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(90deg, ${base} 0%, ${highlight} 50%, ${base} 100%)`,
          backgroundSize: '200% 100%',
        }}
        animate={{
          backgroundPosition: ['200% 0', '-200% 0'],
        }}
        transition={{
          duration,
          repeat: Infinity,
          ease: 'linear',
        }}
      />
    </div>
  );
}

/**
 * SkeletonText - Multi-line text placeholder
 */
export function SkeletonText({
  lines = 3,
  spacing = 8,
  lastLineWidth = '70%',
  neoStyle = false,
  className,
}: {
  lines?: number;
  spacing?: number;
  lastLineWidth?: string;
  neoStyle?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('space-y-2', className)} style={{ gap: spacing }}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonShimmer
          key={i}
          width={i === lines - 1 ? lastLineWidth : '100%'}
          height={16}
          rounded="sm"
          neoStyle={neoStyle}
        />
      ))}
    </div>
  );
}

/**
 * SkeletonAvatar - Avatar placeholder
 */
export function SkeletonAvatar({
  size = 48,
  neoStyle = false,
  className,
}: {
  size?: number;
  neoStyle?: boolean;
  className?: string;
}) {
  return (
    <SkeletonShimmer
      width={size}
      height={size}
      rounded="full"
      neoStyle={neoStyle}
      className={className}
    />
  );
}

/**
 * SkeletonCard - Card placeholder with neo-brutalist styling
 */
export function SkeletonCard({
  width = '100%',
  height = 150,
  showAvatar = false,
  showTitle = true,
  showDescription = true,
  className,
}: {
  width?: string | number;
  height?: number;
  showAvatar?: boolean;
  showTitle?: boolean;
  showDescription?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'p-4 rounded-neo border-3 border-neo-black/30 bg-neo-navy/50 shadow-hard',
        className
      )}
      style={{ width: typeof width === 'number' ? `${width}px` : width }}
    >
      <div className="flex items-start gap-3">
        {showAvatar && <SkeletonAvatar size={40} />}
        <div className="flex-1 space-y-2">
          {showTitle && <SkeletonShimmer width="60%" height={20} rounded="sm" />}
          {showDescription && <SkeletonText lines={2} />}
        </div>
      </div>
    </div>
  );
}

/**
 * SkeletonButton - Button placeholder
 */
export function SkeletonButton({
  size = 'md',
  width,
  className,
}: {
  size?: 'sm' | 'md' | 'lg';
  width?: string | number;
  className?: string;
}) {
  const sizeConfig = {
    sm: { height: 32, width: width || 80 },
    md: { height: 40, width: width || 100 },
    lg: { height: 48, width: width || 120 },
  };

  const config = sizeConfig[size];

  return (
    <SkeletonShimmer
      width={config.width}
      height={config.height}
      rounded="neo"
      neoStyle
      className={className}
    />
  );
}

/**
 * SkeletonLeaderboardRow - Leaderboard row placeholder
 */
export function SkeletonLeaderboardRow({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-neo border-3 border-neo-black/20 bg-neo-navy/30',
        className
      )}
    >
      <SkeletonShimmer width={28} height={28} rounded="neo" />
      <SkeletonAvatar size={36} />
      <div className="flex-1">
        <SkeletonShimmer width="50%" height={16} rounded="sm" />
      </div>
      <SkeletonShimmer width={60} height={24} rounded="neo" neoStyle />
    </div>
  );
}

/**
 * SkeletonGrid - Grid of skeleton items
 */
export function SkeletonGrid({
  items = 6,
  columns = 3,
  itemHeight = 100,
  gap = 12,
  className,
}: {
  items?: number;
  columns?: number;
  itemHeight?: number;
  gap?: number;
  className?: string;
}) {
  return (
    <div
      className={cn('grid', className)}
      style={{
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap,
      }}
    >
      {Array.from({ length: items }).map((_, i) => (
        <SkeletonShimmer
          key={i}
          width="100%"
          height={itemHeight}
          rounded="neo"
          neoStyle
        />
      ))}
    </div>
  );
}

export default SkeletonShimmer;
