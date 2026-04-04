'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { getRandomWaveClear } from './blastEffectVariations';

interface BlastWaveClearTextProps {
  waveCleared: boolean;
  movesRemaining: number;
}

interface WaveClearTier {
  text: string;
  color: string;
  glow: string;
  scale: number;
}

const LEFTOVER_MOVE_BONUS = 5;

/** Determine celebration tier based on leftover moves */
export function getWaveClearTier(movesRemaining: number): WaveClearTier {
  if (movesRemaining >= 5) {
    return { text: 'PERFECT!', color: 'text-neo-lime', glow: 'rgba(191,255,0,0.5)', scale: 1.4 };
  }
  if (movesRemaining >= 3) {
    return { text: 'GREAT!', color: 'text-neo-cyan', glow: 'rgba(0,255,255,0.4)', scale: 1.1 };
  }
  return { text: 'CLEAR!', color: 'text-yellow-300', glow: 'rgba(255,215,0,0.3)', scale: 0.9 };
}

export function BlastWaveClearText({ waveCleared, movesRemaining }: BlastWaveClearTextProps) {
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

  const tier = getWaveClearTier(movesRemaining);
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
          <span
            className={`${tier.color} font-neo-display font-black uppercase tracking-wider px-6 py-2 rounded-neo bg-black/60`}
            style={{
              fontSize: `${tier.scale * 2.5}rem`,
              textShadow: `0 2px 8px rgba(0,0,0,0.5), 0 0 20px ${tier.glow}`,
            }}
          >
            {tier.text}
          </span>
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
