'use client';

import { memo } from 'react';
import InteractiveMascot, {
  type ExtendedMascotVariant,
  type ActivityVariant,
  type InteractiveMascotProps,
} from './InteractiveMascot';
import { useRandomMascotActivity, DEFAULT_IDLE_ACTIVITIES } from '@/hooks/useRandomMascotActivity';

interface IdleMascotProps extends Omit<InteractiveMascotProps, 'variant'> {
  /** Base variant when not doing activities */
  baseVariant: ExtendedMascotVariant;
  /** List of activities to randomly choose from (defaults to all fun activities) */
  activities?: ActivityVariant[];
  /** Min interval between activities in ms (default: 10000 = 10s) */
  minInterval?: number;
  /** Max interval between activities in ms (default: 30000 = 30s) */
  maxInterval?: number;
  /** How long to show activity before returning to base in ms (default: 4000 = 4s) */
  activityDuration?: number;
  /** Whether to enable random activities (default: true) */
  enableIdleActivities?: boolean;
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
  activities = DEFAULT_IDLE_ACTIVITIES,
  minInterval = 10000,
  maxInterval = 30000,
  activityDuration = 4000,
  enableIdleActivities = true,
  onClick,
  ...interactiveMascotProps
}: IdleMascotProps) {
  const { currentVariant, triggerActivity } = useRandomMascotActivity({
    baseVariant,
    activities,
    minInterval,
    maxInterval,
    activityDuration,
    enabled: enableIdleActivities,
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

export default IdleMascot;
