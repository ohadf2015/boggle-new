'use client';

import React, { memo, useRef } from 'react';
import { m, useReducedMotion } from 'framer-motion';
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
    <m.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 20 }}
      className={cn(
        'bg-neo-black border-3 border-neo-black py-2.5 overflow-hidden relative shadow-hard',
        className,
      )}
    >
      {/* Halftone texture */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[radial-gradient(circle,#fff_1px,transparent_1px)] bg-size-[6px_6px]" />

      {/* Edge fade masks */}
      <div className="absolute inset-y-0 inset-s-0 w-8 bg-linear-to-e from-neo-black to-transparent z-20 pointer-events-none" />
      <div className="absolute inset-y-0 inset-e-0 w-8 bg-linear-to-s from-neo-black to-transparent z-20 pointer-events-none" style={{ background: 'linear-gradient(to left, var(--neo-black), transparent)' }} />

      <div
        ref={contentRef}
        className={cn(
          'inline-block whitespace-nowrap font-black text-[10px] uppercase tracking-[0.2em]',
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
                <span className="text-neo-lime drop-shadow-[0_0_4px_rgba(191,255,0,0.3)]">{w.word.toUpperCase()}</span>
                {' '}
                <span className="text-white text-[9px]">+{w.score}</span>
                {i < tickerWords.length - 1 && (
                  <span className="text-neo-lime/20 mx-3">◆</span>
                )}
              </React.Fragment>
            ))}
            {copy === 0 && <span className="text-neo-lime/20 mx-3">◆</span>}
          </span>
        ))}
      </div>

      {/* Shimmer overlay — sweeps across the ticker */}
      {!reducedMotion && (
        <m.div
          className="absolute inset-0 pointer-events-none z-10"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(191,255,0,0.08) 20%, rgba(0,255,255,0.06) 40%, transparent 60%)',
            backgroundSize: '200% 100%',
          }}
          animate={{ backgroundPosition: ['200% 0', '-200% 0'] }}
          transition={{ duration: 3, ease: 'linear', repeat: Infinity }}
        />
      )}
      <style>{`
        @keyframes fight-card-marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </m.div>
  );
});

WordMarqueeTicker.displayName = 'WordMarqueeTicker';

export default WordMarqueeTicker;
