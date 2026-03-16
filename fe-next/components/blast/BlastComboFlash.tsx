'use client';

import React from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import type { BlastComboType } from './utils/blastCombos';

// ==================== Types ====================

export interface BlastComboFlashProps {
  activeFlash: { id: string; comboType: BlastComboType } | null;
  onComplete: (id: string) => void;
}

// ==================== Tier system ====================

/** Tier 3: Ultimate combos (scoreMultiplier >= 6) */
const TIER_3_TYPES: ReadonlySet<BlastComboType> = new Set([
  'prism_prism',
  'prism_rainbow',
  'lightning_prism',
]);

/** Tier 2: Powerful combos (scoreMultiplier 4-5) */
const TIER_2_TYPES: ReadonlySet<BlastComboType> = new Set([
  'bomb_prism',
  'bomb_magnet',
  'bomb_rainbow',
  'bomb_mirror',
  'bomb_gem',
  'bomb_lightning',
  'lightning_lightning',
  'lightning_rainbow',
  'lightning_mirror',
  'lightning_magnet',
  'lightning_gem',
  'prism_mirror',
  'prism_magnet',
  'prism_gem',
  'prism_frozen',
  'rainbow_mirror',
  'rainbow_magnet',
  'rainbow_gem',
  'mirror_magnet',
  'mirror_gem',
  'mirror_frozen',
  'magnet_gem',
  'magnet_frozen',
  'gem_frozen',
]);

/**
 * Map a combo type to its tier (1=moderate, 2=powerful, 3=ultimate).
 * Exported for testing.
 */
export function getComboTier(comboType: BlastComboType): 1 | 2 | 3 {
  if (TIER_3_TYPES.has(comboType)) return 3;
  if (TIER_2_TYPES.has(comboType)) return 2;
  return 1;
}

/**
 * Return the flash background CSS value for a given tier.
 * Exported for testing.
 */
export function getComboFlashColor(tier: 1 | 2 | 3): string {
  switch (tier) {
    case 3:
      return 'linear-gradient(135deg, #FF1493, #FFE135, #00FFFF, #FF6B35)';
    case 2:
      return '#FF6B35';
    case 1:
    default:
      return '#00FFFF';
  }
}

// ==================== Component ====================

/**
 * BlastComboFlash — full-screen color overlay triggered on combo detection.
 * Tier 1 (moderate) = cyan, Tier 2 (powerful) = orange, Tier 3 (ultimate) = rainbow.
 * Auto-dismisses after 400ms animation via onComplete callback.
 * Respects reduced motion: immediately calls onComplete with no visible flash.
 */
export function BlastComboFlash({ activeFlash, onComplete }: BlastComboFlashProps) {
  const shouldReduceMotion = useReducedMotion();

  if (!activeFlash) return null;

  // Reduced motion: skip flash, call onComplete synchronously via effect
  if (shouldReduceMotion) {
    return (
      <ReducedMotionFlash id={activeFlash.id} onComplete={onComplete} />
    );
  }

  const tier = getComboTier(activeFlash.comboType);
  const background = getComboFlashColor(tier);

  return (
    <AnimatePresence>
      <motion.div
        key={activeFlash.id}
        data-testid="combo-flash"
        className="absolute inset-0 pointer-events-none z-40 overflow-hidden"
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: tier === 3 ? 0.45 : tier === 2 ? 0.3 : 0.2, ease: 'easeOut' }}
        onAnimationComplete={() => onComplete(activeFlash.id)}
      >
        {/* Radial flash — expands from center like a shockwave */}
        <motion.div
          className="absolute"
          style={{
            inset: '-50%',
            background: tier === 3
              ? `radial-gradient(circle, ${background}, transparent 70%)`
              : `radial-gradient(circle, ${background}, transparent 60%)`,
          }}
          initial={{ scale: 0.3, opacity: tier === 3 ? 0.35 : tier === 2 ? 0.25 : 0.15 }}
          animate={{ scale: 1.5, opacity: 0 }}
          transition={{ duration: tier === 3 ? 0.4 : tier === 2 ? 0.28 : 0.18, ease: 'easeOut' }}
        />
        {/* Horizontal sweep line for tier 2+ */}
        {tier >= 2 && (
          <motion.div
            style={{
              position: 'absolute',
              top: '50%',
              left: 0,
              width: '100%',
              height: tier === 3 ? 4 : 2,
              background: tier === 3
                ? 'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)'
                : `linear-gradient(90deg, transparent, ${background}80, transparent)`,
              transform: 'translateY(-50%)',
            }}
            initial={{ scaleX: 0, opacity: 1 }}
            animate={{ scaleX: 1, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
}

/** Thin helper that fires onComplete immediately for reduced-motion users */
function ReducedMotionFlash({ id, onComplete }: { id: string; onComplete: (id: string) => void }) {
  React.useEffect(() => {
    onComplete(id);
  }, [id, onComplete]);
  return null;
}
