/**
 * PlayerHealthBar Component
 *
 * Displays player health bar during boss battles with real-time HP updates
 * and low health warning indicator.
 *
 * Features:
 * - Neo-brutalist styling with animated HP fill
 * - Color transitions: cyan (normal) → red (low health)
 * - Heal flash (green) when HP increases
 * - Damage flash (red/white) when HP decreases
 * - Shine gradient overlay for visual depth
 * - RPG-style repeating notch dividers for consistency with SegmentedHPBar
 * - Low health warning badge at <25% HP
 * - Hidden when player is dead
 * - Accessible with ARIA attributes
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
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

type FlashType = 'heal' | 'damage' | null;

/**
 * Player HP Bar with real-time updates and low health warning
 */
export default function PlayerHealthBar({
  healthState,
  className,
}: PlayerHealthBarProps) {
  const { t } = useLanguage();

  const { currentHP, maxHP, isLowHealth, isDead } = healthState;

  // Track HP changes for flash effects
  const prevHPRef = useRef(currentHP);
  const [flashType, setFlashType] = useState<FlashType>(null);
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const prev = prevHPRef.current;
    if (currentHP > prev) {
      setFlashType('heal');
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
      flashTimeoutRef.current = setTimeout(() => setFlashType(null), 350);
    } else if (currentHP < prev) {
      setFlashType('damage');
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
      flashTimeoutRef.current = setTimeout(() => setFlashType(null), 300);
    }
    prevHPRef.current = currentHP;

    return () => {
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    };
  }, [currentHP]);

  // Hide HP bar when player is dead
  if (isDead) {
    return null;
  }

  // Calculate HP percentage (0-100)
  const hpPercentage = maxHP > 0 ? Math.round((currentHP / maxHP) * 100) : 0;

  // Determine HP bar color based on health state
  const hpBarColor = isLowHealth ? 'bg-neo-red' : 'bg-neo-cyan';
  const hpBarGlow = isLowHealth
    ? 'shadow-[0_0_12px_rgba(255,51,102,0.5)]'
    : 'shadow-[0_0_8px_rgba(0,255,255,0.3)]';

  // Flash overlay color
  const flashOverlayColor =
    flashType === 'heal'
      ? 'rgba(0, 255, 100, 0.45)'
      : 'rgba(255, 255, 255, 0.55)';

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
              isLowHealth ? 'text-neo-red animate-pulse motion-reduce:animate-none' : 'text-neo-cyan'
            )}
            fill={isLowHealth ? 'currentColor' : 'none'}
          />
          <span className="font-neo-display text-sm font-bold text-neo-white">
            {t('adventure.player.health')}
          </span>
        </div>

        {/* Low health warning badge */}
        <AdaptiveAnimatePresence>
          {isLowHealth && (
            <AdaptiveMotion.div
              initial={{ scale: 0, rotate: -15 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: -15 }}
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
            </AdaptiveMotion.div>
          )}
        </AdaptiveAnimatePresence>
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
        className="relative w-full h-7 sm:h-8 bg-neo-navy-light border-3 border-neo-black rounded-neo shadow-hard overflow-hidden"
      >
        {/* HP fill (animated) */}
        <AdaptiveMotion.div
          className={cn(
            'absolute inset-y-0 start-0 transition-colors duration-300',
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
        >
          {/* Shine overlay for visual depth */}
          <div className="absolute inset-x-0 top-0 h-1/3 bg-white/25 pointer-events-none" />
          {/* RPG-style repeating notch dividers */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage:
                'repeating-linear-gradient(90deg, transparent, transparent 11px, rgba(0,0,0,0.15) 11px, rgba(0,0,0,0.15) 12px)',
            }}
          />
        </AdaptiveMotion.div>

        {/* Heal / damage flash overlay */}
        <AdaptiveAnimatePresence>
          {flashType && (
            <AdaptiveMotion.div
              key={flashType}
              className="absolute inset-0 pointer-events-none rounded-neo"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: flashType === 'heal' ? 0.35 : 0.3 }}
              style={{ backgroundColor: flashOverlayColor }}
              aria-hidden="true"
            />
          )}
        </AdaptiveAnimatePresence>

        {/* HP text overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-neo-display text-sm font-bold text-neo-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] z-10 tabular-nums">
            {currentHP} / {maxHP}
          </span>
        </div>
      </div>
    </div>
  );
}
