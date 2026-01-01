'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useReducedMotion } from '@/utils/accessibility';

interface CoinParticle {
  id: number;
  delay: number;
  offsetX: number;
  offsetY: number;
}

interface FloatingCoinAnimationProps {
  /** Number of coins to display (triggers animation when changes to > 0) */
  coinAmount: number | null;
  /** Position to start from (default: center of viewport) */
  startPosition?: { x: number; y: number };
  /** Callback when animation completes */
  onAnimationComplete?: () => void;
  /** Custom class for positioning */
  className?: string;
}

/**
 * FloatingCoinAnimation - Animated coins flying from source to top-right corner
 * Used for combo milestone rewards to show coins being earned
 */
const FloatingCoinAnimation: React.FC<FloatingCoinAnimationProps> = ({
  coinAmount,
  startPosition,
  onAnimationComplete,
  className,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const [showAnimation, setShowAnimation] = useState(false);
  const [displayAmount, setDisplayAmount] = useState<number | null>(null);
  const [particles, setParticles] = useState<CoinParticle[]>([]);

  // Generate coin particles based on amount (max 8 for performance)
  const generateParticles = useCallback((amount: number): CoinParticle[] => {
    const count = Math.min(Math.max(3, Math.ceil(amount / 3)), 8);
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      delay: i * 0.08,
      offsetX: (Math.random() - 0.5) * 40,
      offsetY: (Math.random() - 0.5) * 30,
    }));
  }, []);

  // Trigger animation when coinAmount changes to a positive value
  useEffect(() => {
    if (coinAmount !== null && coinAmount > 0) {
      setDisplayAmount(coinAmount);
      setParticles(generateParticles(coinAmount));
      setShowAnimation(true);

      // Auto-dismiss after animation completes
      const timer = setTimeout(() => {
        setShowAnimation(false);
        onAnimationComplete?.();
      }, 1500);

      return () => clearTimeout(timer);
    }
    return undefined;
  }, [coinAmount, generateParticles, onAnimationComplete]);

  if (!showAnimation || displayAmount === null || displayAmount <= 0) {
    return null;
  }

  // For reduced motion, show a simple fade animation
  if (prefersReducedMotion) {
    return (
      <motion.div
        className={`fixed z-[100] pointer-events-none ${className || ''}`}
        style={{
          left: startPosition?.x ?? '50%',
          top: startPosition?.y ?? '40%',
          transform: 'translate(-50%, -50%)',
        }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-gradient-to-r from-yellow-400 to-orange-400 text-white font-bold shadow-lg">
          <span>💰</span>
          <span>+{displayAmount}</span>
        </div>
      </motion.div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <div
        className={`fixed inset-0 z-[100] pointer-events-none overflow-hidden ${className || ''}`}
      >
        {/* Central coin burst with amount */}
        <motion.div
          className="absolute flex items-center gap-1.5"
          style={{
            left: startPosition?.x ?? '50%',
            top: startPosition?.y ?? '35%',
            transform: 'translate(-50%, -50%)',
          }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{
            scale: [0, 1.3, 1],
            opacity: [0, 1, 1, 0],
          }}
          transition={{
            duration: 1.2,
            times: [0, 0.2, 0.5, 1],
            ease: 'easeOut',
          }}
        >
          <motion.div
            className="px-4 py-2 rounded-full bg-gradient-to-r from-yellow-400 via-amber-400 to-orange-400 text-white font-black text-xl shadow-xl border-2 border-yellow-200"
            style={{
              filter: 'drop-shadow(0 0 12px rgba(251, 191, 36, 0.6))',
            }}
            animate={{
              boxShadow: [
                '0 0 0 0 rgba(251, 191, 36, 0.4)',
                '0 0 0 15px rgba(251, 191, 36, 0)',
              ],
            }}
            transition={{
              duration: 0.6,
              repeat: 1,
            }}
          >
            <span className="flex items-center gap-2">
              <motion.span
                animate={{ rotate: [0, 15, -15, 0] }}
                transition={{ duration: 0.5 }}
              >
                💰
              </motion.span>
              <span>+{displayAmount}</span>
            </span>
          </motion.div>
        </motion.div>

        {/* Flying coin particles */}
        {particles.map((particle) => (
          <motion.div
            key={`coin-${particle.id}`}
            className="absolute w-6 h-6 text-2xl"
            style={{
              left: startPosition?.x ?? '50%',
              top: startPosition?.y ?? '35%',
            }}
            initial={{
              x: particle.offsetX,
              y: particle.offsetY,
              scale: 0,
              opacity: 0,
            }}
            animate={{
              x: [
                particle.offsetX,
                particle.offsetX + (particle.id % 2 === 0 ? 30 : -30),
                'calc(100vw - 80px - 50%)',
              ],
              y: [
                particle.offsetY,
                particle.offsetY - 50,
                'calc(-35vh + 40px)',
              ],
              scale: [0, 1.2, 1, 0.6],
              opacity: [0, 1, 1, 0],
              rotate: [0, 180, 360],
            }}
            transition={{
              duration: 1.2,
              delay: particle.delay,
              ease: [0.25, 0.1, 0.25, 1],
              times: [0, 0.2, 0.8, 1],
            }}
          >
            🪙
          </motion.div>
        ))}

        {/* Sparkle effects */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={`sparkle-${i}`}
            className="absolute w-2 h-2 rounded-full bg-yellow-300"
            style={{
              left: startPosition?.x ?? '50%',
              top: startPosition?.y ?? '35%',
              filter: 'blur(1px)',
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{
              x: Math.cos((i * 60) * (Math.PI / 180)) * 60,
              y: Math.sin((i * 60) * (Math.PI / 180)) * 60,
              scale: [0, 1.5, 0],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 0.6,
              delay: 0.1 + i * 0.05,
              ease: 'easeOut',
            }}
          />
        ))}
      </div>
    </AnimatePresence>
  );
};

export default FloatingCoinAnimation;
