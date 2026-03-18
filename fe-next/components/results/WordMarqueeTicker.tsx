'use client';

import React, { memo, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface WordMarqueeTickerProps {
  /** Words with scores to display in ticker */
  words: Array<{ word: string; score: number }>;
  /** Game mode for mode-specific display */
  gameMode?: string;
  className?: string;
}

/**
 * WordMarqueeTicker — Scrolling word ticker showing found words + scores.
 * Fight Card style: black bg, neo-border, lime text, infinite CSS scroll.
 */
const WordMarqueeTicker: React.FC<WordMarqueeTickerProps> = memo(({
  words,
  className,
}) => {
  const reducedMotion = useReducedMotion();
  const contentRef = useRef<HTMLDivElement>(null);

  // Take top ~10 words by score for the ticker
  const tickerWords = [...words]
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  if (words.length === 0) return null;

  const duration = Math.max(12, tickerWords.length * 3);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 20 }}
      className={cn(
        'bg-neo-black border-3 border-slate-800 py-2 overflow-hidden relative shadow-hard',
        className,
      )}
    >
      <div
        ref={contentRef}
        className={cn(
          'inline-block whitespace-nowrap font-black text-[10px] uppercase tracking-widest',
          reducedMotion && 'overflow-x-auto',
        )}
        style={!reducedMotion ? {
          animation: `fight-card-marquee ${duration}s linear infinite`,
        } : undefined}
      >
        {/* Render content twice for seamless loop */}
        {[0, 1].map((copy) => (
          <span key={copy} className="inline-block">
            {tickerWords.map((w, i) => (
              <React.Fragment key={`${copy}-${i}`}>
                <span className="text-neo-lime">{w.word.toUpperCase()}</span>
                {' '}
                <span className="text-white/60">({w.score})</span>
                {i < tickerWords.length - 1 && (
                  <span className="text-white/30 mx-3">&bull;</span>
                )}
              </React.Fragment>
            ))}
            {copy === 0 && <span className="text-white/30 mx-3">&bull;</span>}
          </span>
        ))}
      </div>

      <style>{`
        @keyframes fight-card-marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </motion.div>
  );
});

WordMarqueeTicker.displayName = 'WordMarqueeTicker';

export default WordMarqueeTicker;
