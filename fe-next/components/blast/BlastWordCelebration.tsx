'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';

// ==================== Types ====================

export interface WordCelebration {
  id: string;
  tier: 1 | 2 | 3 | 4;
  wordLength: number;
  word: string;
  position: { x: number; y: number };
}

export interface BlastWordCelebrationProps {
  celebration: WordCelebration | null;
  onComplete: () => void;
}

// ==================== Config ====================

const TIER_TEXT_KEYS: Record<number, string> = {
  2: 'blast.scoreTier.amazing',
  3: 'blast.scoreTier.incredible',
  4: 'blast.scoreTier.frenzy',
};

const TIER_COLORS: Record<number, string> = {
  1: '#FFD700',
  2: '#FFD700',
  3: '#FF6B35',
  4: '', // rainbow
};

const TIER_GLOW: Record<number, string> = {
  2: '0 0 20px rgba(255,215,0,0.6)',
  3: '0 0 30px rgba(255,107,53,0.6), 0 0 60px rgba(255,107,53,0.2)',
  4: '0 0 40px rgba(255,20,147,0.6), 0 0 80px rgba(255,225,53,0.3)',
};

const BEAM_DURATION: Record<number, number> = { 1: 300, 2: 400, 3: 500, 4: 600 };
const AUTO_DISMISS: Record<number, number> = { 1: 500, 2: 1000, 3: 1200, 4: 1600 };

// ==================== Component ====================

/**
 * BlastWordCelebration — full-screen celebration overlay for impressive words.
 * Tier 1: quick shimmer. Tier 2: text + particles. Tier 3: dramatic beam + shake.
 * Tier 4: rainbow sweep + confetti + background flash.
 */
export function BlastWordCelebration({ celebration, onComplete }: BlastWordCelebrationProps) {
  const reduceMotion = useReducedMotion();
  const { t } = useLanguage();

  // Auto-dismiss after tier-specific duration
  useEffect(() => {
    if (!celebration) return;
    const ms = reduceMotion ? 100 : AUTO_DISMISS[celebration.tier] ?? 1000;
    const timer = setTimeout(onComplete, ms);
    return () => clearTimeout(timer);
  }, [celebration?.id, reduceMotion, onComplete, celebration]);

  if (!celebration) return null;
  if (reduceMotion) return null;

  const { tier, position } = celebration;
  const beamMs = BEAM_DURATION[tier] ?? 400;
  const textKey = TIER_TEXT_KEYS[tier];
  const color = TIER_COLORS[tier];
  const isRainbow = tier === 4;

  return (
    <div
      data-testid="blast-word-celebration"
      className="absolute inset-0 pointer-events-none z-50 overflow-hidden"
    >
      {/* Keyframes */}
      <style>{`
        @keyframes celebration-beam {
          0% { transform: translateX(-60px) rotate(15deg); }
          100% { transform: translateX(calc(100vw + 60px)) rotate(15deg); }
        }
        @keyframes celebration-star {
          0% { transform: scale(0) rotate(0deg); opacity: 1; }
          70% { opacity: 0.8; }
          100% { transform: scale(1) rotate(180deg); opacity: 0; }
        }
      `}</style>

      {/* Light beam sweep */}
      <div
        data-testid="celebration-light-beam"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: tier >= 3 ? 40 : 20,
          height: '100%',
          background: isRainbow
            ? 'linear-gradient(90deg, transparent, rgba(255,20,147,0.25), rgba(255,225,53,0.2), rgba(0,255,255,0.25), transparent)'
            : `linear-gradient(90deg, transparent, rgba(255,215,0,${tier >= 2 ? 0.2 : 0.12}), transparent)`,
          animation: `celebration-beam ${beamMs}ms ease-in-out forwards`,
          willChange: 'transform',
        }}
      />

      {/* Celebration text (tier 2+) */}
      {tier >= 2 && textKey && (
        <AnimatePresence>
          <motion.div
            data-testid="celebration-text"
            className="absolute font-neo-display font-black select-none"
            style={{
              left: position.x,
              top: position.y,
              transform: 'translate(-50%, -50%)',
              fontSize: tier === 4 ? 28 : tier === 3 ? 24 : 20,
              color: isRainbow ? undefined : color,
              backgroundImage: isRainbow
                ? 'linear-gradient(90deg, #FF1493, #FFE135, #00FFFF, #7FFF00, #FF1493)'
                : undefined,
              backgroundClip: isRainbow ? 'text' : undefined,
              WebkitBackgroundClip: isRainbow ? 'text' : undefined,
              WebkitTextFillColor: isRainbow ? 'transparent' : undefined,
              textShadow: TIER_GLOW[tier] ?? 'none',
              zIndex: 10,
            }}
            initial={{ scale: 0, opacity: 0, y: 0 }}
            animate={{ scale: [0, 1.3, 1.0], opacity: [0, 1, 1], y: -40 }}
            exit={{ opacity: 0, y: -60 }}
            transition={{ duration: 0.6, times: [0, 0.4, 1] }}
          >
            {t(textKey)}
          </motion.div>
        </AnimatePresence>
      )}

      {/* Star particles (tier 2+) */}
      {tier >= 2 && Array.from({ length: tier === 4 ? 16 : tier === 3 ? 10 : 6 }, (_, i) => {
        const angle = (i / (tier === 4 ? 16 : tier === 3 ? 10 : 6)) * Math.PI * 2;
        const dist = 40 + Math.random() * 60;
        const tx = Math.cos(angle) * dist;
        const ty = Math.sin(angle) * dist;
        const size = 4 + Math.random() * 4;
        const starColor = PARTICLE_COLORS[i % PARTICLE_COLORS.length];
        return (
          <motion.div
            key={i}
            className="absolute rounded-sm"
            style={{
              left: position.x,
              top: position.y,
              width: size,
              height: size,
              backgroundColor: starColor,
              boxShadow: `0 0 6px ${starColor}`,
            }}
            initial={{ scale: 0, x: 0, y: 0, opacity: 1 }}
            animate={{ scale: [0, 1.2, 0], x: tx, y: ty, opacity: [1, 0.8, 0] }}
            transition={{ duration: 0.5 + Math.random() * 0.3, delay: Math.random() * 0.1 }}
          />
        );
      })}

      {/* Background flash (tier 4) */}
      {tier === 4 && (
        <motion.div
          data-testid="celebration-bg-flash"
          className="absolute inset-0"
          style={{ background: 'rgba(255,255,255,0.08)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 0.4 }}
        />
      )}
    </div>
  );
}

const PARTICLE_COLORS = ['#FFD700', '#FF1493', '#00FFFF', '#7FFF00', '#FF6B35', '#A855F7'];
