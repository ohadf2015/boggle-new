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

const BEAM_DURATION: Record<number, number> = { 1: 200, 2: 250, 3: 300, 4: 400 };
const AUTO_DISMISS: Record<number, number> = { 1: 250, 2: 600, 3: 800, 4: 1000 };

/** Seeded random offsets for particle animations (avoids Math.random in render) */
const PARTICLE_OFFSETS = Array.from({ length: 16 }, (_, i) => ({
  distOffset: ((i * 37 + 13) % 60),
  sizeOffset: ((i * 23 + 7) % 4),
  durationOffset: ((i * 41 + 11) % 30) / 100,
  delayOffset: ((i * 19 + 3) % 10) / 100,
}));

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

  // Skip tier 1 — a light beam for every normal word is noise, not celebration
  if (celebration.tier === 1) return null;

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
        @keyframes celebration-shockwave {
          0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(12); opacity: 0; }
        }
      `}</style>

      {/* Light beam sweep — wider and more dramatic */}
      <div
        data-testid="celebration-light-beam"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: tier >= 3 ? 60 : tier >= 2 ? 35 : 20,
          height: '100%',
          background: isRainbow
            ? 'linear-gradient(90deg, transparent, rgba(255,20,147,0.3), rgba(255,225,53,0.25), rgba(0,255,255,0.3), transparent)'
            : `linear-gradient(90deg, transparent, rgba(255,215,0,${tier >= 2 ? 0.25 : 0.15}), transparent)`,
          animation: `celebration-beam ${beamMs}ms ease-in-out forwards`,
          willChange: 'transform',
        }}
      />

      {/* Shockwave ring — expands from word position (tier 3+) */}
      {tier >= 3 && (
        <div
          data-testid="celebration-shockwave"
          style={{
            position: 'absolute',
            left: position.x,
            top: position.y,
            width: 20,
            height: 20,
            transform: 'translate(-50%, -50%)',
            borderRadius: '50%',
            border: `2px solid ${isRainbow ? 'rgba(255,20,147,0.6)' : 'rgba(255,215,0,0.6)'}`,
            boxShadow: `0 0 15px ${isRainbow ? 'rgba(255,20,147,0.3)' : 'rgba(255,215,0,0.3)'}`,
            animation: 'celebration-shockwave 0.6s ease-out forwards',
          }}
        />
      )}

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

      {/* Star particles (tier 2+) — more particles, larger travel, brighter glow */}
      {tier >= 2 && Array.from({ length: tier === 4 ? 12 : tier === 3 ? 8 : 5 }, (_, i) => {
        const count = tier === 4 ? 12 : tier === 3 ? 8 : 5;
        const angle = (i / count) * Math.PI * 2;
        const offsets = PARTICLE_OFFSETS[i];
        const dist = 50 + offsets.distOffset * 1.5; // Travel further
        const tx = Math.cos(angle) * dist;
        const ty = Math.sin(angle) * dist;
        const size = 5 + offsets.sizeOffset;
        const starColor = PARTICLE_COLORS[i % PARTICLE_COLORS.length];
        const isOdd = i % 2 === 1;
        return (
          <motion.div
            key={i}
            className={isOdd ? 'absolute rounded-full' : 'absolute rounded-sm'}
            style={{
              left: position.x,
              top: position.y,
              width: size,
              height: size,
              backgroundColor: starColor,
              boxShadow: `0 0 ${size * 2}px ${starColor}, 0 0 ${size * 4}px ${starColor}50`,
            }}
            initial={{ scale: 0, x: 0, y: 0, opacity: 1, rotate: 0 }}
            animate={{
              scale: [0, 1.5, 0],
              x: tx,
              y: ty,
              opacity: [1, 0.9, 0],
              rotate: isOdd ? 180 : -90,
            }}
            transition={{ duration: 0.6 + offsets.durationOffset, delay: offsets.delayOffset }}
          />
        );
      })}

      {/* Background flash removed — was stacking with BlastComboFlash creating double-flash */}
    </div>
  );
}

const PARTICLE_COLORS = ['#FFD700', '#FF1493', '#00FFFF', '#7FFF00', '#FF6B35', '#A855F7'];
