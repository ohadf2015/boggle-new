'use client';

import { useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { ChestRoll, ChestTier } from '@/lib/wordTowerV2/estate';
import { type ChestItem, type ChestTease, type RevealBeat, revealBeats, tierFx } from '@/lib/wordTowerV2/rewards';
import { ITEM } from '../estate/estateArt';
import { TIER_HEX, TierBurst } from './TierBurst';
import { useChestSequence } from './useChestSequence';

type T = (key: string, params?: Record<string, string | number>) => string;

const ART = '/images/word-tower-v2/empire';

const CHEST_ART = (tier: ChestTier, open: boolean) => `${ART}/chest-${tier}-${open ? 'open' : 'closed'}.webp`;

const ITEM_ART: Record<ChestItem, string> = {
  blueprint: `${ART}/blueprint.webp`,
  brick: `${ART}/golden-brick.webp`,
  shield: `${ART}/shield.webp`,
};

/** Rarity colour — the plate's fill, so the tier reads before the words do. */
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
  /** One call per count-up tick, with a playback rate that climbs. */
  onCoinTick?: (rate: number) => void;
  reducedMotion?: boolean;
}

/**
 * The end-of-run chest. Tap, and the lid rattles with light leaking out of the
 * seam; then it blows, and how hard it blows IS the rarity — a common is a
 * glint and a cream frame, an epic floods the screen pink, holds the first
 * frame in slow motion and throws thirty stars. Coins count up on a rising
 * ladder of pitches, then one card per item, each with its own hit.
 *
 * The whole thing is under 2.5s (`REVEAL_BUDGET_MS`, pinned in rewards.test)
 * and a tap anywhere collapses it, because this screen is seen every run.
 */
