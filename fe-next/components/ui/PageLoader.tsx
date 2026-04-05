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

// Size mappings for the spinner ring
const SPINNER_SIZES = {
  sm: { ring: 'w-32 h-32', mascot: 'xs' as const },
  md: { ring: 'w-36 h-36', mascot: 'xs' as const },
  lg: { ring: 'w-44 h-44', mascot: 'sm' as const },
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
    ? 'flex-1 min-h-0 flex items-center justify-center bg-neo-navy'
    : 'flex-1 flex items-center justify-center bg-neo-navy';

  // Simple dots loader for reduced motion or low-end devices
  if (prefersReducedMotion || !enableComplexAnimations) {
    return (
      <div className={cn(containerClass, className)} data-testid="page-loader">
        <div className="flex flex-col items-center justify-center">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-neo-lime rounded-full animate-pulse" />
            <div className="w-3 h-3 bg-neo-cyan rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
            <div className="w-3 h-3 bg-neo-pink rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
          </div>
          {text && (
            <p className="text-sm mt-3 font-neo-body opacity-70">{text}</p>
          )}
        </div>
      </div>
    );
  }

  const spinnerSize = SPINNER_SIZES[size];

  return (
    <div className={cn(containerClass, className)} data-testid="page-loader">
      <div className="flex flex-col items-center justify-center gap-4">
        {/* Spinner ring with mascot inside */}
        <div className={`${spinnerSize.ring} relative`}>
          {/* Background ring */}
          <div className="absolute inset-0 rounded-full border-4 border-neo-cyan/20" />
          {/* Animated spinner ring */}
          <AdaptiveMotion.div
            className="absolute inset-0 rounded-full border-4 border-transparent border-t-neo-cyan border-r-neo-pink"
            animate={{ rotate: 360 }}
            transition={{
              duration: 1,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
          {/* Mascot centered inside the ring */}
          <div className="absolute inset-0 flex items-center justify-center">
            <Mascot
              variant={mascotVariant}
              size={spinnerSize.mascot}
              animated={true}
              priority={true}
              clipBorder="cyan"
            />
          </div>
        </div>
        {text && (
          <AdaptiveMotion.p
            className="text-sm font-neo-body text-neo-cream/70"
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
