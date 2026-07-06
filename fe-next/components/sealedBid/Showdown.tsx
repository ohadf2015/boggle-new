'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Settlement } from '@/lib/sealedBid/sp/wager';
import { SharedFxApp } from '@/lib/pixiFx/SharedFxApp';
import gsap from 'gsap';

export interface ShowdownProps {
  playerWord: string | null;
  bots: { name: string; word: string }[];
  settlement: Settlement;
  reducedMotion?: boolean;
  onDone: () => void;
  payoutTargetRef?: React.RefObject<HTMLElement | null>;
}

export default function Showdown({
  playerWord,
  bots,
  settlement,
  reducedMotion = false,
  onDone,
  payoutTargetRef,
}: ShowdownProps): React.JSX.Element {
  const [revealed, setRevealed] = useState(false);
  const cardRefsRef = useRef<(HTMLDivElement | null)[]>([]);

  // Trigger reveal on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      // Animate opponent cards flip
      if (!reducedMotion) {
        bots.forEach((_, i) => {
          const cardEl = cardRefsRef.current[i];
          if (cardEl) {
            gsap.to(cardEl, {
              rotationY: 180,
              duration: 0.6,
              delay: i * 0.15,
              ease: 'back.out',
            });
          }
        });
      }

      setRevealed(true);

      // Trigger coin stream on unique win
      if (settlement.outcome === 'unique' && !reducedMotion && payoutTargetRef?.current) {
        const cardElement = cardRefsRef.current[0];
        if (cardElement) {
          const cardRect = cardElement.getBoundingClientRect();
          const targetRect = payoutTargetRef.current.getBoundingClientRect();
          SharedFxApp.spawnCoinStream({
            source: { x: cardRect.left + cardRect.width / 2, y: cardRect.top + cardRect.height / 2 },
            target: { x: targetRect.left + targetRect.width / 2, y: targetRect.top + targetRect.height / 2 },
            count: 8,
            duration: 900,
          });
        }

        // Jackpot burst for 7-letter word
        if (playerWord && playerWord.length === 7 && !reducedMotion) {
          const cardRect = cardRefsRef.current[0]?.getBoundingClientRect();
          if (cardRect) {
            SharedFxApp.spawnBurst('jackpot', cardRect.left + cardRect.width / 2, cardRect.top + cardRect.height / 2);
          }
        }
      }
    }, 400);

    return () => clearTimeout(timer);
    // bots.length (not bots) is intentional — a new array identity each render must not re-fire the flip.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settlement, reducedMotion, payoutTargetRef, playerWord, bots.length]);

  // Call onDone after reveal window
  useEffect(() => {
    if (!revealed) return;

    const timer = setTimeout(onDone, 2500);
    return () => clearTimeout(timer);
  }, [revealed, onDone]);

  const deltaText = settlement.delta >= 0 ? `+${settlement.delta}` : `${settlement.delta}`;
  const bannerColor =
    settlement.outcome === 'unique' ? 'text-neo-yellow' : settlement.outcome === 'clash' ? 'text-neo-red' : 'text-neo-white';

  return (
    <div className="fixed inset-0 bg-neo-navy/80 flex items-center justify-center z-50">
      <div className="flex flex-col items-center gap-4">
        {/* Opponent cards */}
        <div className="flex gap-4 mb-4">
          {bots.map((bot, i) => (
            <div
              key={i}
              ref={(el) => {
                cardRefsRef.current[i] = el;
              }}
              className="w-24 h-32 bg-neo-navy border-2 border-black flex items-center justify-center font-neo-display text-sm"
              style={{
                perspective: '1000px',
                transformStyle: 'preserve-3d' as const,
              }}
            >
              <span className={revealed ? 'text-neo-lime' : 'text-neo-white'}>{revealed ? bot.word : '?'}</span>
            </div>
          ))}
        </div>

        {/* Player card */}
        <div className="w-24 h-32 bg-neo-navy border-2 border-neo-lime flex items-center justify-center font-neo-display text-sm text-neo-lime">
          {playerWord}
        </div>

        {/* Outcome banner */}
        {revealed && (
          <div className={`text-2xl font-neo-display ${bannerColor} mt-4`}>{deltaText}</div>
        )}

        {/* Continue button */}
        {revealed && (
          <button
            onClick={onDone}
            className="mt-4 px-4 py-2 bg-neo-lime text-black font-neo-display border-2 border-black shadow-hard hover:shadow-hard-pressed"
          >
            Continue
          </button>
        )}
      </div>
    </div>
  );
}
