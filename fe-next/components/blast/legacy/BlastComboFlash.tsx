'use client';
'use no memo'; // Disable React Compiler memoization — manual memoization with optional-chained deps incompatible

import React, { memo, useMemo } from 'react';
import { useReducedMotion } from 'framer-motion';
import { AdaptiveMotion, AdaptiveAnimatePresence, useSkipAnimations } from '@/components/motion/AdaptiveMotion';
import { getRandomComboFlash, generateAccentParticles, type ComboFlashVariation } from './blastEffectVariations';

export interface BlastComboFlashProps {
  flash: { id: string; tier: 1 | 2 | 3 } | null;
  onComplete: () => void;
  /** Optional combo type label e.g. "BOMB!", "LIGHTNING!" */
  comboTypeName?: string;
}

const TIER_CONFIG: Record<1 | 2 | 3, { color: string; duration: number; opacity: number }> = {
  1: { color: '#00FFFF', duration: 0.2, opacity: 0.15 },
  2: { color: '#FF6B35', duration: 0.3, opacity: 0.25 },
  3: { color: 'linear-gradient(135deg, #FF1493, #FFE135, #00FFFF, #FF6B35)', duration: 0.45, opacity: 0.35 },
};

function buildFlashBg(cfg: { color: string }, isGradient: boolean, variation: ComboFlashVariation): string {
  if (variation.type === 'diamond') {
    return isGradient
      ? `conic-gradient(from ${variation.rotation ?? 45}deg, ${cfg.color}, transparent 25%)`
      : `conic-gradient(from ${variation.rotation ?? 45}deg, ${cfg.color}, transparent 25%)`;
  }
  if (variation.type === 'cross') {
    return isGradient
      ? `repeating-conic-gradient(from 0deg, ${cfg.color} 0deg 5deg, transparent 5deg 90deg)`
      : `repeating-conic-gradient(from 0deg, ${cfg.color} 0deg 5deg, transparent 5deg 90deg)`;
  }
  const rot = variation.rotation ? ` at 50% 50%` : '';
  return isGradient
    ? `radial-gradient(circle${rot}, ${cfg.color}, transparent 70%)`
    : `radial-gradient(circle${rot}, ${cfg.color}, transparent 60%)`;
}

