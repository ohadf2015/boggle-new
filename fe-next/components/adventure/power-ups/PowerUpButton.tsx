/**
 * PowerUpButton Component
 *
 * Individual power-up button with cooldown indicator.
 * Shows icon, label, and radial cooldown progress.
 */

'use client';

import { memo } from 'react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { CooldownIndicator } from '@/components/adventure/hud/CooldownIndicator';
import type { PowerUpType, PowerUpState } from '@/types/adventure';

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface PowerUpButtonProps {
  /** Type of power-up */
  type: PowerUpType;
  /** Icon to show (emoji) */
  icon: string;
  /** Translation key for label */
  label: string;
  /** Current state in lifecycle */
  state: PowerUpState;
  /** Remaining cooldown time in seconds */
  remainingCooldown: number;
  /** Total cooldown duration in seconds */
  totalCooldown: number;
  /** Optional cascade blocking disabled state */
  disabled?: boolean;
  /** Callback when button is activated */
  onActivate: () => void;
}

// ============================================
// COMPONENT
// ============================================

export const PowerUpButton = memo<PowerUpButtonProps>(
  ({
    type,
    icon,
    label,
    state,
    remainingCooldown,
    totalCooldown,
    disabled = false,
    onActivate,
  }) => {
    const { t } = useLanguage();

    // Button is interactable only when ready and not disabled
    const isReady = state === 'ready' && !disabled;
    const isActive = state === 'active';
    const isCooldown = state === 'cooldown';

    // Handle button click
    const handleClick = () => {
      if (isReady) {
        onActivate();
      }
    };

    // Generate aria-label with state information
    const ariaLabel = `${t(label)} - ${
      isCooldown
        ? t('adventure.powerUps.cooldown', { seconds: remainingCooldown })
        : t('adventure.powerUps.ready')
    }`;

    return (
      <button
        data-testid="power-up-button"
        type="button"
        disabled={!isReady}
        onClick={handleClick}
        aria-label={ariaLabel}
        className={cn(
          // Base styling - neo-brutalist
          'relative flex flex-col items-center gap-2',
          'p-3 rounded-neo',
          'bg-neo-purple border-3 border-neo-black shadow-hard',
          'transition-all duration-200',

          // Focus ring for keyboard navigation
          'focus-visible:ring-2 focus-visible:ring-neo-lime focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy focus-visible:outline-hidden',

          // Ready state - interactive
          isReady && [
            'cursor-pointer',
            'hover:shadow-hard-lg hover:-translate-y-0.5',
            'active:shadow-hard-pressed active:translate-y-0',
          ],

          // Cooldown/disabled state - muted
          (isCooldown || disabled) && [
            'opacity-50',
            'cursor-not-allowed',
          ],

          // Active state - pulsing animation
          isActive && 'animate-pulse-subtle'
        )}
      >
        <CooldownIndicator
          icon={icon}
          totalDuration={totalCooldown}
          remainingTime={remainingCooldown}
          label={t(label)}
          size="md"
        />
      </button>
    );
  }
);

PowerUpButton.displayName = 'PowerUpButton';
