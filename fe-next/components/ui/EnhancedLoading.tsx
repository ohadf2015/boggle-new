'use client';

import React from 'react';
import { m } from 'framer-motion';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { cn } from '@/lib/utils';

/**
 * Enhanced Loading Components - Neo-Brutalist with better UX
 * 
 * Features:
 * - Multiple loading variants (spinner, dots, pulse, progress)
 * - Context-aware loading messages
 * - Skeleton screens for content loading
 * - Reduced motion support
 */

// ============================================
// Loading Spinner
// ============================================
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'primary' | 'secondary' | 'white';
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  variant = 'default',
  className,
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
    xl: 'w-16 h-16 border-4',
  };

  const variantClasses = {
    default: 'border-neo-black/30 border-t-neo-black',
    primary: 'border-neo-lime/30 border-t-neo-lime',
    secondary: 'border-neo-pink/30 border-t-neo-pink',
    white: 'border-white/30 border-t-white',
  };

  return (
    <div
      className={cn(
        'rounded-full animate-spin',
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      role="status"
      aria-label="Loading"
    />
  );
};

// ============================================
// Loading Dots
// ============================================
interface LoadingDotsProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'primary' | 'secondary';
  className?: string;
}

export const LoadingDots: React.FC<LoadingDotsProps> = ({
  size = 'md',
  variant = 'default',
  className,
}) => {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };

  const variantClasses = {
    default: 'bg-neo-black',
    primary: 'bg-neo-lime',
    secondary: 'bg-neo-pink',
  };

  return (
    <div className={cn('flex items-center gap-1.5', className)} role="status">
      {[0, 1, 2].map((i) => (
        <AdaptiveMotion.div
          key={`dot-${i}`}
          className={cn('rounded-full', sizeClasses[size], variantClasses[variant])}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            type: 'tween',
            duration: 1,
            repeat: Infinity,
            delay: i * 0.15,
            ease: 'easeInOut',
          }}
        />
      ))}
      <span className="sr-only">Loading</span>
    </div>
  );
};

// ============================================
// Loading Pulse
// ============================================
interface LoadingPulseProps {
  className?: string;
}

export const LoadingPulse: React.FC<LoadingPulseProps> = ({ className }) => (
  <div
    className={cn(
      'relative flex items-center justify-center',
      className
    )}
    role="status"
  >
    <AdaptiveMotion.div
      className="absolute w-full h-full rounded-neo bg-neo-lime/30"
      animate={{
        scale: [1, 1.2, 1],
        opacity: [0.5, 0, 0.5],
      }}
      transition={{
        type: 'tween',
        duration: 1.5,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
    <div className="relative w-4 h-4 rounded-neo bg-neo-lime border-2 border-neo-black" />
    <span className="sr-only">Loading</span>
  </div>
);

// ============================================
// Progress Bar
// ============================================
interface ProgressBarProps {
  progress: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  variant?: 'default' | 'primary' | 'secondary' | 'gradient';
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  size = 'md',
  showLabel = false,
  variant = 'default',
  className,
}) => {
  const clampedProgress = Math.min(100, Math.max(0, progress));

  const sizeClasses = {
    sm: 'h-2',
    md: 'h-4',
    lg: 'h-6',
  };

  const variantClasses = {
    default: 'bg-neo-black',
    primary: 'bg-neo-lime',
    secondary: 'bg-neo-pink',
    gradient: 'bg-linear-to-r from-neo-pink via-neo-cyan to-neo-lime',
  };

  return (
    <div className={cn('w-full', className)}>
      <div
        className={cn(
          'w-full bg-neo-cream dark:bg-neo-navy-light rounded-full border-2 border-neo-black overflow-hidden',
          sizeClasses[size]
        )}
        role="progressbar"
        aria-valuenow={clampedProgress}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <m.div
          className={cn('h-full rounded-full', variantClasses[variant])}
          initial={{ width: 0 }}
          animate={{ width: `${clampedProgress}%` }}
          transition={{ type: 'spring', stiffness: 100, damping: 20 }}
        />
      </div>
      {showLabel && (
        <span className="text-sm font-bold text-neo-black dark:text-neo-white mt-1 block">
          {Math.round(clampedProgress)}%
        </span>
      )}
    </div>
  );
};

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

// ============================================
// Full Page Loader
// ============================================
interface FullPageLoaderProps {
  message?: string;
  subMessage?: string;
  variant?: 'default' | 'game';
  className?: string;
}

export const FullPageLoader: React.FC<FullPageLoaderProps> = ({
  message = 'Loading...',
  subMessage,
  variant = 'default',
  className,
}) => {
  if (variant === 'game') {
    return (
      <div
        className={cn(
          'fixed inset-0 z-50 flex flex-col items-center justify-center',
          'bg-neo-navy',
          className
        )}
        role="status"
        aria-live="polite"
      >
        {/* Game-themed loading animation */}
        <div className="relative mb-8">
          <AdaptiveMotion.div
            className="w-24 h-24 rounded-neo-lg bg-neo-lime border-4 border-neo-black shadow-hard-lg"
            animate={{
              rotate: [0, 90, 180, 270, 360],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-3xl font-black text-neo-black">L</span>
            </div>
          </AdaptiveMotion.div>
          {/* Orbiting letters */}
          {['E', 'X', 'I'].map((letter, i) => (
            <AdaptiveMotion.div
              key={letter}
              className="absolute w-8 h-8 rounded-neo bg-neo-pink border-2 border-neo-black flex items-center justify-center"
              style={{ top: '50%', left: '50%', marginTop: -16, marginLeft: -16 }}
              animate={{
                x: [0, Math.cos((i * Math.PI * 2) / 3) * 60, 0],
                y: [0, Math.sin((i * Math.PI * 2) / 3) * 60, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.2,
                ease: 'easeInOut',
              }}
            >
              <span className="text-sm font-black text-neo-black">{letter}</span>
            </AdaptiveMotion.div>
          ))}
        </div>

        <AdaptiveMotion.h2
          className="text-2xl font-black text-neo-white mb-2"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          {message}
        </AdaptiveMotion.h2>
        {subMessage && (
          <p className="text-neo-white font-medium">{subMessage}</p>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex flex-col items-center justify-center',
        'bg-neo-cream dark:bg-neo-navy',
        className
      )}
      role="status"
      aria-live="polite"
    >
      <LoadingSpinner size="xl" variant="primary" />
      <AdaptiveMotion.p
        className="mt-6 text-xl font-black text-neo-black dark:text-neo-white"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        {message}
      </AdaptiveMotion.p>
      {subMessage && (
        <p className="text-neo-black/60 dark:text-neo-white font-medium mt-2">
          {subMessage}
        </p>
      )}
    </div>
  );
};

// ============================================
// Inline Loader
// ============================================
interface InlineLoaderProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const InlineLoader: React.FC<InlineLoaderProps> = ({
  message = 'Loading...',
  size = 'md',
  className,
}) => (
  <div className={cn('flex items-center gap-3', className)} role="status">
    <LoadingSpinner size={size} />
    <span className="font-bold text-neo-black dark:text-neo-white">{message}</span>
  </div>
);

// ============================================
// Button Loader
// ============================================
interface ButtonLoaderProps {
  loadingText?: string;
  className?: string;
}

export const ButtonLoader: React.FC<ButtonLoaderProps> = ({
  loadingText = 'Loading...',
  className,
}) => (
  <div className={cn('flex items-center gap-2', className)}>
    <LoadingSpinner size="sm" variant="white" />
    <span>{loadingText}</span>
  </div>
);
