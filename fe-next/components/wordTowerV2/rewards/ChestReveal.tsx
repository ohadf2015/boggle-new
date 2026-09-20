'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { ChestRoll, ChestTier } from '@/lib/wordTowerV2/estate';
import { type ChestItem, type ChestTease, type RevealBeat, revealBeats } from '@/lib/wordTowerV2/rewards';
import { COIN_ART } from './CoinRail';

type T = (key: string, params?: Record<string, string | number>) => string;

const ART = '/images/word-tower-v2/empire';

const CHEST_ART = (tier: ChestTier, open: boolean) => `${ART}/chest-${tier}-${open ? 'open' : 'closed'}.webp`;

const ITEM_ART: Record<ChestItem, string> = {
  blueprint: `${ART}/blueprint.webp`,
  brick: `${ART}/golden-brick.webp`,
  shield: `${ART}/shield.webp`,
};

/** Rarity colour — the card's fill, so the tier reads before the words do. */
const TIER_CLASS: Record<ChestTier, string> = {
  common: 'bg-neo-cream',
  rare: 'bg-neo-cyan',
  epic: 'bg-neo-pink',
};

const ITEM_CLASS: Record<ChestItem, string> = {
  blueprint: 'bg-neo-purple',
  brick: 'bg-neo-yellow',
  shield: 'bg-neo-cyan',
};

const COUNT_MS = 900;

interface Props {
  t: T;
  /** The server's coins for the run itself (the chest adds its own). */
  coins: number;
  chest: ChestRoll;
  tease: ChestTease | null;
  /** Guests keep nothing until they sign in. */
  guest?: boolean;
  onSignIn?: () => void;
  onDone: () => void;
  /** 'open' fires on the tap, then one per revealed beat. */
  onBeat?: (beat: RevealBeat | 'open') => void;
  reducedMotion?: boolean;
}

/**
 * The end-of-run chest: tap to open, coins count up, then one card per item.
 * Coin Master's reveal, cut to size — every beat under 1.5s and a tap anywhere
 * skips straight to the haul, because this screen is seen every single run.
 */
