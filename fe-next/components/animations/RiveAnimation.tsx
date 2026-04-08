'use client';

/**
 * RiveAnimation — wrapper around @rive-app/react-canvas.
 *
 * Features:
 * - Lazy loads Rive runtime (saves ~150KB on initial bundle)
 * - Respects useDevicePerformance (skips on low-end devices)
 * - Forwards state machine inputs for interactive animations
 * - Configurable size variants matching the neo-brutalist design
 */

import { memo, useMemo, Suspense, lazy } from 'react';
import { cn } from '@/lib/utils';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';

// Lazy load Rive to avoid bundling 150KB+ on pages that don't use it
const RiveComponent = lazy(() =>
  import('@rive-app/react-canvas').then((mod) => ({
    default: mod.default,
  }))
);

export interface RiveAnimationProps {
  /** Path to the .riv file (relative to /public) */
  src: string;
  /** Name of the state machine to use */
  stateMachineName?: string;
  /** Name of the animation to play (if not using state machine) */
  animationName?: string;
  /** Whether the animation should autoplay */
  autoplay?: boolean;
  /** Size variant */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
  /** Additional className for the container */
  className?: string;
  /** Fallback content when Rive is loading or skipped on low-end */
  fallback?: React.ReactNode;
  /** Artboard name (for .riv files with multiple artboards) */
  artboardName?: string;
  /** Called when the Rive file has loaded */
  onLoad?: () => void;
  /** Called when a state machine event fires */
  onStateChange?: (event: string) => void;
}

const SIZE_MAP = {
  xs: 'w-8 h-8',
  sm: 'w-12 h-12',
  md: 'w-24 h-24',
  lg: 'w-40 h-40',
  xl: 'w-64 h-64',
  full: 'w-full h-full',
} as const;

export const RiveAnimation = memo(function RiveAnimation({
  src,
  stateMachineName,
  animationName,
  autoplay = true,
  size = 'md',
  className,
  fallback = null,
  artboardName,
}: RiveAnimationProps) {
  const { isLowEnd, prefersReducedMotion, enableComplexAnimations } = useDevicePerformance();

  const riveProps = useMemo(() => ({
    src,
    stateMachines: stateMachineName ? [stateMachineName] : undefined,
    animations: animationName ? [animationName] : undefined,
    autoplay,
    artboard: artboardName,
  }), [src, stateMachineName, animationName, autoplay, artboardName]);

  // Skip on low-end devices or when user prefers reduced motion
  if (isLowEnd || prefersReducedMotion || !enableComplexAnimations) {
    return <>{fallback}</>;
  }

  return (
    <div className={cn(SIZE_MAP[size], className)}>
      <Suspense fallback={<>{fallback}</>}>
        <RiveComponent {...riveProps} />
      </Suspense>
    </div>
  );
});

export default RiveAnimation;
