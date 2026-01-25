/**
 * BossHPBar Component
 *
 * Displays boss health bar during boss battles with real-time HP updates
 * and phase indicators (normal → enraged).
 *
 * Features:
 * - Neo-brutalist styling with animated HP fill
 * - Color transitions: green (active) → red (enraged)
 * - Enraged indicator badge at ≤25% HP
 * - Hidden during intro/victory/defeat phases
 * - Accessible with ARIA attributes
 */

'use client';

import { motion } from 'framer-motion';
import { useLanguage } from '../../contexts/LanguageContext';
import type { BossHealthState } from '../../types/boss';

interface BossHPBarProps {
  /** Current boss health state */
  healthState: BossHealthState;
  /** Boss name (translation key) */
  bossName: string;
}

/**
 * Boss HP Bar with real-time updates and phase indicators
 */
export default function BossHPBar({ healthState, bossName }: BossHPBarProps) {
  const { t } = useLanguage();

  // Hide HP bar during intro/victory/defeat phases
  if (!healthState.isActive) {
    return null;
  }

  const { currentHP, maxHP, phase } = healthState;

  // Calculate HP percentage (0-100)
  const hpPercentage = Math.round((currentHP / maxHP) * 100);

  // Determine HP bar color based on phase
  const hpBarColor = phase === 'enraged' ? 'bg-neo-red' : 'bg-lime-500';
  const hpBarGlow = phase === 'enraged' ? 'shadow-[0_0_12px_rgba(255,51,102,0.5)]' : '';

  return (
    <div
      className="w-full max-w-2xl mx-auto px-4 py-3"
      role="status"
      aria-label={`${t(bossName)} health: ${hpPercentage}%`}
      aria-live="polite"
    >
      {/* Boss name */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-neo-display text-lg font-bold text-neo-white">
          {t(bossName)}
        </h2>
        {phase === 'enraged' && (
          <motion.div
            initial={{ scale: 0, rotate: -15 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 15,
            }}
            className="px-3 py-1 bg-neo-red border-3 border-neo-black rounded-neo shadow-hard-sm"
          >
            <span className="font-neo-display text-sm font-bold text-neo-white uppercase">
              {t('adventure.bosses.enraged')}
            </span>
          </motion.div>
        )}
      </div>

      {/* HP bar container */}
      <div
        className="relative w-full h-8 bg-neo-navy-light border-3 border-neo-black rounded-neo shadow-hard overflow-hidden"
        aria-hidden="true"
      >
        {/* HP fill (animated) */}
        <motion.div
          className={`absolute inset-y-0 left-0 ${hpBarColor} ${hpBarGlow} transition-colors duration-300`}
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
          <span className="font-neo-display text-sm font-bold text-neo-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] z-10">
            {currentHP} / {maxHP}
          </span>
        </div>
      </div>
    </div>
  );
}
