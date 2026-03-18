/**
 * ComboMilestoneOverlay Component
 *
 * Full-screen overlay for combo milestone celebrations.
 * Displays giant animated text (INCREDIBLE!/UNSTOPPABLE!/LEGENDARY!).
 * Uses Framer Motion for entrance/exit animations.
 */

'use client';

import { memo } from 'react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { useLanguage } from '@/contexts/LanguageContext';

// ==============================================
// TYPES
// ==============================================

/**
 * Combo milestone configuration
 * (Defined here until useComboMilestone hook is created in 32-02)
 */
export interface ComboMilestoneConfig {
  threshold: number;
  labelKey: string;
  duration: number;
  particleBudget: number;
}

export interface ComboMilestoneOverlayProps {
  /** Current active milestone (or null) */
  milestone: ComboMilestoneConfig | null;
}

// ==============================================
// ANIMATION VARIANTS
// ==============================================

const overlayVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

const textVariants = {
  initial: {
    scale: 0.5,
    opacity: 0,
    rotate: -10,
  },
  animate: {
    scale: 1,
    opacity: 1,
    rotate: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 300,
      damping: 15,
    },
  },
  exit: {
    scale: 1.5,
    opacity: 0,
    transition: {
      duration: 0.3,
    },
  },
};

// ==============================================
// COMPONENT
// ==============================================

/**
 * Full-screen combo milestone overlay
 *
 * @example
 * ```tsx
 * const { currentMilestone } = useComboMilestone();
 * <ComboMilestoneOverlay milestone={currentMilestone} />
 * ```
 */
export const ComboMilestoneOverlay = memo(function ComboMilestoneOverlay({
  milestone,
}: ComboMilestoneOverlayProps) {
  const { t } = useLanguage();

  return (
    <AdaptiveAnimatePresence>
      {milestone && (
        <AdaptiveMotion.div
          key={milestone.threshold}
          className="fixed inset-0 z-40 pointer-events-none flex items-center justify-center"
          variants={overlayVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          data-testid="combo-milestone-overlay"
        >
          {/* Giant milestone text */}
          <AdaptiveMotion.div
            className="
              font-neo-display text-neo-yellow
              text-6xl sm:text-7xl md:text-8xl lg:text-9xl
              font-black uppercase tracking-tight
              drop-shadow-[4px_4px_0px_rgba(0,0,0,1)]
              select-none
            "
            variants={textVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            {t(milestone.labelKey)}
          </AdaptiveMotion.div>
        </AdaptiveMotion.div>
      )}
    </AdaptiveAnimatePresence>
  );
});

ComboMilestoneOverlay.displayName = 'ComboMilestoneOverlay';

export default ComboMilestoneOverlay;