export const BlastComboFlash = memo(function BlastComboFlash({ flash, onComplete, comboTypeName }: BlastComboFlashProps) {
  // Dismissal is driven entirely by onAnimationComplete on the animated path.
  // AdaptiveMotion replaces that path with a static element (no animation, no
  // onAnimationComplete) whenever useSkipAnimations() is true — cosy mode,
  // low-end device, or app-level reduced-motion — none of which framer's
  // useReducedMotion() (OS prefers-reduced-motion only) detects. Without ORing
  // both signals the overlay renders but never fires onComplete and sticks on
  // screen forever. OR (not replace) preserves OS-level reduced-motion coverage.
  // Both hooks are called unconditionally (no short-circuit) per rules-of-hooks.
  const osReduceMotion = useReducedMotion();
  const skipAnimations = useSkipAnimations();
  const shouldReduceMotion = osReduceMotion || skipAnimations;
  const variation = useMemo(() => getRandomComboFlash(), [flash?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  /* eslint-disable react-hooks/preserve-manual-memoization */
  const accentParticles = useMemo(
    () => (flash && flash.tier >= 2 ? generateAccentParticles(flash.tier === 3 ? 12 : 6) : []),
    [flash?.id, flash?.tier], // eslint-disable-line react-hooks/exhaustive-deps
  );
  /* eslint-enable react-hooks/preserve-manual-memoization */

  if (!flash) return null;

  if (shouldReduceMotion) {
    return <ReducedMotionFlash onComplete={onComplete} />;
  }

  const cfg = TIER_CONFIG[flash.tier];
  const isGradient = flash.tier === 3;
  const bgValue = buildFlashBg(cfg, isGradient, variation);
  const [scaleFrom, scaleTo] = variation.scaleRange ?? [0.3, 1.5];

  return (
    <AdaptiveAnimatePresence>
      <AdaptiveMotion.div
        key={flash.id}
        data-testid="combo-flash"
        className="absolute inset-0 pointer-events-none z-40 overflow-hidden"
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: cfg.duration, ease: 'easeOut' }}
        onAnimationComplete={onComplete}
      >
        {/* Main flash shape */}
        <AdaptiveMotion.div
          className="absolute"
          style={{
            inset: '-50%',
            background: bgValue,
            rotate: variation.rotation ? `${variation.rotation}deg` : undefined,
          }}
          initial={{ scale: scaleFrom, opacity: cfg.opacity }}
          animate={{ scale: scaleTo, opacity: 0 }}
          transition={{ duration: cfg.duration * 0.9, ease: 'easeOut' }}
        />

        {/* Ripple rings for ripple variation */}
        {variation.type === 'ripple' && Array.from({ length: variation.extraElements ?? 3 }).map((_, i) => (
          <AdaptiveMotion.div
            key={`ripple-${i}`}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              border: `2px solid ${isGradient ? '#FFFFFF' : cfg.color}`,
              width: '10%',
              height: '10%',
            }}
            initial={{ scale: 0.5, opacity: cfg.opacity }}
            animate={{ scale: 3 + i * 1.5, opacity: 0 }}
            transition={{ duration: cfg.duration * (0.7 + i * 0.15), ease: 'easeOut', delay: i * 0.06 }}
          />
        ))}

        {/* Cross beams — horizontal + vertical scan lines */}
        {(flash.tier >= 2 || variation.type === 'cross') && (
          <>
            <AdaptiveMotion.div
              style={{
                position: 'absolute',
                top: '50%',
                left: 0,
                width: '100%',
                height: flash.tier === 3 ? 4 : 2,
                background: isGradient
                  ? 'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)'
                  : `linear-gradient(90deg, transparent, ${cfg.color}80, transparent)`,
                transform: 'translateY(-50%)',
              }}
              initial={{ scaleX: 0, opacity: 1 }}
              animate={{ scaleX: 1, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
            {variation.type === 'cross' && (
              <AdaptiveMotion.div
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: 0,
                  height: '100%',
                  width: flash.tier === 3 ? 4 : 2,
                  background: isGradient
                    ? 'linear-gradient(180deg, transparent, rgba(255,255,255,0.6), transparent)'
                    : `linear-gradient(180deg, transparent, ${cfg.color}80, transparent)`,
                  transform: 'translateX(-50%)',
                }}
                initial={{ scaleY: 0, opacity: 1 }}
                animate={{ scaleY: 1, opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              />
            )}
          </>
        )}

        {/* Accent particles shooting outward */}
        {accentParticles.map((p, i) => {
          const rad = (p.angle * Math.PI) / 180;
          const endX = Math.cos(rad) * p.distance;
          const endY = Math.sin(rad) * p.distance;
          return (
            <AdaptiveMotion.div
              key={`accent-${i}`}
              className="absolute left-1/2 top-1/2 rounded-full"
              style={{
                width: p.size,
                height: p.size,
                backgroundColor: p.color,
                marginLeft: -p.size / 2,
                marginTop: -p.size / 2,
              }}
              initial={{ x: 0, y: 0, opacity: 1, scale: 1.5 }}
              animate={{ x: endX, y: endY, opacity: 0, scale: 0 }}
              transition={{ duration: cfg.duration * 0.8, delay: p.delay, ease: 'easeOut' }}
            />
          );
        })}

        {/* Tier 3: Screen-edge vignette for cinematic weight */}
        {flash.tier === 3 && (
          <AdaptiveMotion.div
            className="absolute inset-0"
            style={{
              background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.6) 100%)',
            }}
            initial={{ opacity: 0.8 }}
            animate={{ opacity: 0 }}
            transition={{ duration: cfg.duration * 0.7, ease: 'easeOut' }}
          />
        )}

        {/* Tier 3: Diagonal light streaks */}
        {flash.tier === 3 && (
          <>
            <AdaptiveMotion.div
              style={{
                position: 'absolute',
                top: '50%',
                left: '-20%',
                width: '140%',
                height: 3,
                background: 'linear-gradient(90deg, transparent 10%, rgba(255,255,255,0.7) 50%, transparent 90%)',
                transform: 'translateY(-50%) rotate(35deg)',
                transformOrigin: 'center',
              }}
              initial={{ scaleX: 0, opacity: 1 }}
              animate={{ scaleX: 1.2, opacity: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut', delay: 0.03 }}
            />
            <AdaptiveMotion.div
              style={{
                position: 'absolute',
                top: '50%',
                left: '-20%',
                width: '140%',
                height: 3,
                background: 'linear-gradient(90deg, transparent 10%, rgba(255,255,255,0.7) 50%, transparent 90%)',
                transform: 'translateY(-50%) rotate(-35deg)',
                transformOrigin: 'center',
              }}
              initial={{ scaleX: 0, opacity: 1 }}
              animate={{ scaleX: 1.2, opacity: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut', delay: 0.06 }}
            />
          </>
        )}

        {/* Combo type label */}
        {comboTypeName && (
          <AdaptiveMotion.div
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-50"
            initial={{
              scale: flash.tier === 3 ? 0.3 : 0.5,
              opacity: 1,
              rotate: variation.rotation ? -variation.rotation / 4 : 0,
            }}
            animate={{
              scale: flash.tier === 3 ? [0.3, 1.4, 1.1, 1.3] : 1.2,
              opacity: [1, 1, 1, 0],
              rotate: 0,
            }}
            transition={{
              duration: flash.tier === 3 ? cfg.duration * 1.1 : cfg.duration * 0.8,
              ease: 'easeOut',
              times: flash.tier === 3 ? [0, 0.3, 0.5, 1] : undefined,
            }}
          >
            <span
              className={`font-neo-display uppercase font-bold ${flash.tier === 3 ? 'text-3xl sm:text-5xl' : 'text-2xl sm:text-3xl'}`}
              style={{
                color: isGradient ? '#FFFFFF' : cfg.color,
                textShadow: flash.tier === 3
                  ? `0 0 20px #FF1493, 0 0 40px #00FFFF, 0 4px 8px rgba(0,0,0,0.7)`
                  : `0 0 12px ${isGradient ? '#FF1493' : cfg.color}, 0 2px 4px rgba(0,0,0,0.5)`,
                WebkitTextStroke: flash.tier === 3 ? '1.5px rgba(0,0,0,0.5)' : undefined,
                paintOrder: 'stroke fill',
              }}
            >
              {comboTypeName}
            </span>
          </AdaptiveMotion.div>
        )}
      </AdaptiveMotion.div>
    </AdaptiveAnimatePresence>
  );
});

function ReducedMotionFlash({ onComplete }: { onComplete: () => void }) {
  React.useEffect(() => { onComplete(); }, [onComplete]);
  return null;
}
