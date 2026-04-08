/**
 * PhaseIndicator Component
 *
 * Displays the current boss battle phase as a badge (PHASE 1, PHASE 2, or ENRAGED).
 * Uses neo-brutalist styling with phase-appropriate colors and animations.
 *
 * Features:
 * - Phase 1: Cyan badge with Shield icon
 * - Phase 2: Lime badge with Flame icon
 * - Enraged: Larger red badge with Skull icon, shake + scale pulse animation
 * - Respects reduced motion preferences
 */

'use client';

import { memo } from 'react';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { Shield, Flame, Skull } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useBossFightTheme } from '@/contexts/AdventureThemeContext';

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
  labelKey: string;
  bgColor: string;
  textColor: string;
  /** Static Tailwind animation class (shake, etc.) — empty for non-animated */
  animation: string;
  ariaLabel: string;
  Icon: React.ElementType;
  /** Extra padding for enraged badge */
  paddingClass: string;
}

const PHASE_CONFIGS: Record<'phase1' | 'phase2' | 'enraged', PhaseConfig> = {
  phase1: {
    labelKey: 'adventure.bosses.phases.phase1',
    bgColor: 'bg-neo-cyan',
    textColor: 'text-neo-black',
    animation: '',
    ariaLabel: 'Phase 1',
    Icon: Shield,
    paddingClass: 'px-3 py-1',
  },
  phase2: {
    labelKey: 'adventure.bosses.phases.phase2',
    bgColor: 'bg-neo-lime',
    textColor: 'text-neo-black',
    animation: '',
    ariaLabel: 'Phase 2',
    Icon: Flame,
    paddingClass: 'px-3 py-1',
  },
  enraged: {
    labelKey: 'adventure.bosses.enraged',
    bgColor: 'bg-neo-red',
    textColor: 'text-neo-white',
    animation: 'animate-neo-shake motion-reduce:animate-none',
    ariaLabel: 'Enraged',
    Icon: Skull,
    paddingClass: 'px-4 py-1.5',
  },
};

// ==============================================
// COMPONENT
// ==============================================

const PhaseIndicator = memo<PhaseIndicatorProps>(({ phase }) => {
  const { t } = useLanguage();
  const bossFightTheme = useBossFightTheme();
  const config = PHASE_CONFIGS[phase];
  const themePhase = bossFightTheme.phaseColors[phase];
  const { Icon } = config;

  const badge = (
    <div
      role="status"
      aria-label={`Boss ${config.ariaLabel}`}
      className={`
        inline-flex items-center justify-center gap-1
        ${config.paddingClass}
        ${themePhase.bg}
        ${themePhase.text}
        border-3 border-neo-black
        rounded-neo
        shadow-hard-sm
        ${config.animation}
      `.trim().replace(/\s+/g, ' ')}
    >
      <Icon className="w-3 h-3 shrink-0" aria-hidden="true" />
      <span className="font-neo-display text-sm font-bold uppercase tracking-wide">
        {t(config.labelKey)}
      </span>
    </div>
  );

  // Enraged badge: add framer-motion scale pulse on top of CSS shake
  if (phase === 'enraged') {
    return (
      <AdaptiveMotion.div
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ duration: 0.5, repeat: Infinity, ease: 'easeInOut' }}
        className="motion-reduce:animate-none"
      >
        {badge}
      </AdaptiveMotion.div>
    );
  }

  return badge;
});

PhaseIndicator.displayName = 'PhaseIndicator';

export default PhaseIndicator;
