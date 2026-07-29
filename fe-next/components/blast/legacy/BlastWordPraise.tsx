'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';

interface BlastWordPraiseProps {
  /** Length of the last submitted word (0 = hidden) */
  wordLength: number;
  /** Incremented each time a word is submitted to retrigger animation */
  submitCount: number;
  /** Translation function */
  t: (key: string) => string | undefined;
}

/** Praise tiers by word length — maps to visual intensity */
const PRAISE_TIERS = [
  null, null, null, null, // 0-3: no praise
  { key: 'blast.praise.nice', color: 'text-neo-cyan', glow: 'rgba(0,255,255,0.3)', scale: 0.7 },       // 4
  { key: 'blast.praise.great', color: 'text-neo-lime', glow: 'rgba(191,255,0,0.35)', scale: 0.85 },     // 5
  { key: 'blast.praise.brilliant', color: 'text-yellow-300', glow: 'rgba(255,215,0,0.4)', scale: 1.0 },  // 6
  { key: 'blast.praise.amazing', color: 'text-neo-pink', glow: 'rgba(255,20,147,0.4)', scale: 1.15 },    // 7
  { key: 'blast.praise.legendary', color: 'text-purple-400', glow: 'rgba(168,85,247,0.5)', scale: 1.3 }, // 8+
] as const;

function getPraiseTier(wordLength: number) {
  if (wordLength < 4) return null;
  return PRAISE_TIERS[Math.min(wordLength, 8)]!;
}

/**
 * BlastWordPraise — shows contextual praise text ("Nice!", "LEGENDARY!") based on word length.
 * Appears briefly after each word submission, positioned above the board.
 */
export default function BlastWordPraise({ wordLength, submitCount, t }: BlastWordPraiseProps) {
  const [visible, setVisible] = useState(false);
  const [animKey, setAnimKey] = useState(0);
  const prevSubmitRef = useRef(submitCount);

  const dismiss = useCallback(() => setVisible(false), []);

  useEffect(() => {
    // Only trigger on new submissions
    if (submitCount === prevSubmitRef.current) return;
    prevSubmitRef.current = submitCount;

    const tier = getPraiseTier(wordLength);
    if (!tier) { setVisible(false); return; }

    setVisible(true);
    setAnimKey(k => k + 1);
    const id = setTimeout(dismiss, 900);
    return () => clearTimeout(id);
  }, [submitCount, wordLength, dismiss]);

  const tier = getPraiseTier(wordLength);

  return (
    <div className="absolute inset-x-0 top-[15%] pointer-events-none z-50 flex items-start justify-center">
      <AdaptiveAnimatePresence mode="wait">
        {visible && tier && (
          <AdaptiveMotion.div
            key={animKey}
            initial={{ scale: 0.2, opacity: 0, y: 24, rotate: -6 }}
            animate={{
              scale: [0.2, 1.25, 0.95, 1.05, 1],
              opacity: [0, 1, 1, 1, 1],
              y: [24, -6, 0, -2, 0],
              rotate: [-6, 3, -1, 1, 0],
            }}
            exit={{
              scale: 1.4,
              opacity: 0,
              y: -18,
              rotate: 4,
              transition: { duration: 0.25, ease: 'easeIn' },
            }}
            transition={{
              duration: 0.55,
              times: [0, 0.35, 0.6, 0.8, 1],
              ease: 'easeOut',
            }}
          >
            <AdaptiveMotion.span
              className={`${tier.color} font-neo-display font-black uppercase tracking-wider px-4 py-1 rounded-neo inline-block`}
              style={{
                fontSize: `${tier.scale * 2}rem`,
                textShadow: `0 2px 8px rgba(0,0,0,0.6), 0 0 16px ${tier.glow}`,
              }}
              animate={{ y: [0, -3, 0] }}
              transition={{ duration: 0.9, ease: 'easeInOut', repeat: 0 }}
            >
              {t(tier.key)}
            </AdaptiveMotion.span>
          </AdaptiveMotion.div>
        )}
      </AdaptiveAnimatePresence>
    </div>
  );
}
