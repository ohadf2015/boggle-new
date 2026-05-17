'use client';

import { memo, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { GEM_COLORS, WIN_RARITY } from '@/lib/word-craft/gems/types';
import { GemIcon } from './GemIcon';

export interface GemHuntWinSceneProps {
  totalScore: number;
  turnIndex: number;
  outcome: 'won' | 'lost';
  onRestart: () => void;
  labels: {
    titleWon: string;
    titleLost: string;
    subtitleWon: string;
    subtitleLost: string;
    score: string;
    turns: string;
    restart: string;
  };
}

function GemHuntWinSceneImpl({ totalScore, turnIndex, outcome, onRestart, labels }: GemHuntWinSceneProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!cardRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo('[data-win-card]', { y: 30, opacity: 0, scale: 0.85 }, { y: 0, opacity: 1, scale: 1, duration: 0.45, ease: 'back.out(1.6)' });
      gsap.fromTo(
        '[data-win-gem]',
        { y: -50, opacity: 0, rotation: 180 },
        { y: 0, opacity: 1, rotation: 0, duration: 0.55, ease: 'back.out(2)', stagger: 0.08, delay: 0.25 },
      );
    }, cardRef);
    return () => ctx.revert();
  }, []);

  const isWin = outcome === 'won';
  return (
    <div
      ref={cardRef}
      role="dialog"
      aria-modal="true"
      className="absolute inset-0 z-50 flex items-center justify-center bg-neo-navy/85 p-4 backdrop-blur-sm"
    >
      <div
        data-win-card
        className="w-full max-w-sm rounded-neo border-neo-thick border-black bg-neo-navy-light p-5 text-center shadow-hard-lg"
      >
        <h2
          className={`mb-1 font-neo-display text-3xl font-black uppercase tracking-wider ${isWin ? 'text-neo-yellow' : 'text-neo-red'}`}
        >
          {isWin ? labels.titleWon : labels.titleLost}
        </h2>
        <p className="mb-3 font-neo-body text-sm text-neo-cream/80">
          {isWin ? labels.subtitleWon : labels.subtitleLost}
        </p>
        <div className="mb-4 flex items-center justify-center gap-2">
          {GEM_COLORS.map((color) => (
            <span key={color} data-win-gem>
              <GemIcon color={color} rarity={WIN_RARITY} sizePx={28} withRing />
            </span>
          ))}
        </div>
        <div className="mb-4 flex items-center justify-around font-neo-display text-xs uppercase tracking-wider text-neo-cream/70">
          <span>{labels.score} <span className="ms-1 text-neo-lime text-lg tabular-nums">{totalScore}</span></span>
          <span>{labels.turns} <span className="ms-1 text-neo-cyan text-lg tabular-nums">{turnIndex}</span></span>
        </div>
        <button
          type="button"
          onClick={onRestart}
          className="w-full rounded-neo border-neo-thick border-black bg-neo-lime px-4 py-2 font-neo-display text-base font-black uppercase tracking-wider text-neo-navy shadow-hard transition-transform active:translate-y-0.5 active:shadow-hard-pressed"
        >
          {labels.restart}
        </button>
      </div>
    </div>
  );
}

export const GemHuntWinScene = memo(GemHuntWinSceneImpl);
