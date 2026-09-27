'use client';

import { memo } from 'react';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { cn } from '@/lib/utils';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';

/**
 * NeoSkeleton - Animated loading placeholder with neo-brutalist styling
 *
 * Features:
 * - Smooth shimmer animation using Framer Motion
 * - Performance-adaptive (simplified on low-end devices)
 * - Neo-brutalist styling with hard shadows and chunky borders
 * - Multiple shape presets
 */

interface NeoSkeletonProps {
  /** Width of the skeleton (CSS value or number for pixels) */
  width?: string | number;
  /** Height of the skeleton (CSS value or number for pixels) */
  height?: string | number;
  /** Shape variant */
  variant?: 'default' | 'circular' | 'text' | 'tile';
  /** Show neo-brutalist border and shadow */
  bordered?: boolean;
  /** Additional className */
  className?: string;
}

export const NeoSkeleton = memo(function NeoSkeleton({
  width = '100%',
  height = 20,
  variant = 'default',
  bordered = false,
  className,
}: NeoSkeletonProps) {
  const { prefersReducedMotion, isLowEnd } = useDevicePerformance();

  const style = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  };

  const variantClasses = {
    default: 'rounded-neo',
    circular: 'rounded-full',
    text: 'rounded-sm',
    tile: 'rounded-neo',
  };

  const baseClasses = cn(
    'bg-neo-navy-light relative overflow-hidden',
    variantClasses[variant],
    bordered && 'border-2 border-neo-black/30 shadow-hard-sm',
    className
  );

  // Static skeleton for reduced motion or low-end devices
  if (prefersReducedMotion || isLowEnd) {
    return (
      <div
        className={baseClasses}
        style={style}
        role="status"
        aria-label="Loading"
        aria-busy="true"
      />
    );
  }

  return (
    <div
      className={baseClasses}
      style={style}
      role="status"
      aria-label="Loading"
      aria-busy="true"
    >
      <AdaptiveMotion.div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(90deg, transparent 0%, rgba(255, 225, 53, 0.08) 50%, transparent 100%)`,
        }}
        animate={{
          x: ['-100%', '100%'],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'linear',
        }}
      />
    </div>
  );
});

/**
 * NeoSkeletonText - Multiple lines of skeleton text
 */
export const NeoSkeletonText = memo(function NeoSkeletonText({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div
      className={cn('space-y-2', className)}
      aria-busy="true"
      aria-live="polite"
    >
      {Array.from({ length: lines }).map((_, i) => (
        <NeoSkeleton
          key={`text-line-${i}`}
          variant="text"
          height={16}
          width={i === lines - 1 ? '75%' : '100%'}
        />
      ))}
    </div>
  );
});

/**
 * NeoSkeletonAvatar - Circular avatar placeholder
 */
export const NeoSkeletonAvatar = memo(function NeoSkeletonAvatar({
  size = 48,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <NeoSkeleton
      width={size}
      height={size}
      variant="circular"
      className={className}
    />
  );
});

/**
 * NeoSkeletonCard - Card-shaped skeleton with neo-brutalist styling
 */
export const NeoSkeletonCard = memo(function NeoSkeletonCard({
  showAvatar = true,
  showTitle = true,
  showDescription = true,
  className,
}: {
  showAvatar?: boolean;
  showTitle?: boolean;
  showDescription?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex items-start gap-4 p-4 rounded-neo border-3 border-neo-black/30 bg-neo-navy-light shadow-hard',
        className
      )}
      aria-busy="true"
      aria-live="polite"
    >
      {showAvatar && <NeoSkeletonAvatar size={40} />}
      <div className="flex-1 space-y-2">
        {showTitle && <NeoSkeleton height={20} width="60%" />}
        {showDescription && <NeoSkeletonText lines={2} />}
      </div>
    </div>
  );
});

/**
 * NeoSkeletonTile - Game tile placeholder (for letter grids)
 */
export const NeoSkeletonTile = memo(function NeoSkeletonTile({
  size = 48,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <NeoSkeleton
      width={size}
      height={size}
      variant="tile"
      bordered
      className={className}
    />
  );
});

/**
 * NeoSkeletonLeaderboardRow - Leaderboard entry placeholder
 */
export const NeoSkeletonLeaderboardRow = memo(function NeoSkeletonLeaderboardRow({
  className,
}: {
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-neo border-3 border-neo-black/20 bg-neo-navy/30',
        className
      )}
      aria-busy="true"
      aria-live="polite"
    >
      {/* Rank */}
      <NeoSkeleton width={28} height={28} variant="tile" bordered />
      {/* Avatar */}
      <NeoSkeletonAvatar size={36} />
      {/* Name */}
      <div className="flex-1">
        <NeoSkeleton width="50%" height={16} />
      </div>
      {/* Score */}
      <NeoSkeleton width={60} height={24} bordered />
    </div>
  );
});

/**
 * NeoSkeletonLeaderboard - Full leaderboard placeholder
 */
export const NeoSkeletonLeaderboard = memo(function NeoSkeletonLeaderboard({
  rows = 5,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div
      className={cn('space-y-2', className)}
      aria-busy="true"
      aria-label="Loading leaderboard"
    >
      {Array.from({ length: rows }).map((_, i) => (
        <NeoSkeletonLeaderboardRow key={`lb-row-${i}`} />
      ))}
    </div>
  );
});

/**
 * NeoSkeletonWordList - Word chips placeholder
 */
export const NeoSkeletonWordList = memo(function NeoSkeletonWordList({
  items = 8,
  className,
}: {
  items?: number;
  className?: string;
}) {
  // Pre-computed widths for natural appearance
  const widths = Array.from({ length: items }).map((_, i) => 60 + ((i * 17) % 40));

  return (
    <div
      className={cn('flex flex-wrap gap-2', className)}
      aria-busy="true"
      aria-label="Loading words"
    >
      {widths.map((width, i) => (
        <NeoSkeleton key={`word-${i}`} width={width} height={32} bordered />
      ))}
    </div>
  );
});

/**
 * NeoSkeletonGrid - Grid of skeleton items
 */
export const NeoSkeletonGrid = memo(function NeoSkeletonGrid({
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
      aria-busy="true"
    >
      {Array.from({ length: items }).map((_, i) => (
        <NeoSkeleton key={`grid-item-${i}`} width="100%" height={itemHeight} bordered />
      ))}
    </div>
  );
});

/**
 * NeoSkeletonButton - Button placeholder
 */
export const NeoSkeletonButton = memo(function NeoSkeletonButton({
  size = 'md',
  width,
  className,
}: {
  size?: 'sm' | 'md' | 'lg';
  width?: string | number;
  className?: string;
}) {
  const sizeConfig = {
    sm: { height: 32, defaultWidth: 80 },
    md: { height: 40, defaultWidth: 100 },
    lg: { height: 48, defaultWidth: 120 },
  };

  const config = sizeConfig[size];

  return (
    <NeoSkeleton
      width={width || config.defaultWidth}
      height={config.height}
      bordered
      className={className}
    />
  );
});

// Legacy exports for backwards compatibility (deprecated - use Neo* versions)
export const Skeleton = NeoSkeleton;
export const SkeletonText = NeoSkeletonText;
export const SkeletonCard = NeoSkeletonCard;
export const LeaderboardSkeleton = NeoSkeletonLeaderboard;
export const WordListSkeleton = NeoSkeletonWordList;

export default NeoSkeleton;
