'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Settlement } from '@/lib/sealedBid/sp/wager';
import { SharedFxApp } from '@/lib/pixiFx/SharedFxApp';
import { useLanguage } from '@/contexts/LanguageContext';
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
  const { t } = useLanguage();
  const [revealed, setRevealed] = useState(false);
  const cardRefsRef = useRef<(HTMLDivElement | null)[]>([]);
  const playerCardRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Entrance: pop the whole showdown in instead of appearing instantly.
  useEffect(() => {
    if (reducedMotion || !overlayRef.current) return;
    gsap.from(overlayRef.current, { opacity: 0, duration: 0.2 });
    const cards = [playerCardRef.current, ...cardRefsRef.current].filter(Boolean);
    gsap.from(cards, { y: 24, scale: 0.85, opacity: 0, duration: 0.35, stagger: 0.08, ease: 'back.out(1.7)' });
    // Mount-only entrance — deliberately excludes reducedMotion/re-render deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Trigger reveal on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      // Flip opponent cards: rotate the preserve-3d card past 90deg so the
      // backface-hidden "?" face disappears and the word face (pre-rotated
      // 180deg) comes to face the viewer — a real flip, not a mirrored spin.
      // Reduced motion still needs the end state applied (gsap.set, no tween)
      // — otherwise the card stays stuck on "?" and the reveal never reveals.
      const cardEls = cardRefsRef.current.filter((el): el is HTMLDivElement => !!el);
      if (reducedMotion) {
        gsap.set(cardEls, { rotationY: 180 });
      } else {
        gsap.to(cardEls, { rotationY: 180, duration: 0.7, stagger: 0.15, ease: 'back.out(1.4)' });
      }

      setRevealed(true);

      // A clash stings — shake the player's card and flash it red.
      if (settlement.outcome === 'clash' && !reducedMotion && playerCardRef.current) {
        gsap.fromTo(
          playerCardRef.current,
          { x: -6 },
          { x: 0, duration: 0.4, ease: 'elastic.out(1, 0.3)' },
        );
      }

      // Trigger coin stream on unique win
      if (settlement.outcome === 'unique' && !reducedMotion && payoutTargetRef?.current) {
        const cardRect = cardRefsRef.current[0]?.getBoundingClientRect();
        if (cardRect) {
          const targetRect = payoutTargetRef.current.getBoundingClientRect();
          SharedFxApp.spawnCoinStream({
            source: { x: cardRect.left + cardRect.width / 2, y: cardRect.top + cardRect.height / 2 },
            target: { x: targetRect.left + targetRect.width / 2, y: targetRect.top + targetRect.height / 2 },
            count: 8,
            duration: 900,
          });

          // Jackpot burst for 7-letter word
          if (playerWord && playerWord.length === 7) {
            SharedFxApp.spawnBurst('jackpot', cardRect.left + cardRect.width / 2, cardRect.top + cardRect.height / 2);
          }
        }
      }
    }, 400);

    return () => clearTimeout(timer);
    // bots.length (not bots) is intentional — a new array identity each render must not re-fire the flip.
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
  // Label the outcome so a 0/negative delta reads clearly: a clash, a rejected
  // word (staked but not in the dictionary → ante lost), or a deliberate pass.
  const outcomeLabel =
    settlement.outcome === 'unique'
      ? t('sealedBid.unique')
      : settlement.outcome === 'clash'
        ? t('sealedBid.clash')
        : playerWord
          ? t('sealedBid.notAWord')
          : t('sealedBid.pass');

  return (
    <div ref={overlayRef} className="fixed inset-0 bg-neo-navy/90 flex items-center justify-center z-50">
      <div className="flex flex-col items-center gap-4">
        {/* Opponent cards — two-face flip: front shows "?", back (pre-rotated
            180deg) shows the word. backface-visibility:hidden on both faces
            means rotating the shared inner div past 90deg swaps which face
            the viewer sees, instead of showing a mirrored spin. */}
        <div className="flex gap-4 mb-4">
          {bots.map((bot, i) => (
            <div key={i} className="w-24 h-32" style={{ perspective: '1000px' }}>
              <div
                ref={(el) => {
                  cardRefsRef.current[i] = el;
                }}
                className="relative w-full h-full"
                style={{ transformStyle: 'preserve-3d' as const }}
              >
                <div
                  className="absolute inset-0 flex items-center justify-center rounded-neo border-neo-thick border-black shadow-hard-lg bg-neo-navy-light font-neo-display text-2xl text-neo-white/50"
                  style={{ backfaceVisibility: 'hidden' as const }}
                >
                  ?
                </div>
                <div
                  className="absolute inset-0 flex items-center justify-center rounded-neo border-neo-thick border-black shadow-hard-lg bg-neo-navy-light px-1 font-neo-display text-sm text-neo-lime"
                  style={{ backfaceVisibility: 'hidden' as const, transform: 'rotateY(180deg)' }}
                >
                  {bot.word}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Player card */}
        <div
          ref={playerCardRef}
          className="w-24 h-32 flex items-center justify-center rounded-neo border-neo-thick border-neo-lime shadow-hard-lg bg-neo-navy-light px-1 font-neo-display text-sm text-neo-lime"
        >
          {playerWord}
        </div>

        {/* Outcome banner: label + delta so a 0/negative result reads clearly */}
        {revealed && (
          <div className={`flex flex-col items-center gap-1 mt-4 animate-neo-pop ${bannerColor}`}>
            <div className="text-sm font-neo-display uppercase tracking-widest opacity-80">{outcomeLabel}</div>
            <div className="text-2xl font-neo-display">{deltaText}</div>
          </div>
        )}

        {/* Continue button */}
        {revealed && (
          <button
            onClick={onDone}
            className="mt-4 px-4 py-2 bg-neo-lime text-black font-neo-display border-neo-thick border-black rounded-neo shadow-hard hover:shadow-hard-pressed transition-shadow"
          >
            {t('sealedBid.continue')}
          </button>
        )}
      </div>
    </div>
  );
}
