/**
 * PhaseIndicator Component
 *
 * Displays the current boss battle phase as a badge (PHASE 1, PHASE 2, or ENRAGED).
 * Uses neo-brutalist styling with phase-appropriate colors and animations.
 *
 * Features:
 * - Phase 1: Cyan badge (normal combat)
 * - Phase 2: Lime badge (escalated mechanics)
 * - Enraged: Red badge with shake animation (maximum intensity)
 * - Respects reduced motion preferences
 */

'use client';

import { memo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

// ==============================================
// TYPES
// ==============================================

export interface PhaseIndicatorProps {
  /** Current boss phase (phase1, phase2, or enraged) */
  phase: 'phase1' | 'phase2' | 'enraged';
}

// ==============================================
// PHASE CONFIGURATION
// ==============================================

interface PhaseConfig {
  /** Translation key for phase label */
  labelKey: string;
  /** Background color class */
  bgColor: string;
  /** Text color class */
  textColor: string;
  /** Animation class (empty for non-animated phases) */
  animation: string;
  /** Aria label for accessibility */
  ariaLabel: string;
}

const PHASE_CONFIGS: Record<'phase1' | 'phase2' | 'enraged', PhaseConfig> = {
  phase1: {
    labelKey: 'adventure.bosses.phases.phase1',
    bgColor: 'bg-neo-cyan',
    textColor: 'text-neo-black',
    animation: '',
    ariaLabel: 'Phase 1',
  },
  phase2: {
    labelKey: 'adventure.bosses.phases.phase2',
    bgColor: 'bg-neo-lime',
    textColor: 'text-neo-black',
    animation: '',
    ariaLabel: 'Phase 2',
  },
  enraged: {
    labelKey: 'adventure.bosses.enraged',
    bgColor: 'bg-neo-red',
    textColor: 'text-neo-white',
    animation: 'animate-neo-shake motion-reduce:animate-none',
    ariaLabel: 'Enraged',
  },
};

// ==============================================
// COMPONENT
// ==============================================

/**
 * PhaseIndicator - Badge showing current boss battle phase
 */
const PhaseIndicator = memo<PhaseIndicatorProps>(({ phase }) => {
  const { t } = useLanguage();
  const config = PHASE_CONFIGS[phase];

  return (
    <div
      role="status"
      aria-label={`Boss ${config.ariaLabel}`}
      className={`
        inline-flex items-center justify-center
        px-3 py-1
        ${config.bgColor}
        ${config.textColor}
        border-3 border-neo-black
        rounded-neo
        shadow-hard-sm
        ${config.animation}
      `.trim().replace(/\s+/g, ' ')}
    >
      <span className="font-neo-display text-sm font-bold uppercase tracking-wide">
        {t(config.labelKey)}
      </span>
    </div>
  );
});

PhaseIndicator.displayName = 'PhaseIndicator';

export default PhaseIndicator;
