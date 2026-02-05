/**
 * PlayerHealthBar Component
 *
 * Displays player health bar during boss battles with real-time HP updates
 * and low health warning indicator.
 *
 * Features:
 * - Neo-brutalist styling with animated HP fill
 * - Color transitions: cyan (normal) → red (low health)
 * - Low health warning badge at <25% HP
 * - Hidden when player is dead
 * - Accessible with ARIA attributes
 */

'use client';

import { motion } from 'framer-motion';
import { Heart, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import type { PlayerHealthState } from '@/hooks/usePlayerHealth';

interface PlayerHealthBarProps {
  /** Current player health state */
  healthState: PlayerHealthState;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Player HP Bar with real-time updates and low health warning
 */
export default function PlayerHealthBar({
  healthState,
  className,
}: PlayerHealthBarProps) {
  const { t } = useLanguage();

  // Hide HP bar when player is dead
  if (healthState.isDead) {
    return null;
  }

  const { currentHP, maxHP, isLowHealth } = healthState;

  // Calculate HP percentage (0-100)
  const hpPercentage = maxHP > 0 ? Math.round((currentHP / maxHP) * 100) : 0;

  // Determine HP bar color based on health state
  const hpBarColor = isLowHealth ? 'bg-neo-red' : 'bg-neo-cyan';
  const hpBarGlow = isLowHealth
    ? 'shadow-[0_0_12px_rgba(255,51,102,0.5)]'
    : 'shadow-[0_0_8px_rgba(0,255,255,0.3)]';

  return (
    <div
      className={cn('w-full max-w-md', className)}
      data-testid="player-health-bar"
      data-low-health={isLowHealth}
      aria-label={t('adventure.player.healthLabel', {
        current: currentHP,
        max: maxHP,
        percentage: hpPercentage,
      })}
    >
      {/* Label row with health icon and warning */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <Heart
            className={cn(
              'w-4 h-4',
              isLowHealth ? 'text-neo-red animate-pulse' : 'text-neo-cyan'
            )}
            fill={isLowHealth ? 'currentColor' : 'none'}
          />
          <span className="font-neo-display text-sm font-bold text-neo-white">
            {t('adventure.player.health')}
          </span>
        </div>

        {/* Low health warning badge */}
        {isLowHealth && (
          <motion.div
            initial={{ scale: 0, rotate: -15 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 15,
            }}
            className="flex items-center gap-1 px-2 py-0.5 bg-neo-red border-2 border-neo-black rounded-neo shadow-hard-sm"
          >
            <AlertTriangle className="w-3 h-3 text-neo-white" />
            <span className="font-neo-display text-xs font-bold text-neo-white uppercase">
              {t('adventure.player.danger')}
            </span>
          </motion.div>
        )}
      </div>

      {/* HP bar container with progressbar role */}
      <div
        role="progressbar"
        aria-valuenow={currentHP}
        aria-valuemin={0}
        aria-valuemax={maxHP}
        aria-label={t('adventure.player.healthLabel', {
          current: currentHP,
          max: maxHP,
          percentage: hpPercentage,
        })}
        className="relative w-full h-6 bg-neo-navy-light border-3 border-neo-black rounded-neo shadow-hard overflow-hidden"
      >
        {/* HP fill (animated) */}
        <motion.div
          className={cn(
            'absolute inset-y-0 left-0 transition-colors duration-300',
            hpBarColor,
            hpBarGlow
          )}
          initial={{ width: '100%' }}
          animate={{ width: `${hpPercentage}%` }}
          transition={{
            type: 'spring',
            stiffness: 200,
            damping: 20,
          }}
        />

        {/* HP text overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-neo-display text-xs font-bold text-neo-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] z-10">
            {currentHP} / {maxHP}
          </span>
        </div>
      </div>
    </div>
  );
}
