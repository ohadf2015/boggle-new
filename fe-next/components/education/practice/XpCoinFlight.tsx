'use client';

/**
 * XpCoinFlight — the coins that carry a round's XP up into the XP bar.
 *
 * A number appearing in a bar is bookkeeping. Coins leaving the score card and
 * landing in the bar is a payout, and a payout is the thing a student comes
 * back for. This is the only part of the completion moment that has to know
 * about a DOM node outside its own card: the XP bar pins itself to the top of
 * the practice shell and marks itself `data-xp-flight-target`, and the coins
 * fly to wherever that node actually is.
 *
 * If the target is missing (a mode rendered without the practice header, a
 * test environment with no layout), the coins fly to the top-centre of the
 * viewport instead of vanishing — there is no failure path that silently
 * renders nothing, because a payout that sometimes does not happen is worse
 * than one that is slightly imprecise.
 *
 * Nothing here runs when motion is reduced; the caller passes `count={0}`.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { m } from 'framer-motion';

export interface XpCoinFlightProps {
  /** How many coins to fly. 0 renders nothing at all. */
  count: number;
  /** Element the coins launch from — usually the XP chip on the score card. */
  originRef: React.RefObject<HTMLElement | null>;
  /** Fired once every coin has landed, so the caller can bump the bar. */
  onLanded?: () => void;
}

interface Point {
  x: number;
  y: number;
}

const COIN_TRAVEL_MS = 620;
const COIN_STAGGER_MS = 55;

function readTarget(): Point {
  if (typeof document === 'undefined') return { x: 0, y: 0 };
  const node = document.querySelector('[data-xp-flight-target]');
  if (node) {
    const rect = node.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }
  return { x: window.innerWidth / 2, y: 24 };
}

export default function XpCoinFlight({ count, originRef, onLanded }: XpCoinFlightProps) {
  const [flight, setFlight] = useState<{ from: Point; to: Point } | null>(null);
  const landedRef = useRef(false);

  useEffect(() => {
    if (count <= 0) return;
    const origin = originRef.current;
    if (!origin) return;
    const rect = origin.getBoundingClientRect();
    setFlight({
      from: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
      to: readTarget(),
    });
  }, [count, originRef]);

  useEffect(() => {
    if (!flight || landedRef.current) return;
    const total = COIN_TRAVEL_MS + count * COIN_STAGGER_MS;
    const timer = setTimeout(() => {
      landedRef.current = true;
      onLanded?.();
    }, total);
    return () => clearTimeout(timer);
  }, [flight, count, onLanded]);

  // Each coin gets a fixed lateral kick so the burst reads as a spray rather
  // than a single line. Deterministic per index — no re-randomising on render.
  const coins = useMemo(
    () =>
      Array.from({ length: Math.max(0, count) }, (_, i) => ({
        i,
        spread: ((i % 5) - 2) * 22,
        lift: 40 + (i % 3) * 26,
      })),
    [count]
  );

  if (!flight || coins.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[95]" aria-hidden="true" data-testid="xp-coin-flight">
      {coins.map(({ i, spread, lift }) => (
        <m.span
          key={i}
          className="absolute h-5 w-5 rounded-full border-2 border-black bg-neo-yellow shadow-hard-sm"
          style={{ left: flight.from.x - 10, top: flight.from.y - 10 }}
          initial={{ x: 0, y: 0, scale: 0.4, opacity: 1 }}
          animate={{
            x: [spread, flight.to.x - flight.from.x],
            y: [-lift, flight.to.y - flight.from.y],
            scale: [1, 0.55],
            // Two keyframes, matching every other animated value on this coin.
            // A three-stop opacity here silently desynced from `times: [0, 1]`
            // and framer dropped the whole animation on the floor.
            opacity: [1, 0],
          }}
          transition={{
            duration: COIN_TRAVEL_MS / 1000,
            delay: (i * COIN_STAGGER_MS) / 1000,
            ease: 'easeIn',
            times: [0, 1],
          }}
        />
      ))}
    </div>
  );
}
