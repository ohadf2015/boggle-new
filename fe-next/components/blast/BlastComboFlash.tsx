'use client';

import React from 'react';
import { useReducedMotion } from 'framer-motion';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';

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

export function BlastComboFlash({ flash, onComplete, comboTypeName }: BlastComboFlashProps) {
  const shouldReduceMotion = useReducedMotion();

  if (!flash) return null;

  if (shouldReduceMotion) {
    return <ReducedMotionFlash onComplete={onComplete} />;
  }

  const cfg = TIER_CONFIG[flash.tier];
  const isGradient = flash.tier === 3;
  const bgValue = isGradient
    ? `radial-gradient(circle, ${cfg.color}, transparent 70%)`
    : `radial-gradient(circle, ${cfg.color}, transparent 60%)`;

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
        <AdaptiveMotion.div
          className="absolute"
          style={{ inset: '-50%', background: bgValue }}
          initial={{ scale: 0.3, opacity: cfg.opacity }}
          animate={{ scale: 1.5, opacity: 0 }}
          transition={{ duration: cfg.duration * 0.9, ease: 'easeOut' }}
        />
        {flash.tier >= 2 && (
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
        )}
        {comboTypeName && (
          <AdaptiveMotion.div
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-50"
            initial={{ scale: 0.5, opacity: 1 }}
            animate={{ scale: 1.2, opacity: 0 }}
            transition={{ duration: cfg.duration * 0.8, ease: 'easeOut' }}
          >
            <span
              className="font-neo-display uppercase text-2xl sm:text-3xl font-bold"
              style={{
                color: isGradient ? '#FFFFFF' : cfg.color,
                textShadow: `0 0 12px ${isGradient ? '#FF1493' : cfg.color}, 0 2px 4px rgba(0,0,0,0.5)`,
              }}
            >
              {comboTypeName}
            </span>
          </AdaptiveMotion.div>
        )}
      </AdaptiveMotion.div>
    </AdaptiveAnimatePresence>
  );
}

function ReducedMotionFlash({ onComplete }: { onComplete: () => void }) {
  React.useEffect(() => { onComplete(); }, [onComplete]);
  return null;
}
