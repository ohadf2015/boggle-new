'use client';

import React, { useEffect, useRef, useState, type ReactNode } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Settlement } from '../../lib/sealedBid/sp/wager';
import { SharedFxApp } from '../../lib/pixiFx/SharedFxApp';
import gsap from 'gsap';

export interface ShowdownProps {
  playerWord: string | null;
  bots: { name: string; word: string }[];
  settlement: Settlement;
  reducedMotion?: boolean;
  onDone: () => void;
  payoutTargetRef?: React.RefObject<HTMLElement>;
}

export default function Showdown({
  playerWord,
  bots,
  settlement,
  reducedMotion = false,
  onDone,
  payoutTargetRef,
}: ShowdownProps): React.ReactNode {
  const { t } = useLanguage();
  const cardRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [revealed, setRevealed] = useState(reducedMotion);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Determine banner styling and text based on outcome
  const isBanner = {
    unique: settlement.outcome === 'unique',
    clash: settlement.outcome === 'clash',
    neutral: settlement.outcome === 'none',
  };

  const bannerText = isBanner.unique
    ? t('sealedBid.youWin') || 'You Win!'
    : isBanner.clash
      ? t('sealedBid.youLose') || 'Clashed'
      : t('sealedBid.draw') || 'Draw';

  const deltaText = `${settlement.delta >= 0 ? '+' : ''}${settlement.delta}`;

  // Animate cards flipping when not reducedMotion
  useEffect(() => {
    if (reducedMotion) {
      setRevealed(true);
      return;
    }

    // Staggered flip animation for each card
    cardRefs.current.forEach((card, index) => {
      if (!card) return;
      const flipDuration = 0.6;
      const staggerDelay = index * 0.15;

      gsap.to(card, {
        rotationY: 180,
        duration: flipDuration,
        delay: staggerDelay + 0.3,
        ease: 'back.out',
      });
    });

    // Mark as revealed after first card flip completes
    const revealTimeout = setTimeout(() => {
      setRevealed(true);
    }, 500);

    return () => clearTimeout(revealTimeout);
  }, [reducedMotion]);

  // Spawn coin stream FX on unique win
  useEffect(() => {
    if (reducedMotion || settlement.outcome !== 'unique' || !revealed) return;

    const triggerFX = async () => {
      // Find the winning card center (first bot card or player area)
      let sourceRect: DOMRect | null = null;
      if (cardRefs.current[0]) {
        sourceRect = cardRefs.current[0].getBoundingClientRect();
      }

      if (sourceRect && payoutTargetRef?.current) {
        const targetRect = payoutTargetRef.current.getBoundingClientRect();
        const source = {
          x: sourceRect.left + sourceRect.width / 2,
          y: sourceRect.top + sourceRect.height / 2,
        };
        const target = {
          x: targetRect.left + targetRect.width / 2,
          y: targetRect.top + targetRect.height / 2,
        };

        // Spawn coin stream
        SharedFxApp.spawnCoinStream({
          source,
          target,
          count: 8,
          duration: 900,
        });

        // Jackpot burst if word is 7 letters
        if (playerWord && playerWord.length === 7) {
          SharedFxApp.spawnBurst('burst', source.x, source.y, {
            count: 12,
            colors: ['#BFFF00', '#FFE135'], // neo-lime + neo-yellow
          });
        }
      }
    };

    triggerFX();
  }, [revealed, settlement.outcome, reducedMotion, playerWord, payoutTargetRef]);

  // Auto-call onDone after reveal window
  useEffect(() => {
    timeoutRef.current = setTimeout(() => {
      onDone();
    }, 2500);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [onDone]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-neo-navy/95 p-4">
      {/* Outcome Banner */}
      <div
        className={`flex flex-col items-center gap-2 rounded-neo border-neo-thick px-6 py-4 text-center font-neo-display text-xl ${
          isBanner.unique
            ? 'border-neo-yellow bg-neo-navy text-neo-yellow'
            : isBanner.clash
              ? 'border-neo-red bg-neo-navy text-neo-red'
              : 'border-neo-white bg-neo-navy text-neo-white'
        }`}
      >
        <div>{bannerText}</div>
        <div className="text-2xl font-bold">{deltaText}</div>
      </div>

      {/* Opponent Cards Grid */}
      <div className="flex flex-wrap justify-center gap-6">
        {bots.map((bot, index) => (
          <div
            key={index}
            ref={(el) => {
              cardRefs.current[index] = el;
            }}
            className="h-48 w-32 rounded-neo border-neo-thick border-neo-white bg-neo-navy shadow-hard-lg"
            style={{
              perspective: '1000px',
              transformStyle: 'preserve-3d',
            }}
          >
            <div
              className="h-full w-full"
              style={{
                transformStyle: 'preserve-3d',
                transform: revealed ? 'rotationY(180deg)' : 'rotationY(0deg)',
                transition: reducedMotion ? 'none' : 'transform 0.6s ease-out',
              }}
            >
              {/* Face-down (back) */}
              <div
                className="flex h-full w-full items-center justify-center bg-gradient-to-br from-neo-navy to-neo-navy-light"
                style={{
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                }}
              >
                <div className="text-4xl">🂠</div>
              </div>

              {/* Face-up (word revealed) */}
              <div
                className="flex h-full w-full flex-col items-center justify-center gap-2 bg-neo-cream p-2"
                style={{
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)',
                }}
              >
                <div className="text-sm font-neo-body text-neo-navy">{bot.name}</div>
                <div className="text-xl font-neo-display font-bold text-neo-navy">{bot.word}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Continue Button */}
      <button
        onClick={onDone}
        className="rounded-neo border-neo-thick border-neo-lime bg-neo-lime px-6 py-3 font-neo-display font-bold text-neo-navy shadow-hard-lg transition-all hover:shadow-hard active:shadow-hard-pressed"
      >
        {t('sealedBid.continue') || 'Continue'}
      </button>
    </div>
  );
}
