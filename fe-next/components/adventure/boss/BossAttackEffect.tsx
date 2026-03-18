/**
 * BossAttackEffect — Enhanced attack slash overlay with glow layers
 * and dramatic damage number.
 *
 * Extracted from BossOverlay to keep that file under 500 lines.
 */

'use client';

import { memo } from 'react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';

interface BossAttackEffectProps {
  attackEffect: { abilityName: string | null; damage: number } | null;
}

const BossAttackEffect = memo<BossAttackEffectProps>(({ attackEffect }) => (
  <AdaptiveAnimatePresence>
    {attackEffect && (
      <AdaptiveMotion.div
        className="fixed inset-0 z-50 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        data-testid="boss-attack-effect"
      >
        {/* Red damage flash */}
        <AdaptiveMotion.div
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.45, 0] }}
          transition={{ duration: 0.5 }}
          style={{ backgroundColor: 'rgba(255, 0, 0, 0.35)' }}
        />

        {/* Enhanced slash marks with glow layers */}
        <AdaptiveMotion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          initial={{ scale: 0, rotate: -45 }}
          animate={{ scale: [0, 1.6, 1.3], rotate: [-45, -45, -45] }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          <div className="relative w-40 h-40">
            {/* Slash line 1 — glow base (wide, low opacity) */}
            <AdaptiveMotion.div
              className="absolute top-1/2 left-0 w-full h-3 rounded-full -translate-y-1/2"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: [0, 1, 0.8] }}
              transition={{ duration: 0.2, delay: 0.03 }}
              style={{
                background: 'rgba(255, 51, 102, 0.25)',
                filter: 'blur(6px)',
              }}
            />
            {/* Slash line 1 — glow mid */}
            <AdaptiveMotion.div
              className="absolute top-1/2 left-0 w-full h-1.5 rounded-full -translate-y-1/2"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: [0, 1, 0.8] }}
              transition={{ duration: 0.2, delay: 0.04 }}
              style={{
                background: 'rgba(255, 51, 102, 0.55)',
                filter: 'blur(3px)',
              }}
            />
            {/* Slash line 1 — sharp core */}
            <AdaptiveMotion.div
              className="absolute top-1/2 left-0 w-full h-[3px] bg-neo-red rounded-full -translate-y-1/2"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: [0, 1, 0.8] }}
              transition={{ duration: 0.2, delay: 0.05 }}
              style={{ boxShadow: '0 0 14px rgba(255, 51, 102, 1)' }}
            />

            {/* Slash line 2 — glow base (rotated 45°) */}
            <AdaptiveMotion.div
              className="absolute top-1/2 left-0 w-full h-3 rounded-full -translate-y-1/2 rotate-45"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: [0, 1, 0.8] }}
              transition={{ duration: 0.2, delay: 0.08 }}
              style={{
                background: 'rgba(255, 51, 102, 0.25)',
                filter: 'blur(6px)',
              }}
            />
            {/* Slash line 2 — glow mid */}
            <AdaptiveMotion.div
              className="absolute top-1/2 left-0 w-full h-1.5 rounded-full -translate-y-1/2 rotate-45"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: [0, 1, 0.8] }}
              transition={{ duration: 0.2, delay: 0.09 }}
              style={{
                background: 'rgba(255, 51, 102, 0.55)',
                filter: 'blur(3px)',
              }}
            />
            {/* Slash line 2 — sharp core */}
            <AdaptiveMotion.div
              className="absolute top-1/2 left-0 w-full h-[3px] bg-neo-red rounded-full -translate-y-1/2 rotate-45"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: [0, 1, 0.8] }}
              transition={{ duration: 0.2, delay: 0.1 }}
              style={{ boxShadow: '0 0 14px rgba(255, 51, 102, 1)' }}
            />
          </div>
        </AdaptiveMotion.div>

        {/* Dramatic damage number */}
        {attackEffect.damage > 0 && (
          <AdaptiveMotion.div
            className="absolute top-1/3 left-1/2 -translate-x-1/2"
            initial={{ y: 0, opacity: 0, scale: 0.4 }}
            animate={{ y: -56, opacity: [0, 1, 1, 0], scale: [0.4, 1.5, 1.2] }}
            transition={{ duration: 0.85 }}
          >
            <span
              className="font-neo-display text-5xl font-black text-neo-red"
              style={{
                textShadow: '0 0 20px rgba(255,0,0,0.9), 0 3px 6px rgba(0,0,0,0.9)',
              }}
            >
              -{attackEffect.damage}
            </span>
          </AdaptiveMotion.div>
        )}
      </AdaptiveMotion.div>
    )}
  </AdaptiveAnimatePresence>
));

BossAttackEffect.displayName = 'BossAttackEffect';

export default BossAttackEffect;
