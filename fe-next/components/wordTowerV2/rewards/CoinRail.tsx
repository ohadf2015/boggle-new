'use client';

import { useEffect, useState, type RefObject } from 'react';
import { motion } from 'framer-motion';

type T = (key: string, params?: Record<string, string | number>) => string;

export const COIN_ART = '/images/word-tower-v2/empire/coin.webp';

interface Props {
  t: T;
  /** Coins banked this run (the server's own formula). */
  coins: number;
  /** The counter box — `ImpactBurst` flies its coins into this exact rect. */
  counterRef: RefObject<HTMLDivElement | null>;
  /** Desktop/TV: the wheel sits in a side panel, so the rail hugs the play column. */
  wide?: boolean;
  reducedMotion?: boolean;
}

/** Matches ImpactBurst's hold + flight: the counter catches up as coins arrive. */
const ARRIVAL_MS = 1500;

/**
 * Phone: the district button (top) and the global mute button (below it) own
 * the top-right corner, so the rail starts under both.
 *
 * The coin counter. The coins that feed it are thrown from the landing itself
 * (`ImpactBurst`), so the whole payout — impact, amount, total — is one arc the
 * eye can follow, the way Coin Master never lets a number change off-screen.
 */
export function CoinRail({ t, coins, counterRef, wide, reducedMotion }: Props) {
  const [shown, setShown] = useState(coins);
  const [bump, setBump] = useState(0);

  // The counter catches up as the coins land, not when the points are scored.
  useEffect(() => {
    if (coins <= shown) {
      setShown(coins);
      return;
    }
    const id = window.setTimeout(
      () => {
        setShown(coins);
        setBump((b) => b + 1);
      },
      reducedMotion ? 0 : ARRIVAL_MS,
    );
    return () => window.clearTimeout(id);
  }, [coins, shown, reducedMotion]);

  return (
    <div
      className={`pointer-events-none absolute z-20 flex flex-col items-end gap-1 ${
        wide ? 'end-[23.5rem] top-3 xl:end-[27.5rem]' : 'end-3 top-[6.75rem]'
      }`}
    >
      <motion.div
        ref={counterRef}
        key={`coins-${bump}`}
        animate={reducedMotion ? undefined : { scale: [1, 1.18, 1], rotate: [0, -2, 0] }}
        transition={{ duration: 0.3 }}
        className="flex items-center gap-1.5 rounded-neo border-neo-thick border-black bg-neo-yellow px-2.5 py-1 text-neo-navy shadow-hard lg:px-3.5 lg:py-1.5"
        aria-label={t('wordTowerV2.coins.run', { n: shown })}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={COIN_ART} alt="" aria-hidden className="h-6 w-6 lg:h-9 lg:w-9" />
        <span className="font-neo-display text-2xl font-black tabular-nums lg:text-4xl" aria-hidden>
          {shown.toLocaleString()}
        </span>
      </motion.div>
    </div>
  );
}
