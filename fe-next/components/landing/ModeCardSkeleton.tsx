'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

interface ModeCardSkeletonProps {
  /** Color variant - matches ModeCard variants */
  variant: 'cyan' | 'pink' | 'purple' | 'orange' | 'lime';
  /** Secondary cards are smaller and less prominent */
  secondary?: boolean;
  /** Additional className */
  className?: string;
}

/**
 * ModeCardSkeleton - Loading placeholder that matches ModeCard shape and layout
 * Used in Suspense fallbacks to prevent layout shift during loading
 */
export const ModeCardSkeleton: React.FC<ModeCardSkeletonProps> = ({
  variant,
  secondary = false,
  className,
}) => {
  const { dir } = useLanguage();
  const isRTL = dir === 'rtl';

  // Simplified solid colors for better performance (no gradients)
  const variantStyles = {
    cyan: 'bg-neo-cyan',
    pink: 'bg-neo-pink',
    purple: 'bg-neo-purple',
    orange: 'bg-neo-orange',
    lime: 'bg-neo-lime',
  };

  return (
    <div
      data-testid="mode-card-skeleton"
      aria-hidden="true"
      className={cn(
        'rounded-neo-lg border-neo-black',
        secondary ? 'border-2 shadow-hard' : 'border-3 shadow-hard-lg',
        'h-full relative overflow-hidden',
        // Remove animate-pulse - causes constant repaints
        variantStyles[variant],
        className
      )}
      style={{
        padding: secondary ? 'clamp(0.5rem, 3cqw, 1rem)' : 'clamp(0.75rem, 4cqw, 1.5rem)',
      }}
    >
      {/* Header with icon, title, and arrow placeholders */}
      <div
        className={cn('flex items-center', secondary ? 'gap-2' : 'gap-2 sm:gap-3 lg:gap-4')}
        style={{ marginBottom: secondary ? 'clamp(0.125rem, 1cqw, 0.5rem)' : 'clamp(0.25rem, 1.5cqw, 0.75rem)' }}
      >
        {/* Icon placeholder */}
        <div
          data-testid="skeleton-icon"
          className={cn(
            'rounded-neo border-neo-black bg-neo-navy shrink-0',
            secondary ? 'border shadow-hard-xs' : 'border-2 shadow-hard-sm'
          )}
          style={{
            width: secondary ? 'clamp(1.5rem, 8cqw, 2.5rem)' : 'clamp(2rem, 10cqw, 3.5rem)',
            height: secondary ? 'clamp(1.5rem, 8cqw, 2.5rem)' : 'clamp(2rem, 10cqw, 3.5rem)',
          }}
        />

        {/* Title placeholder */}
        <div
          data-testid="skeleton-title"
          className="bg-neo-black/20 rounded flex-1"
          style={{
            height: secondary ? 'clamp(1rem, 4cqw, 1.25rem)' : 'clamp(1.25rem, 5cqw, 1.75rem)',
            maxWidth: '60%',
          }}
        />

        {/* Arrow placeholder - matches WCAG 44x44px touch target */}
        <div
          data-testid="skeleton-arrow"
          className={cn(
            'min-w-[44px] min-h-[44px]',
            'rounded-full border-neo-black bg-neo-navy shrink-0',
            secondary ? 'border' : 'border-2'
          )}
          style={{
            width: secondary ? 'clamp(2.75rem, 6cqw, 3.25rem)' : 'clamp(2.75rem, 8cqw, 3.25rem)',
            height: secondary ? 'clamp(2.75rem, 6cqw, 3.25rem)' : 'clamp(2.75rem, 8cqw, 3.25rem)',
          }}
        />
      </div>

      {/* Description placeholder - only for primary cards */}
      {!secondary && (
        <div
          data-testid="skeleton-description"
          className="bg-neo-black/15 rounded"
          style={{
            height: 'clamp(0.75rem, 3cqw, 1rem)',
            width: '80%',
            marginBottom: 'clamp(0.375rem, 2cqw, 1rem)',
          }}
        />
      )}
    </div>
  );
};

export default ModeCardSkeleton;
