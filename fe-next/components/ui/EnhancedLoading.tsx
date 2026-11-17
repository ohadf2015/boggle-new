'use client';

import React from 'react';
import { cn } from '@/lib/utils';

// ============================================
// Skeleton Loader
// ============================================
interface SkeletonProps {
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
  className?: string;
  animate?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'text',
  width,
  height,
  className,
  animate = true,
}) => {
  const baseStyles = 'bg-neo-cream dark:bg-neo-navy-light border-2 border-neo-black/10';

  const variantStyles = {
    text: 'rounded h-4 w-full',
    circular: 'rounded-full',
    rectangular: 'rounded-neo',
    rounded: 'rounded-lg',
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className={cn(
        baseStyles,
        variantStyles[variant],
        animate && 'animate-pulse',
        className
      )}
      style={style}
      aria-hidden="true"
    />
  );
};

// ============================================
// Skeleton Card
// ============================================
interface SkeletonCardProps {
  lines?: number;
  hasImage?: boolean;
  className?: string;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({
  lines = 3,
  hasImage = false,
  className,
}) => (
  <div
    className={cn(
      'p-6 rounded-neo-lg border-4 border-neo-black bg-neo-white dark:bg-neo-navy',
      className
    )}
    aria-label="Loading content"
  >
    {hasImage && (
      <Skeleton variant="rectangular" height={160} className="mb-4 rounded-neo" />
    )}
    <Skeleton variant="text" width="60%" height={24} className="mb-4" />
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={`line-${i}`}
          variant="text"
          width={i === lines - 1 ? '80%' : '100%'}
        />
      ))}
    </div>
  </div>
);

