'use client';

import React, { useEffect, useRef, useState, type ReactNode } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Settlement } from '../../lib/sealedBid/sp/wager';
import { SharedFxApp } from '../../lib/pixiFx/SharedFxApp';
import gsap from 'gsap';
import { SEALED_BID_ASSETS } from './sealedBidAssets';

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
}: ShowdownProps): ReactNode {
  const { t } = useLanguage();
  const cardRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [revealed, setRevealed] = useState(reducedMotion);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const outcome = settlement.outcome; // unique | clash | none
  const bannerText =
    outcome === 'unique'
      ? t('sealedBid.youWin') || t('sealedBid.unique')
      : outcome === 'clash'
        ? t('sealedBid.youLose') || t('sealedBid.clash')
        : t('sealedBid.draw') || t('sealedBid.pass');

  const deltaText = `${settlement.delta >= 0 ? '+' : ''}${settlement.delta}`;

  useEffect(() => {
    if (reducedMotion) {
      setRevealed(true);
      return;
    }

    cardRefs.current.forEach((card, index) => {
      if (!card) return;
      gsap.fromTo(
        card,
        { rotateY: 0 },
        {
          rotateY: 180,
          duration: 0.55,
          delay: index * 0.12 + 0.2,
          ease: 'power2.out',
        }
      );
    });

    const revealTimeout = setTimeout(() => setRevealed(true), 450);
    return () => clearTimeout(revealTimeout);
  }, [reducedMotion]);

  useEffect(() => {
    if (reducedMotion || settlement.outcome !== 'unique' || !revealed) return;

    const triggerFX = async () => {
      let sourceRect: DOMRect | null = null;
      if (cardRefs.current[0]) {
        sourceRect = cardRefs.current[0].getBoundingClientRect();
      }

      if (sourceRect && payoutTargetRef?.current) {
        const targetRect = payoutTargetRef.current.getBoundingClientRect();
        SharedFxApp.spawnCoinStream({
          source: {
            x: sourceRect.left + sourceRect.width / 2,
            y: sourceRect.top + sourceRect.height / 2,
          },
          target: {
            x: targetRect.left + targetRect.width / 2,
            y: targetRect.top + targetRect.height / 2,
          },
          count: 8,
          duration: 900,
        });

        if (playerWord && playerWord.length === 7) {
          SharedFxApp.spawnBurst(
            'burst',
            sourceRect.left + sourceRect.width / 2,
            sourceRect.top + sourceRect.height / 2,
            {
              count: 12,
              colors: ['#BFFF00', '#FFE135'],
            }
          );
        }
      }
    };

    triggerFX();
  }, [revealed, settlement.outcome, reducedMotion, playerWord, payoutTargetRef]);

  useEffect(() => {
    timeoutRef.current = setTimeout(() => {
      onDone();
    }, 2500);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [onDone]);

  const bannerTone =
    outcome === 'unique'
      ? 'border-neo-yellow bg-neo-yellow text-neo-navy'
      : outcome === 'clash'
        ? 'border-neo-red bg-neo-red text-neo-white'
        : 'border-neo-cream bg-neo-navy-light text-neo-cream';

  return (
    <div
      data-testid="showdown"
      className="flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-4 px-1 py-2"
    >
      {/* Outcome banner — casino result plaque */}
      <div
        data-testid="showdown-outcome"
        data-outcome={outcome}
        className={`flex w-full max-w-sm flex-col items-center gap-1 rounded-neo border-3 px-5 py-3 text-center shadow-hard ${bannerTone}`}
      >
        <div className="font-neo-display text-xs font-black uppercase tracking-[0.2em] opacity-80">
          {t('sealedBid.showdown')}
        </div>
        <div className="font-neo-display text-2xl font-black uppercase tracking-wide">
          {bannerText}
        </div>
        <div
          data-testid="showdown-delta"
          className="font-neo-display text-3xl font-black tabular-nums"
        >
          {deltaText}
        </div>
        <div className="font-neo-body text-xs font-bold uppercase opacity-80">
          {t('sealedBid.chips')}
        </div>
      </div>

      {/* Player word card */}
      <div
        data-testid="showdown-player-word"
        className="rounded-neo border-2 border-black bg-neo-cyan px-4 py-2 font-neo-display text-lg font-black uppercase tracking-wider text-neo-navy shadow-hard-sm"
      >
        {playerWord || '—'}
      </div>

      {/* Rival cards */}
      <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
        {bots.map((bot, index) => (
          <div
            key={`${bot.name}-${index}`}
            className="h-36 w-24 [perspective:800px] sm:h-44 sm:w-28"
          >
            <div
              ref={(el) => {
                cardRefs.current[index] = el;
              }}
              className="relative h-full w-full rounded-neo border-3 border-black shadow-hard-lg transition-transform [transform-style:preserve-3d]"
              style={{
                transform: reducedMotion || revealed ? 'rotateY(180deg)' : 'rotateY(0deg)',
                transition: reducedMotion ? 'none' : undefined,
              }}
            >
              {/* Back — branded card asset */}
              <div
                className="absolute inset-0 overflow-hidden rounded-neo bg-neo-navy"
                style={{ backfaceVisibility: 'hidden' }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- static SVG asset */}
                <img
                  src={SEALED_BID_ASSETS.cardBack}
                  alt=""
                  draggable={false}
                  className="h-full w-full object-cover"
                />
              </div>
              {/* Face */}
              <div
                className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-neo bg-neo-cream p-2"
                style={{
                  backfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)',
                }}
              >
                <div className="font-neo-body text-[10px] font-bold uppercase text-neo-navy/60">
                  {bot.name}
                </div>
                <div className="break-all text-center font-neo-display text-base font-black text-neo-navy sm:text-lg">
                  {bot.word}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onDone}
        className="min-h-12 w-full max-w-sm rounded-neo border-3 border-black bg-neo-lime px-6 py-3 font-neo-display font-black uppercase tracking-wide text-neo-navy shadow-hard transition-transform active:translate-y-0.5"
      >
        {t('sealedBid.continue')}
      </button>
    </div>
  );
}
