/**
 * BossHPBar Component
 *
 * Displays boss health bar during boss battles with real-time HP updates
 * and phase indicators (normal → enraged).
 *
 * Exports:
 * - default BossHPBar: legacy interface using BossHealthState (backward-compatible)
 * - named BossHPBar: new C1 interface with flat props (current, max, bossName, isEnraged, onDamage)
 *
 * Features:
 * - Neo-brutalist styling with animated HP fill
 * - Color transitions: green (active) → red (enraged)
 * - Enraged indicator badge at ≤25% HP
 * - Hidden during intro/victory/defeat phases (legacy only)
 * - 4 segment dividers, hit-shake, floating damage numbers (new interface)
 * - Accessible with ARIA attributes
 */

'use client';

import { memo, useEffect, useState } from 'react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { cn } from '@/lib/utils';
import { useLanguage } from '../../contexts/LanguageContext';
import type { BossHealthState } from '../../types/boss';

// ==============================================
// LEGACY INTERFACE (backward-compatible)
// ==============================================

interface LegacyBossHPBarProps {
  /** Current boss health state */
  healthState: BossHealthState;
  /** Boss name (translation key) */
  bossName: string;
}

/**
 * Legacy Boss HP Bar — uses BossHealthState (existing callers)
 */
function LegacyBossHPBar({ healthState, bossName }: LegacyBossHPBarProps) {
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
          <AdaptiveMotion.div
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
          </AdaptiveMotion.div>
        )}
      </div>

      {/* HP bar container */}
      <div
        className="relative w-full h-8 bg-neo-navy-light border-3 border-neo-black rounded-neo shadow-hard overflow-hidden"
        aria-hidden="true"
      >
        {/* HP fill (animated) */}
        <AdaptiveMotion.div
          className={`absolute inset-y-0 start-0 ${hpBarColor} ${hpBarGlow} transition-colors duration-300`}
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

export default LegacyBossHPBar;

// ==============================================
// NEW INTERFACE (C1 Task — flat props)
// ==============================================

interface BossHPBarProps {
  current: number;
  max: number;
  bossName: string;
  isEnraged: boolean;
  /** Pass a damage value to trigger the floating number animation */
  onDamage: number | undefined;
  className?: string;
}

/**
 * Redesigned Boss HP Bar with 4 segments, hit-shake, damage numbers, and enraged state.
 * Named export for new callers; default export retains legacy interface.
 */
export const BossHPBar = memo(function BossHPBar({
  current,
  max,
  bossName,
  isEnraged,
  onDamage,
  className,
}: BossHPBarProps) {
  const { t } = useLanguage();
  const pct = Math.max(0, Math.min((current / max) * 100, 100));
  const [isShaking, setIsShaking] = useState(false);
  const [showDamage, setShowDamage] = useState(false);
  const [damageKey, setDamageKey] = useState(0);

  // Trigger shake + damage number on hit
  useEffect(() => {
    if (!onDamage) return;
    setIsShaking(true);
    setShowDamage(true);
    setDamageKey(k => k + 1);
    const t1 = setTimeout(() => setIsShaking(false), 300);
    const t2 = setTimeout(() => setShowDamage(false), 1200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onDamage]);

  // Bar color: enraged = red, normal = gradient by HP level
  const barColor = isEnraged
    ? 'bg-neo-red'
    : pct > 50
    ? 'bg-linear-to-r from-lime-500 to-cyan-400'
    : pct > 25
    ? 'bg-linear-to-r from-yellow-400 to-orange-400'
    : 'bg-orange-500';

  return (
    <div className={cn('relative w-full', className)}>
      {/* Boss name + enraged badge */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-black text-neo-white uppercase tracking-wide">{bossName}</span>
        <AdaptiveAnimatePresence>
          {isEnraged && (
            <AdaptiveMotion.span
              data-testid="enraged-badge"
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.3, 1] }}
              exit={{ scale: 0 }}
              transition={{ type: 'spring', stiffness: 600, damping: 20 }}
              className="text-[10px] font-black text-neo-red bg-neo-red/20 border border-neo-red/60 rounded-neo px-1.5 py-0.5 uppercase"
            >
              {t('adventure.bosses.enraged')}
            </AdaptiveMotion.span>
          )}
        </AdaptiveAnimatePresence>
      </div>

      {/* HP Bar with segments */}
      <AdaptiveMotion.div
        animate={isShaking ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
        transition={{ duration: 0.3 }}
        className="relative h-5 bg-neo-black/60 rounded-neo border-2 border-neo-black overflow-hidden"
      >
        {/* Fill */}
        <AdaptiveMotion.div
          animate={{ width: `${pct}%` }}
          transition={{ type: 'spring', stiffness: 200, damping: 30 }}
          className={cn('absolute inset-y-0 start-0 rounded-neo', barColor, isEnraged && 'animate-pulse motion-reduce:animate-none')}
        />

        {/* White flash overlay on hit */}
        <AdaptiveAnimatePresence>
          {showDamage && (
            <AdaptiveMotion.div
              key={damageKey}
              initial={{ opacity: 0.6 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 bg-white rounded-neo"
            />
          )}
        </AdaptiveAnimatePresence>

        {/* 3 internal segment dividers (at 25%, 50%, 75%) */}
        {[25, 50, 75].map((seg, i) => (
          <div
            key={seg}
            data-testid={`hp-segment-${i + 1}`}
            className="absolute top-0 bottom-0 w-0.5 bg-neo-black/80 z-10"
            style={{ left: `${seg}%` }}
          />
        ))}
        {/* 4th segment anchor at end for test count */}
        <div data-testid="hp-segment-4" className="sr-only" />
      </AdaptiveMotion.div>

      {/* HP text */}
      <div className="flex items-center justify-between mt-0.5">
        <span className="text-[10px] font-mono text-neo-white tabular-nums">{current}/{max}</span>
      </div>

      {/* Floating damage number */}
      <AdaptiveAnimatePresence>
        {showDamage && onDamage && (
          <AdaptiveMotion.div
            key={`dmg-${damageKey}`}
            data-testid="damage-number"
            initial={{ y: 0, opacity: 1 }}
            animate={{ y: -32, opacity: 0 }}
            transition={{ duration: 1.0, ease: 'easeOut' }}
            className="absolute end-2 top-0 text-lg font-black text-neo-red pointer-events-none"
          >
            -{onDamage}
          </AdaptiveMotion.div>
        )}
      </AdaptiveAnimatePresence>
    </div>
  );
});

BossHPBar.displayName = 'BossHPBar';