export function ChestReveal({ t, coins, chest, tease, guest, onSignIn, onDone, onBeat, reducedMotion }: Props) {
  const beats = useMemo(() => revealBeats(chest, coins), [chest, coins]);
  const [step, setStep] = useState(0);
  const [shownCoins, setShownCoins] = useState(0);
  const opened = step > 0;
  const finished = step >= beats.length;
  const total = beats.find((b) => b.kind === 'coins')?.coins ?? 0;

  const open = useCallback(() => {
    if (opened) return;
    setStep(1);
    onBeat?.('open');
    onBeat?.(beats[0]);
  }, [opened, beats, onBeat]);

  const skip = useCallback(() => {
    if (!opened) {
      open();
      return;
    }
    setStep(beats.length);
    setShownCoins(total);
  }, [opened, open, beats.length, total]);

  // One beat at a time; each announces itself so the caller can play its sound.
  useEffect(() => {
    if (!opened || finished) return;
    const beat = beats[step - 1];
    const id = window.setTimeout(
      () => {
        setStep((s) => Math.min(beats.length, s + 1));
        if (beats[step]) onBeat?.(beats[step]);
      },
      reducedMotion ? 350 : beat.ms,
    );
    return () => window.clearTimeout(id);
  }, [opened, finished, step, beats, onBeat, reducedMotion]);

  // Coins count up the moment the coin beat shows.
  const coinsShowing = step >= 2;
  useEffect(() => {
    if (!coinsShowing) return;
    if (reducedMotion) {
      setShownCoins(total);
      return;
    }
    const start = performance.now();
    let raf = 0;
    const tick = () => {
      const k = Math.min(1, (performance.now() - start) / COUNT_MS);
      setShownCoins(Math.round(total * (1 - (1 - k) ** 3)));
      if (k < 1) raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [coinsShowing, total, reducedMotion]);

  const items = beats.filter((b): b is Extract<RevealBeat, { kind: 'item' }> => b.kind === 'item');
  const shownItems = items.filter((_, i) => step >= 3 + i);

  return (
    <div
      className="absolute inset-0 z-40 flex flex-col items-center justify-center overflow-y-auto bg-neo-navy/85 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t(`wordTowerV2.chest.tier.${chest.tier}`)}
    >
      {/* Tap anywhere: opens, then skips the rest. */}
      <button type="button" onClick={skip} aria-label={t(opened ? 'wordTowerV2.chest.skip' : 'wordTowerV2.chest.tap')} className="absolute inset-0 cursor-pointer" />

      <div className="pointer-events-none relative flex w-full max-w-sm flex-col items-center">
        <div className={`rounded-neo border-neo-thick border-black px-4 py-1 font-neo-display text-lg font-black uppercase tracking-widest text-neo-navy shadow-hard ${TIER_CLASS[chest.tier]}`}>
          {t(`wordTowerV2.chest.tier.${chest.tier}`)}
        </div>

        <motion.img
          src={CHEST_ART(chest.tier, opened)}
          alt=""
          aria-hidden
          className="mt-2 h-44 w-44 object-contain drop-shadow-[6px_6px_0_rgba(0,0,0,0.5)]"
          animate={
            reducedMotion
              ? undefined
              : opened
                ? { scale: [0.9, 1.12, 1], rotate: 0 }
                : { rotate: [-3, 3, -3], scale: [1, 1.04, 1] }
          }
          transition={opened ? { duration: 0.45 } : { duration: 1.1, repeat: Infinity }}
        />

        {!opened ? (
          <motion.button
            type="button"
            onClick={skip}
            animate={reducedMotion ? undefined : { y: [0, -5, 0] }}
            transition={{ duration: 0.9, repeat: Infinity }}
            className="pointer-events-auto mt-2 rounded-neo border-neo-thick border-black bg-neo-lime px-5 py-2 font-neo-display text-xl font-black uppercase text-neo-navy shadow-hard"
          >
            {t('wordTowerV2.chest.tap')}
          </motion.button>
        ) : null}

        <AnimatePresence>
          {coinsShowing ? (
            <motion.div
              key="coins"
              initial={reducedMotion ? false : { scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="mt-3 flex items-center gap-2 rounded-neo border-neo-thick border-black bg-neo-yellow px-5 py-1.5 text-neo-navy shadow-hard-lg"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={COIN_ART} alt="" aria-hidden className="h-8 w-8" />
              <span className="font-neo-display text-4xl font-black tabular-nums">+{shownCoins.toLocaleString()}</span>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <ul className="mt-3 flex flex-wrap justify-center gap-2">
          <AnimatePresence>
            {shownItems.map((item) => (
              <motion.li
                key={item.item}
                initial={reducedMotion ? false : { scale: 0.3, rotate: -12, opacity: 0 }}
                animate={{ scale: 1, rotate: -2, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 380, damping: 14 }}
                className={`flex w-28 flex-col items-center gap-1 rounded-neo border-neo-thick border-black px-2 py-2 text-neo-navy shadow-hard ${ITEM_CLASS[item.item]}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={ITEM_ART[item.item]} alt="" aria-hidden className="h-12 w-12 object-contain" />
                <span className="font-neo-display text-sm font-black uppercase leading-tight">
                  {t(`wordTowerV2.chest.item.${item.item}`, { n: item.n })}
                </span>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>

        {finished ? (
          <div className="pointer-events-auto mt-4 flex w-full flex-col items-center gap-2">
            {tease ? (
              <p className="rounded-neo border-neo border-black bg-neo-navy-light px-3 py-1.5 text-center font-neo-display text-sm font-bold text-neo-cream">
                {t(`wordTowerV2.chest.tease.${tease.kind}`, { n: tease.n, tier: t(`wordTowerV2.chest.tier.${tease.tier}`) })}
              </p>
            ) : null}
            {guest ? (
              <button
                type="button"
                onClick={onSignIn}
                className="w-full rounded-neo border-neo-thick border-black bg-neo-cyan px-4 py-2 font-neo-display text-base font-black uppercase text-neo-navy shadow-hard active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed"
              >
                {t('wordTowerV2.chest.guest')}
              </button>
            ) : null}
            <button
              type="button"
              onClick={onDone}
              autoFocus
              className="w-full rounded-neo border-neo-thick border-black bg-neo-lime px-6 py-3 font-neo-display text-2xl font-black uppercase text-neo-navy shadow-hard active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed"
            >
              {t('wordTowerV2.chest.continue')}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
