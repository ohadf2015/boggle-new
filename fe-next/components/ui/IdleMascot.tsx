'use client';

import { memo } from 'react';
import { m } from 'framer-motion';
import InteractiveMascot, {
  type ExtendedMascotVariant,
  type ActivityVariant,
  type InteractiveMascotProps,
} from './InteractiveMascot';
import type { MascotVariant } from './Mascot';
import { useRandomMascotActivity, DEFAULT_IDLE_ACTIVITIES, DEFAULT_BASE_VARIANTS } from '@/hooks/useRandomMascotActivity';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';

/**
 * NOTE: IdleMascot uses GIF-ONLY architecture
 * ALL mascot variants are now animated GIFs (main-nobg.gif, play-nobg.gif, study-nobg.gif, oops-nobg.gif)
 * Extended variants (activities, moods) automatically map to one of the 4 base GIF variants
 * via getBaseVariant() in InteractiveMascot.tsx
 */

interface IdleMascotProps extends Omit<InteractiveMascotProps, 'variant'> {
  /** Base variant when not doing activities */
  baseVariant: ExtendedMascotVariant;
  /** Additional base variants to cycle through for variety */
  baseVariants?: MascotVariant[];
  /** List of activities to randomly choose from (defaults to all fun activities) */
  activities?: ActivityVariant[];
  /** Min delay before first activity in ms (default: 8000 = 8s) */
  initialDelayMin?: number;
  /** Max delay before first activity in ms (default: 15000 = 15s) */
  initialDelayMax?: number;
  /** Min interval between subsequent activities in ms (default: 45000 = 45s) */
  minInterval?: number;
  /** Max interval between subsequent activities in ms (default: 90000 = 90s) */
  maxInterval?: number;
  /** How long to show activity before returning to base in ms (default: 4000 = 4s) */
  activityDuration?: number;
  /** Whether to enable random activities (default: true) */
  enableIdleActivities?: boolean;
  /** Enable cycling through different base variants (default: true for maximum variety) */
  cycleBaseVariants?: boolean;
}

/**
 * IdleMascot - InteractiveMascot with automatic random activity animations
 *
 * Periodically shows fun activities (eating pizza, playing ball, etc.) during idle time,
 * then returns to the base variant. Perfect for adding personality to waiting states,
 * loading screens, or static mascot displays.
 *
 * @example
 * ```tsx
 * // Basic usage with default activities
 * <IdleMascot baseVariant="happy" size="lg" />
 *
 * // Custom activities and timing
 * <IdleMascot
 *   baseVariant="thinking"
 *   activities={['eating_pizza', 'gaming', 'dancing']}
 *   minInterval={15000}
 *   maxInterval={45000}
 *   activityDuration={5000}
 *   size="xl"
 * />
 *
 * // Interactive with click to trigger activity
 * <IdleMascot
 *   baseVariant="encouraging"
 *   enableHover
 *   enableClick
 *   onClick={() => console.log('Mascot clicked!')}
 * />
 * ```
 */
export const IdleMascot = memo(function IdleMascot({
  baseVariant,
  baseVariants = DEFAULT_BASE_VARIANTS,
  activities = DEFAULT_IDLE_ACTIVITIES,
  initialDelayMin = 8000,
  initialDelayMax = 15000,
  minInterval = 45000,
  maxInterval = 90000,
  activityDuration = 4000,
  enableIdleActivities = true,
  cycleBaseVariants = true,
  onClick,
  ...interactiveMascotProps
}: IdleMascotProps) {
  const { currentVariant, triggerActivity } = useRandomMascotActivity({
    baseVariant,
    baseVariants,
    activities,
    initialDelayMin,
    initialDelayMax,
    minInterval,
    maxInterval,
    activityDuration,
    enabled: enableIdleActivities,
    cycleBaseVariants,
  });

  const handleClick = () => {
    // Trigger both the activity and any custom onClick handler
    triggerActivity();
    onClick?.();
  };

  return (
    <InteractiveMascot
      variant={currentVariant}
      onClick={handleClick}
      {...interactiveMascotProps}
    />
  );
});

/**
 * IdleMascotWithEntrance - IdleMascot with spring entrance animation
 *
 * Same as IdleMascot but with a nice pop-in effect on mount.
 * Perfect for landing pages and sections where the mascot should appear with flair.
 */
export const IdleMascotWithEntrance = memo(function IdleMascotWithEntrance({
  delay = 0,
  ...props
}: IdleMascotProps & { delay?: number }) {
  const { prefersReducedMotion, enableComplexAnimations } = useDevicePerformance();
  const shouldAnimate = !prefersReducedMotion && enableComplexAnimations;

  return (
    <m.div
      // Slide-only entrance (no opacity:0). Framer renders `initial` into the SSR
      // HTML, and an opacity:0 start makes the element non-contentful until JS
      // hydrates + animates it — which gates LCP (this mascot is the landing's
      // LCP element). Animating transform-only lets it paint at full opacity on
      // first paint (pre-hydration) while keeping the spring pop-in.
      initial={shouldAnimate ? { y: 12 } : undefined}
      animate={{ y: 0 }}
      transition={{
        type: 'spring',
        stiffness: 260,
        damping: 20,
        delay,
      }}
    >
      <IdleMascot {...props} />
    </m.div>
  );
});

export default IdleMascot;
