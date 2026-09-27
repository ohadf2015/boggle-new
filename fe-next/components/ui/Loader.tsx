'use client';

import { memo } from 'react';
import { cn } from '@/lib/utils';

interface LoaderProps {
  /** Size of the loader dots */
  size?: 'sm' | 'md' | 'lg';
  /** Optional text to display */
  text?: string;
  /** Optional className */
  className?: string;
}

const SIZE_CLASSES = {
  sm: 'w-2 h-2',
  md: 'w-3 h-3',
  lg: 'w-4 h-4',
};

const GAP_CLASSES = {
  sm: 'gap-1',
  md: 'gap-1.5',
  lg: 'gap-2',
};

const TEXT_CLASSES = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
};

/**
 * Simple inline loader with animated dots.
 * Neo-Brutalist styling with lime/cyan/pink colors.
 *
 * @example
 * // Simple usage
 * <Loader size="sm" />
 *
 * @example
 * // With text
 * <Loader size="md" text="Loading..." />
 */
export const Loader = memo(function Loader({
  size = 'md',
  text,
  className,
}: LoaderProps) {
  const dotSize = SIZE_CLASSES[size];
  const gap = GAP_CLASSES[size];

  return (
    <div className={cn('flex flex-col items-center justify-center', className)}>
      <div className={cn('flex items-center', gap)}>
        <div
          className={cn(dotSize, 'bg-neo-lime rounded-full animate-bounce')}
          style={{ animationDelay: '0ms', animationDuration: '0.6s' }}
        />
        <div
          className={cn(dotSize, 'bg-neo-cyan rounded-full animate-bounce')}
          style={{ animationDelay: '150ms', animationDuration: '0.6s' }}
        />
        <div
          className={cn(dotSize, 'bg-neo-pink rounded-full animate-bounce')}
          style={{ animationDelay: '300ms', animationDuration: '0.6s' }}
        />
      </div>
      {text && (
        <p className={cn(
          'font-neo-body text-neo-white mt-2',
          TEXT_CLASSES[size]
        )}>
          {text}
        </p>
      )}
    </div>
  );
});
