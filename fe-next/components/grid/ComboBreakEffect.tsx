'use client';

import React, { useEffect, useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { useReducedMotion } from '../../utils/accessibility';

interface ComboBreakEffectProps {
  /** The combo level that was lost (triggers animation when > 0) */
  lostComboLevel: number | null;
  /** Callback when animation completes */
  onAnimationComplete?: () => void;
}

/**
 * ComboBreakEffect - Visual feedback when a combo is lost
 * Shows a brief "deflating" animation with ghost text of lost combo
 * Designed to be tangible but not punishing
 */
const ComboBreakEffect: React.FC<ComboBreakEffectProps> = ({
  lostComboLevel,
  onAnimationComplete,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const [showEffect, setShowEffect] = useState(false);
  const [displayLevel, setDisplayLevel] = useState<number | null>(null);

  // Trigger animation when lostComboLevel changes to a positive value
  useEffect(() => {
    if (lostComboLevel !== null && lostComboLevel > 0) {
      setDisplayLevel(lostComboLevel);
      setShowEffect(true);

      // Auto-dismiss after animation
      const timer = setTimeout(() => {
        setShowEffect(false);
        onAnimationComplete?.();
      }, 1200);

      return () => clearTimeout(timer);
    }
    return undefined;
  }, [lostComboLevel, onAnimationComplete]);

  // Don't render if no effect to show
  if (!showEffect || displayLevel === null || displayLevel < 1) {
    return null;
  }

  // Only show "Lost" text for combos >= 3 (meaningful combos)
  const showLostText = displayLevel >= 3;
  const isHighCombo = displayLevel >= 5;

  return (
    <AnimatePresence mode="wait">
      <m.div
        key={`combo-break-${displayLevel}`}
        className="fixed top-28 left-1/2 -translate-x-1/2 z-79 pointer-events-none flex flex-col items-center"
        initial={{ opacity: 1 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Brief screen flash overlay - very subtle desaturation effect */}
        {!prefersReducedMotion && (
          <m.div
            className="fixed inset-0 pointer-events-none"
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.1)',
              mixBlendMode: 'saturation',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.3, 0] }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />
        )}

        {/* Deflating badge animation */}
        <m.div
          initial={{ scale: 1, opacity: 0.8, y: 0 }}
          animate={{
            scale: [1, 0.9, 0.7, 0.4, 0],
            opacity: [0.8, 0.6, 0.4, 0.2, 0],
            y: [0, 5, 15, 30, 50],
          }}
          transition={{
            duration: 0.8,
            ease: [0.4, 0, 0.2, 1],
          }}
          className="px-5 py-2.5 rounded-full font-extrabold text-xl text-white relative overflow-hidden bg-linear-to-r from-gray-500 via-gray-600 to-gray-500 border-2 border-white/20"
          style={{
            filter: 'drop-shadow(0 0 8px rgba(128, 128, 128, 0.4)) grayscale(0.5)',
          }}
        >
          <span className="relative z-10">
            💨 x{displayLevel}
          </span>
        </m.div>

        {/* Ghost text showing what was lost - only for meaningful combos */}
        {showLostText && (
          <m.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{
              opacity: [0, 0.7, 0.7, 0],
              y: [10, 0, 0, -20],
              scale: [0.9, 1, 1, 0.9],
            }}
            transition={{
              duration: 1,
              times: [0, 0.2, 0.7, 1],
              ease: 'easeOut',
            }}
            className="mt-2"
          >
            <span
              className="text-xs font-bold uppercase tracking-wide px-2 py-0.5 rounded"
              style={{
                background: 'rgba(0, 0, 0, 0.6)',
                color: isHighCombo ? '#FF6B35' : 'rgba(255, 255, 255, 0.7)',
                textShadow: '0 1px 2px rgba(0,0,0,0.5)',
              }}
            >
              {isHighCombo ? `Lost x${displayLevel} combo...` : 'Combo lost'}
            </span>
          </m.div>
        )}

        {/* Particle scatter effect for high combos */}
        {!prefersReducedMotion && isHighCombo && (
          <>
            {[...Array(6)].map((_, i) => (
              <m.div
                key={`particle-${i}`}
                className="absolute w-1.5 h-1.5 rounded-full bg-orange-400/60"
                style={{
                  left: '50%',
                  top: '50%',
                }}
                initial={{ x: 0, y: 0, opacity: 0.8, scale: 1 }}
                animate={{
                  x: Math.cos((i * 60) * (Math.PI / 180)) * (40 + i * 10),
                  y: Math.sin((i * 60) * (Math.PI / 180)) * (40 + i * 10) + 30,
                  opacity: [0.8, 0.4, 0],
                  scale: [1, 0.6, 0],
                }}
                transition={{
                  duration: 0.6,
                  delay: i * 0.03,
                  ease: 'easeOut',
                }}
              />
            ))}
          </>
        )}
      </m.div>
    </AnimatePresence>
  );
};

export default ComboBreakEffect;
