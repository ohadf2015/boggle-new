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
  dir?: 'ltr' | 'rtl';
}

export default function Showdown({
  playerWord,
  bots,
  settlement,
  reducedMotion = false,
  onDone,
  payoutTargetRef,
  dir = 'ltr',
}: ShowdownProps): ReactNode {
  const { t } = useLanguage();
  const cardRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [bannerVisible, setBannerVisible] = useState(reducedMotion);
  const [tensionDrained, setTensionDrained] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Card-flip cadence — also the reveal wait the tension bar drains across.
  const bannerDelay = bots.length * 400 + 550;

  const outcome = settlement.outcome; // unique | clash | none

  // A dict-rejected word and a deliberate pass BOTH settle as 'none'. The only
  // discriminator is the delta: passing risks nothing (settleBid is called with
  // stake 0 → delta 0), a rejected word forfeits min(stake, 5). Labelling a
  // rejected word "Pass" told the player their word was fine and they chose not
  // to bid — the opposite of what happened.
  // ponytail: derived, not a new Settlement field — see wager.test.ts, which
  // pins the non-zero invalid-word penalty this depends on.
  const rejected = outcome === 'none' && settlement.delta < 0;

  const bannerText =
    outcome === 'unique'
      ? t('sealedBid.youWin') || t('sealedBid.unique')
      : outcome === 'clash'
        ? t('sealedBid.youLose') || t('sealedBid.clash')
        : rejected
          ? t('sealedBid.notAWord')
          : t('sealedBid.draw') || t('sealedBid.pass');

  // The payout is the payoff beat — ticking it up reads as "being paid" rather
  // than a number that was always there. Reduced motion lands on it instantly.
  const [shownDelta, setShownDelta] = useState(reducedMotion ? settlement.delta : 0);
  const deltaText = `${shownDelta >= 0 ? '+' : ''}${shownDelta}`;

  const clashedWord = outcome === 'clash' && playerWord ? playerWord.toUpperCase() : null;

  useEffect(() => {
    if (reducedMotion) {
      setBannerVisible(true);
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
          delay: index * 0.4 + 0.3,
          ease: 'power2.out',
        }
      );
    });

    // wait for last card to finish flipping before showing outcome
    const revealTimeout = setTimeout(() => setBannerVisible(true), bannerDelay);
    // One tick after mount so the browser paints the bar at 100% first —
    // otherwise the width jumps straight to 0 with no visible drain.
    const tensionTimeout = setTimeout(() => setTensionDrained(true), 20);
    return () => {
      clearTimeout(revealTimeout);
      clearTimeout(tensionTimeout);
    };
  }, [reducedMotion, bots.length, bannerDelay]);

  useEffect(() => {
    if (reducedMotion || settlement.outcome !== 'unique' || !bannerVisible) return;

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
  }, [bannerVisible, settlement.outcome, reducedMotion, playerWord, payoutTargetRef]);

  // Count the payout up once the banner lands. Interval (not rAF) so it ticks
  // under fake timers and stays cheap — 20 steps over 600 ms.
  useEffect(() => {
    if (reducedMotion) {
      setShownDelta(settlement.delta);
      return;
    }
    if (!bannerVisible) return;
    const target = settlement.delta;
    if (target === 0) {
      setShownDelta(0);
      return;
    }
    const steps = 20;
    let step = 0;
    const id = setInterval(() => {
      step += 1;
      setShownDelta(step >= steps ? target : Math.round((target * step) / steps));
      if (step >= steps) clearInterval(id);
    }, 30);
    return () => clearInterval(id);
  }, [bannerVisible, reducedMotion, settlement.delta]);

  // Auto-advance the showdown after the reveal settles, so the round progresses
  // on its own; the Continue button remains as an explicit skip. onDone must be
  // idempotent — Continue-click and this timer can both reach it.
  useEffect(() => {
    if (!bannerVisible) return;
    timeoutRef.current = setTimeout(() => {
      onDone();
    }, 2500);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [bannerVisible, onDone]);

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
      dir={dir}
    >
      {/* Suspense pulse + draining tension bar while bot cards flip */}
      {!bannerVisible && !reducedMotion && (
        <div className="flex w-full max-w-[10rem] flex-col items-center gap-1.5">
          <div
            data-testid="showdown-suspense"
            className="animate-pulse text-center font-neo-display text-sm font-black uppercase tracking-widest text-neo-cream/60"
          >
            {t('sealedBid.revealing')}
          </div>
          <div
            data-testid="showdown-tension-bar"
            className="h-2 w-full overflow-hidden rounded-full border-2 border-black bg-neo-navy-light"
          >
            <div
              data-testid="showdown-tension-fill"
              className="h-full bg-neo-red"
              style={{
                width: tensionDrained ? '0%' : '100%',
                transition: `width ${bannerDelay}ms linear`,
              }}
            />
          </div>
        </div>
      )}

      {/* Outcome banner — casino result plaque, shown only after all cards flip */}
      {bannerVisible && (
        <div
          data-testid="showdown-outcome"
          data-outcome={outcome}
          className={`animate-neo-pop flex w-full max-w-sm flex-col items-center gap-1 rounded-neo border-3 px-5 py-3 text-center shadow-hard ${bannerTone}`}
        >
          <div className="font-neo-display text-xs font-black uppercase tracking-[0.2em] opacity-80">
            {t('sealedBid.showdown')}
          </div>
          <div className="font-neo-display text-2xl font-black uppercase tracking-wide">
            {bannerText}
          </div>
          <div
            data-testid="showdown-delta"
            dir="ltr"
            className="font-neo-display text-3xl font-black tabular-nums"
          >
            {deltaText}
          </div>
          <div className="font-neo-body text-xs font-bold uppercase opacity-80">
            {t('sealedBid.chips')}
          </div>
          {settlement.lucky && (
            <div
              data-testid="showdown-lucky"
              className="animate-neo-wobble font-neo-display text-sm font-black uppercase tracking-wide text-neo-yellow"
            >
              {t('sealedBid.luckyStreak')}
            </div>
          )}
          {/* Connects the odds board the player was staring at while bidding to
              the number they just got paid. Without it "+60" is a magic number. */}
          {outcome === 'unique' && settlement.multiplier > 0 && (
            <div
              data-testid="showdown-payout-math"
              dir="ltr"
              className="font-neo-body text-[11px] font-bold uppercase tabular-nums opacity-70"
            >
              {settlement.stake} × {settlement.multiplier}
            </div>
          )}
        </div>
      )}

      {/* Player word card */}
      <div
        data-testid="showdown-player-word"
        className="rounded-neo border-2 border-black bg-neo-cyan px-4 py-2 font-neo-display text-lg font-black uppercase tracking-wider text-neo-navy shadow-hard-sm"
      >
        {playerWord || t('sealedBid.noWord', '—')}
      </div>

      {/* Rival cards */}
      <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
        {bots.map((bot, index) => {
          const isClash = !!clashedWord && bot.word.toUpperCase() === clashedWord;
          return (
          <div
            key={`${bot.name}-${index}`}
            data-testid="showdown-rival-card"
            data-clashed={isClash ? 'true' : 'false'}
            className={`h-36 w-24 [perspective:800px] sm:h-44 sm:w-28 ${
              isClash && !reducedMotion ? 'animate-neo-shake' : ''
            }`}
          >
            <div
              ref={(el) => {
                cardRefs.current[index] = el;
              }}
              // No `transition-transform` here: GSAP writes `transform` every
              // frame of the flip, and a CSS transition on the same property
              // starts a fresh eased tween toward each of those frames —
              // double-easing that reads as a mushy, laggy flip.
              className={`relative h-full w-full rounded-neo border-3 shadow-hard-lg [transform-style:preserve-3d] ${
                isClash ? 'border-neo-red' : 'border-black'
              }`}
              style={{
                transform: reducedMotion || bannerVisible ? 'rotateY(180deg)' : 'rotateY(0deg)',
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
                className={`absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-neo p-2 ${
                  isClash ? 'bg-neo-red text-neo-white' : 'bg-neo-cream'
                }`}
                style={{
                  backfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)',
                }}
              >
                <div
                  className={`font-neo-body text-[10px] font-bold uppercase ${
                    isClash ? 'text-neo-white/70' : 'text-neo-navy/60'
                  }`}
                >
                  {bot.name}
                </div>
                <div
                  className={`break-all text-center font-neo-display text-base font-black sm:text-lg ${
                    isClash ? 'text-neo-white' : 'text-neo-navy'
                  }`}
                >
                  {bot.word}
                </div>
                {/* Names WHO matched you. Without this a clash was just a red
                    banner and a wall of identical rival cards. */}
                {isClash && (
                  <div className="mt-0.5 rounded-full border-2 border-black bg-neo-white px-2 py-0.5 font-neo-display text-[9px] font-black uppercase tracking-wide text-neo-red">
                    {t('sealedBid.clash')}
                  </div>
                )}
              </div>
            </div>
          </div>
          );
        })}
      </div>

      {bannerVisible && (
        <button
          type="button"
          onClick={onDone}
          className="min-h-12 w-full max-w-sm rounded-neo border-3 border-black bg-neo-lime px-6 py-3 font-neo-display font-black uppercase tracking-wide text-neo-navy shadow-hard transition-transform active:translate-y-0.5"
        >
          {t('sealedBid.continue')}
        </button>
      )}
    </div>
  );
}
