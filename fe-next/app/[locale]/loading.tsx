'use client';

import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Loading skeleton for the landing page
 * Matches the exact shape and layout of LandingView for seamless transitions
 */
export default function Loading() {
  return (
    <div className="flex-1 flex flex-col bg-gray-100 dark:bg-neo-navy relative page-content-safe h-full">
      {/* Header skeleton */}
      <header className="w-full h-14 sm:h-16 bg-neo-navy/50 border-b-2 border-neo-black animate-pulse" />

      {/* Main content skeleton */}
      <main className="w-full max-w-7xl mx-auto overflow-x-hidden relative z-20 flex-1 flex flex-col justify-center px-2 sm:px-3 lg:px-6 xl:px-8 py-2 sm:py-3 lg:py-4">
        {/* Hero section skeleton - hidden on mobile */}
        <div className="text-center mb-4 sm:mb-6 lg:mb-8 hidden sm:block animate-pulse">
          {/* Mascot placeholder */}
          <div className="w-24 h-24 sm:w-28 sm:h-28 lg:w-36 lg:h-36 mx-auto mb-2 bg-neo-navy/30 rounded-full" />

          {/* Title placeholder */}
          <div className="h-8 sm:h-10 lg:h-12 w-48 sm:w-56 lg:w-64 mx-auto mb-2 bg-neo-navy/20 rounded-neo" />

          {/* Subtitle placeholder */}
          <div className="h-5 sm:h-6 w-36 sm:w-44 mx-auto bg-neo-navy/15 rounded" />
        </div>

        {/* Cards wrapper skeleton */}
        <div className="flex items-center gap-2 sm:gap-4 justify-center min-h-0 flex-1">
          <div className="w-full flex flex-col items-center justify-center animate-fade-in-fast">
            <div className="w-full max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 lg:gap-5 justify-items-center">
              {/* Daily Challenge Banner skeleton - spans full width */}
              <div className="col-span-1 sm:col-span-2 w-full">
                <div
                  className="w-full p-3 sm:p-4 rounded-neo border-3 border-neo-black shadow-hard-lg bg-gradient-to-br from-yellow-300 via-amber-400 to-orange-500 animate-pulse"
                  style={{ minHeight: '72px' }}
                >
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-neo bg-neo-navy shrink-0" />
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="h-6 w-40 bg-neo-black/15 rounded" />
                      <div className="h-4 w-28 bg-neo-black/10 rounded" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Primary cards - Multiplayer (pink) and Single Player (cyan) */}
              <ModeCardSkeleton variant="pink" />
              <ModeCardSkeleton variant="cyan" />

              {/* Secondary cards - Adventure (lime) and Brain Training (purple) */}
              <ModeCardSkeleton variant="lime" secondary />
              <ModeCardSkeleton variant="purple" secondary />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

/**
 * Mode card skeleton that matches the exact shape of ModeCard
 */
function ModeCardSkeleton({
  variant,
  secondary = false,
}: {
  variant: 'cyan' | 'pink' | 'purple' | 'lime';
  secondary?: boolean;
}) {
  const variantStyles = {
    cyan: 'bg-gradient-to-br from-neo-cyan via-cyan-400 to-neo-cyan-dark',
    pink: 'bg-gradient-to-br from-neo-pink via-pink-400 to-neo-pink-dark',
    purple: 'bg-gradient-to-br from-neo-purple via-purple-400 to-neo-purple-dark',
    lime: 'bg-gradient-to-br from-neo-lime via-lime-400 to-neo-lime-dark',
  };

  return (
    <div
      aria-hidden="true"
      className={cn(
        'w-full rounded-neo-lg border-neo-black animate-pulse',
        secondary ? 'border-2 shadow-hard' : 'border-3 shadow-hard-lg',
        'h-full relative overflow-hidden',
        variantStyles[variant]
      )}
      style={{
        padding: secondary ? 'clamp(0.5rem, 3cqw, 1rem)' : 'clamp(0.75rem, 4cqw, 1.5rem)',
        minHeight: secondary ? '80px' : '100px',
      }}
    >
      {/* Header with icon, title, and arrow placeholders */}
      <div
        className={cn('flex items-center', secondary ? 'gap-2' : 'gap-2 sm:gap-3 lg:gap-4')}
        style={{ marginBottom: secondary ? '0.25rem' : '0.5rem' }}
      >
        {/* Icon placeholder */}
        <div
          className={cn(
            'rounded-neo border-neo-black bg-neo-navy shrink-0',
            secondary ? 'border shadow-hard-xs' : 'border-2 shadow-hard-sm',
            secondary ? 'w-8 h-8 sm:w-10 sm:h-10' : 'w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14'
          )}
        />

        {/* Title placeholder */}
        <div
          className={cn(
            'bg-neo-black/20 rounded flex-1',
            secondary ? 'h-4 sm:h-5' : 'h-5 sm:h-6 lg:h-7'
          )}
          style={{ maxWidth: '60%' }}
        />

        {/* Arrow placeholder */}
        <div
          className={cn(
            'min-w-[40px] min-h-[40px] sm:min-w-[44px] sm:min-h-[44px]',
            'rounded-full border-neo-black bg-neo-navy shrink-0',
            secondary ? 'border' : 'border-2',
            secondary ? 'w-10 h-10' : 'w-11 h-11 sm:w-12 sm:h-12'
          )}
        />
      </div>

      {/* Description placeholder - only for primary cards */}
      {!secondary && (
        <div
          className="bg-neo-black/15 rounded"
          style={{
            height: 'clamp(0.75rem, 3cqw, 1rem)',
            width: '80%',
          }}
        />
      )}
    </div>
  );
}
