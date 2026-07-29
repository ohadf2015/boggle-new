'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { getRandomWaveClear } from './blastEffectVariations';

interface BlastWaveClearTextProps {
  waveCleared: boolean;
  movesRemaining: number;
  /** Translation function */
  t: (key: string) => string | undefined;
}

interface WaveClearTier {
  text: string;
  color: string;
  glow: string;
  scale: number;
}

const LEFTOVER_MOVE_BONUS = 5;

/** Tier config without text — text comes from translations */
const WAVE_CLEAR_TIERS = {
  perfect: { key: 'blast.waveClear.perfect', fallback: 'PERFECT!', color: 'text-neo-lime', glow: 'rgba(191,255,0,0.5)', scale: 1.4 },
  great:   { key: 'blast.waveClear.great',   fallback: 'GREAT!',   color: 'text-neo-cyan', glow: 'rgba(0,255,255,0.4)', scale: 1.1 },
  clear:   { key: 'blast.waveClear.clear',   fallback: 'CLEAR!',   color: 'text-yellow-300', glow: 'rgba(255,215,0,0.3)', scale: 0.9 },
} as const;

type WaveClearTierKey = keyof typeof WAVE_CLEAR_TIERS;

/** Determine celebration tier based on leftover moves */
export function getWaveClearTier(movesRemaining: number, t?: (key: string) => string | undefined): WaveClearTier {
  const tierKey: WaveClearTierKey = movesRemaining >= 5 ? 'perfect' : movesRemaining >= 3 ? 'great' : 'clear';
  const tier = WAVE_CLEAR_TIERS[tierKey];
  const text = t?.(tier.key) || tier.fallback;
  return { text, color: tier.color, glow: tier.glow, scale: tier.scale };
}

export function BlastWaveClearText({ waveCleared, movesRemaining, t }: BlastWaveClearTextProps) {
  const [visible, setVisible] = useState(false);
  const [key, setKey] = useState(0);

  const dismiss = useCallback(() => setVisible(false), []);
  const variationRef = useRef(getRandomWaveClear());

  useEffect(() => {
    if (!waveCleared) { setVisible(false); return; }
    variationRef.current = getRandomWaveClear();
    setVisible(true);
    setKey(k => k + 1);
    const id = setTimeout(dismiss, 1500);
    return () => clearTimeout(id);
  }, [waveCleared, dismiss]);

  if (!visible) return null;

  const tier = getWaveClearTier(movesRemaining, t);
  const bonusPoints = movesRemaining * LEFTOVER_MOVE_BONUS;

  return (
    <div className="absolute inset-0 pointer-events-none z-50 flex flex-col items-center justify-center gap-2">
      <AdaptiveAnimatePresence mode="wait">
        <AdaptiveMotion.div
          key={key}
          initial={variationRef.current.initial}
          animate={variationRef.current.animate}
          exit={variationRef.current.exit}
          transition={variationRef.current.transition}
        >
          <AdaptiveMotion.span
            className={`${tier.color} font-neo-display font-black uppercase tracking-wider px-6 py-2 rounded-neo bg-black/60 inline-block`}
            style={{
              fontSize: `${tier.scale * 2.5}rem`,
              textShadow: `0 2px 8px rgba(0,0,0,0.5), 0 0 28px ${tier.glow}, 0 0 44px ${tier.glow}`,
            }}
            animate={{ scale: [1, 1.08, 0.98, 1.03, 1], y: [0, -4, 0, -2, 0] }}
            transition={{ duration: 1.1, times: [0, 0.25, 0.5, 0.75, 1], ease: 'easeInOut' }}
          >
            {tier.text}
          </AdaptiveMotion.span>
        </AdaptiveMotion.div>
      </AdaptiveAnimatePresence>
      {bonusPoints > 0 && (
        <AdaptiveAnimatePresence>
          <AdaptiveMotion.div
            key={`bonus-${key}`}
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <span className="text-neo-lime font-neo-display font-bold text-lg bg-black/40 px-3 py-1 rounded">
              +{bonusPoints}
            </span>
          </AdaptiveMotion.div>
        </AdaptiveAnimatePresence>
      )}
    </div>
  );
}

export default BlastWaveClearText;