export function ChestReveal({ t, coins, chest, tease, guest, onSignIn, onDone, onBeat, onCoinTick, reducedMotion }: Props) {
  const beats = useMemo(() => revealBeats(chest, coins), [chest, coins]);
  const seq = useChestSequence({ beats, onBeat, onCoinTick, reducedMotion });
  const fx = tierFx(chest.tier);
  const hex = TIER_HEX[chest.tier];
  const { opened, rattling, popped, coinsShowing, finished, shownCoins, shownItems } = seq;
  /** Epic holds its first frame: the lid takes visibly longer to blow. */
  const popSeconds = reducedMotion ? 0 : 0.28 + fx.slowmoMs / 1000;

  // The surface is OPAQUE navy, not a scrim: the payout owns the screen, and a
  // dark-only surface hardcodes navy so it can never flash cream on a lazy mount.
  return (
    <div
      className="absolute inset-0 z-40 flex flex-col items-center justify-center overflow-y-auto bg-neo-navy p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t(`wordTowerV2.chest.tier.${chest.tier}`)}
    >
      <TierBurst tier={chest.tier} rattling={rattling} popped={popped} reducedMotion={reducedMotion} />

      {/* Tap anywhere: opens, then skips the rest. */}
      <button type="button" onClick={seq.skip} aria-label={t(opened ? 'wordTowerV2.chest.skip' : 'wordTowerV2.chest.tap')} className="absolute inset-0 cursor-pointer" />

      <motion.div
        className="pointer-events-none relative flex w-full max-w-sm flex-col items-center sm:max-w-md lg:max-w-2xl"
        animate={popped && !reducedMotion ? { x: [0, -fx.shakePx, fx.shakePx, -fx.shakePx * 0.5, 0] } : undefined}
        transition={{ duration: 0.34 }}
      >
        {/* The rarity word is the PAYOFF, so it is withheld until the lid blows —
            before that the plate just says the box is shut. The plate keeps its
            size across the swap so nothing below it jumps. */}
        <motion.div
          key={popped ? 'tier' : 'sealed'}
          className={`relative z-10 rounded-neo border-neo-thick border-black px-5 py-1 font-neo-display text-lg font-black uppercase tracking-widest shadow-hard lg:px-10 lg:py-2 lg:text-4xl ${
            popped ? `text-neo-navy ${TIER_CLASS[chest.tier]}` : 'bg-neo-navy-light text-neo-cream/70'
          }`}
          style={fx.banner && popped ? { boxShadow: `0 0 26px ${hex}` } : undefined}
          animate={
            reducedMotion
              ? undefined
              : popped
                ? fx.banner
                  ? { scale: [0.6, 1.18, 1], rotate: [-8, 2, -2] }
                  : { scale: [0.85, 1.06, 1], rotate: -2 }
                : { scale: 1, rotate: -2 }
          }
          transition={{ duration: 0.45 }}
        >
          {popped ? t(`wordTowerV2.chest.tier.${chest.tier}`) : t('wordTowerV2.chest.sealed')}
        </motion.div>

        {/* The chest, in a frame whose colour and thickness are the rarity.
            Fixed width + bottom anchor: the open sprite is TALLER than the shut
            one at the same scale, so it must grow upward, never re-centre. */}
        <div className="relative mt-3 h-[15.5rem] w-52 sm:h-[20rem] sm:w-64 lg:mt-5 lg:h-[22rem] lg:w-[18rem]">
          <div
            className="absolute inset-x-0 bottom-0 top-6 rounded-neo"
            style={{
              border: `${chest.tier === 'epic' ? 6 : chest.tier === 'rare' ? 5 : 3}px solid ${hex}`,
              background: `radial-gradient(circle at 50% 80%, ${hex}2e 0%, transparent 70%)`,
              boxShadow: popped ? `0 0 ${18 + fx.spread * 36}px ${hex}` : undefined,
            }}
          />
          <motion.img
            src={CHEST_ART(chest.tier, popped)}
            alt=""
            aria-hidden
            className="absolute bottom-1 left-0 w-full object-contain drop-shadow-[6px_6px_0_rgba(0,0,0,0.5)]"
            animate={
              reducedMotion
                ? undefined
                : popped
                  ? { scale: [0.92, 1.14, 1], y: [0, -10, 0], rotate: 0 }
                  : rattling
                    ? { rotate: [-5, 5, -5, 5, 0], scale: [1, 1.05, 1] }
                    : { rotate: [-3, 3, -3], scale: [1, 1.04, 1] }
            }
            transition={
              popped
                ? { duration: popSeconds, ease: 'easeOut' }
                : rattling
                  ? { duration: fx.anticipationMs / 1000, repeat: Infinity }
                  : { duration: 1.1, repeat: Infinity }
            }
          />
        </div>

        {!opened ? (
          <motion.button
            type="button"
            onClick={seq.open}
            animate={reducedMotion ? undefined : { y: [0, -5, 0] }}
            transition={{ duration: 0.9, repeat: Infinity }}
            className="pointer-events-auto mt-3 rounded-neo border-neo-thick border-black bg-neo-lime px-5 py-2 font-neo-display text-xl font-black uppercase text-neo-navy shadow-hard lg:mt-6 lg:px-10 lg:py-4 lg:text-4xl"
          >
            {t('wordTowerV2.chest.tap')}
          </motion.button>
        ) : null}

        <AnimatePresence>
          {coinsShowing ? (
            <motion.div
              key="coins"
              initial={reducedMotion ? false : { scale: 0.4, opacity: 0, y: 14 }}
              animate={reducedMotion ? { scale: 1, opacity: 1 } : { scale: [0.4, 1.12, 1], opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="mt-3 flex items-center gap-2 rounded-neo border-neo-thick border-black bg-neo-yellow px-5 py-1.5 text-neo-navy shadow-hard-lg lg:mt-5 lg:gap-4 lg:px-10 lg:py-3"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={ITEM.coin} alt="" aria-hidden className="h-8 w-8 lg:h-14 lg:w-14" />
              {/* dir=ltr: in Hebrew the bidi algorithm renders `+440` as `440+`. */}
              <span dir="ltr" className="font-neo-display text-4xl font-black tabular-nums lg:text-6xl">
                +{shownCoins.toLocaleString()}
              </span>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <ul className="mt-3 flex flex-wrap justify-center gap-2 lg:mt-5 lg:gap-4">
          <AnimatePresence>
            {shownItems.map((item) => (
              <motion.li
                key={item.item}
                initial={reducedMotion ? false : { scale: 0.2, rotate: -14, opacity: 0 }}
                animate={{ scale: 1, rotate: -2, opacity: 1 }}
                /* A spring, not keyframes: framer will not run a keyframe array
                   on a spring, and the card would stay at opacity 0. */
                transition={{ type: 'spring', stiffness: 420, damping: 13 }}
                style={{ borderColor: hex }}
                className={`relative flex w-28 flex-col items-center gap-1 rounded-neo border-[4px] px-2 py-2 text-neo-navy shadow-hard lg:w-40 lg:gap-2 lg:border-[6px] lg:px-4 lg:py-4 ${ITEM_CLASS[item.item]}`}
              >
                {/* Each card lands with its own hit: a ring in the rarity colour
                    snaps out from under it, so three cards read as three wins
                    rather than one list appearing. */}
                {reducedMotion ? null : (
                  <motion.span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 rounded-neo border-[3px]"
                    style={{ borderColor: hex }}
                    initial={{ scale: 1, opacity: 0.9 }}
                    animate={{ scale: 1.55, opacity: 0 }}
                    transition={{ duration: 0.42, ease: 'easeOut' }}
                  />
                )}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={ITEM_ART[item.item]} alt="" aria-hidden className="h-12 w-12 object-contain lg:h-16 lg:w-16" />
                <span className="font-neo-display text-sm font-black uppercase leading-tight lg:text-xl">
                  {t(`wordTowerV2.chest.item.${item.item}`, { n: item.n })}
                </span>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>

        {finished ? (
          <div className="pointer-events-auto mt-4 flex w-full flex-col items-center gap-2">
            {tease ? (
              <p className="rounded-neo border-neo border-black bg-neo-navy-light px-3 py-1.5 text-center font-neo-display text-sm font-bold text-neo-cream lg:px-6 lg:py-3 lg:text-xl">
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
              className="w-full rounded-neo border-neo-thick border-black bg-neo-lime px-6 py-3 font-neo-display text-2xl font-black uppercase text-neo-navy shadow-hard active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed lg:py-4 lg:text-3xl"
            >
              {t('wordTowerV2.chest.continue')}
            </button>
          </div>
        ) : null}
      </motion.div>
    </div>
  );
}
