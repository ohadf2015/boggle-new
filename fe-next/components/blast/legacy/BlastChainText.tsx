'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { getRandomChainEntrance } from './blastEffectVariations';

interface BlastChainTextProps {
  /** Current chain level (0 = none, 1+ = show text) */
  chainLevel: number;
  /** Word length that triggered this (for word-length celebrations) */
  wordLength?: number;
  /** Translation function */
  t: (key: string) => string | undefined;
}

const TIERS = [
  null, // 0 - hidden
  { key: 'blast.chain.cascade', color: 'text-yellow-300', glow: 'rgba(255,215,0,0.4)', scale: 0.85 },
  { key: 'blast.chain.double', color: 'text-neo-cyan', glow: 'rgba(0,255,255,0.4)', scale: 1.0 },
  { key: 'blast.chain.triple', color: 'text-neo-lime', glow: 'rgba(191,255,0,0.4)', scale: 1.2 },
  { key: 'blast.chain.mega', color: 'text-neo-pink', glow: 'rgba(255,20,147,0.4)', scale: 1.4 },
  { key: 'blast.chain.ultra', color: 'text-purple-400', glow: 'rgba(168,85,247,0.5)', scale: 1.6 },
] as const;

function getChainTier(chainLevel: number) {
  if (chainLevel < 1) return null;
  return TIERS[Math.min(chainLevel, 5)]!;
}

function getWordTier(wordLength: number | undefined) {
  if (!wordLength || wordLength <= 4) return null;
  if (wordLength === 5) return TIERS[2]!;
  if (wordLength === 6) return TIERS[3]!;
  return TIERS[4]!;
}

function getTier(chainLevel: number, wordLength?: number) {
  const chain = getChainTier(chainLevel);
  const word = getWordTier(wordLength);
  if (!chain) return word;
  if (!word) return chain;
  return chain.scale >= word.scale ? chain : word;
}

export default function BlastChainText({ chainLevel, wordLength, t }: BlastChainTextProps) {
  const [visible, setVisible] = useState(false);
  const [animKey, setAnimKey] = useState(0);
  const entranceRef = useRef(getRandomChainEntrance());

  const tier = getTier(chainLevel, wordLength);

  const dismiss = useCallback(() => setVisible(false), []);

  useEffect(() => {
    if (!tier) { setVisible(false); return; }
    entranceRef.current = getRandomChainEntrance();
    setVisible(true);
    setAnimKey(k => k + 1);
    const id = setTimeout(dismiss, 800);
    return () => clearTimeout(id);
  }, [chainLevel, wordLength, tier, dismiss]);

  return (
    <div className="absolute inset-0 pointer-events-none z-40 flex items-center justify-center">
      <AdaptiveAnimatePresence mode="wait">
        {visible && tier && (
          <AdaptiveMotion.div
            key={animKey}
            initial={entranceRef.current.initial}
            animate={entranceRef.current.animate}
            exit={entranceRef.current.exit}
            transition={entranceRef.current.transition}
          >
            <span
              className={`${tier.color} font-neo-display font-black uppercase tracking-wider px-6 py-2 rounded-neo bg-black/60`}
              style={{
                fontSize: `${tier.scale * 2.5}rem`,
                textShadow: `0 2px 8px rgba(0,0,0,0.5), 0 0 20px ${tier.glow}`,
              }}
            >
              {t(tier.key)}
            </span>
          </AdaptiveMotion.div>
        )}
      </AdaptiveAnimatePresence>
    </div>
  );
}
