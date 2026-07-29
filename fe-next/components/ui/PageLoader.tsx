'use client';

import { memo } from 'react';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { Mascot, type MascotVariant } from './Mascot';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';
import { cn } from '@/lib/utils';

interface PageLoaderProps {
  /** Size of the loader */
  size?: 'sm' | 'md' | 'lg';
  /** Optional text to display below the loader */
  text?: string;
  /** Mascot variant to display */
  mascotVariant?: MascotVariant;
  /**
   * When true, uses min-h-0 for nested flex contexts.
   * Both nested=true and nested=false now use flex-1 to fill parent space.
   */
  nested?: boolean;
  /** Optional className for the wrapper */
  className?: string;
}

const MASCOT_SIZES = {
  sm: 'xs' as const,
  md: 'xs' as const,
  lg: 'sm' as const,
};

/**
 * Full-page loader component for page transitions and loading states.
 * Features a mascot inside a spinning ring with Neo-Brutalist styling.
 *
 * @example
 * // In a loading.tsx file:
 * export default function Loading() {
 *   return <PageLoader />;
 * }
 *
 * @example
 * // With custom text:
 * <PageLoader text="Loading profile..." mascotVariant="thinking" />
 */
export const PageLoader = memo(function PageLoader({
  size = 'lg',
  text,
  mascotVariant = 'happy',
  nested = false,
  className,
}: PageLoaderProps) {
  const { prefersReducedMotion, enableComplexAnimations } = useDevicePerformance();

  const containerClass = nested
    ? 'flex-1 min-h-0 flex items-center justify-center'
    : 'flex-1 flex items-center justify-center bg-neo-navy';

  // Simple dots loader for reduced motion or low-end devices
  if (prefersReducedMotion || !enableComplexAnimations) {
    return (
      <div className={cn(containerClass, className)} data-testid="page-loader">
        <div className="flex flex-col items-center justify-center">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-neo-cream/70 rounded-full animate-pulse" />
            <div className="w-3 h-3 bg-neo-cream/70 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
            <div className="w-3 h-3 bg-neo-cream/70 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
          </div>
          {text && (
            <p className="text-sm mt-3 font-neo-body opacity-70">{text}</p>
          )}
        </div>
      </div>
    );
  }

  const mascotSize = MASCOT_SIZES[size];

  return (
    <div className={cn(containerClass, className)} data-testid="page-loader">
      <div className="flex flex-col items-center justify-center gap-4">
        <AdaptiveMotion.div
          animate={{ opacity: [0.7, 1, 0.7], scale: [0.98, 1.02, 0.98] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Mascot
            variant={mascotVariant}
            size={mascotSize}
            animated={true}
            priority={true}
            clipShape="none"
            clipBorder="none"
          />
        </AdaptiveMotion.div>
        {text && (
          <AdaptiveMotion.p
            className="text-sm font-neo-body text-neo-white"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            {text}
          </AdaptiveMotion.p>
        )}
      </div>
    </div>
  );
});

export default PageLoader;
