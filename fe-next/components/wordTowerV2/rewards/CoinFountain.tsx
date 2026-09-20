'use client';

import { motion } from 'framer-motion';
import { ITEM } from '../estate/estateArt';

/**
 * The gold shower. Stars say "special"; coins say "you were PAID" — and the
 * number that counts up a beat later is then the receipt for something the
 * player already watched come out of the box.
 *
 * Every coin rises out of the lid, slows at the top of its arc and falls past
 * the bottom of the frame, so the burst has weight instead of just spreading.
 * Count and reach come from `tierFx` (`coinBurst`, `spread`), so a common gets
 * a handful and an epic gets a curtain.
 */

interface Props {
  /** `tierFx().coinBurst` — how many coins are thrown. */
  count: number;
  /** `tierFx().spread` — how far they travel. */
  spread: number;
  reducedMotion?: boolean;
}

/** Deterministic, index-seeded: no RNG, so a re-render never re-scatters them. */
function arc(i: number, n: number, spread: number) {
  // Fan out across the full width, alternating sides so the throw stays even
  // however few coins there are.
  const side = i % 2 ? 1 : -1;
  const lane = (Math.floor(i / 2) + 0.5) / Math.max(1, Math.ceil(n / 2));
  const x = side * lane * spread * 58 * (0.6 + ((i * 31) % 40) / 100);
  const vmin = (k: number) => `${(x * k).toFixed(1)}vmin`;
  return {
    // Four stops everywhere, matching `times` below: framer silently refuses to
    // run a keyframe array whose length disagrees with `times`, and the coin
    // would then sit at opacity 0 for the whole burst.
    xs: ['0vmin', vmin(0.55), vmin(0.78), vmin(1)],
    rise: -(18 + ((i * 23) % 26)) - spread * 16,
    size: 20 + ((i * 19) % 16),
    spin: side * (200 + ((i * 41) % 260)),
    delay: ((i * 11) % 22) / 100,
    duration: 0.9 + ((i * 7) % 30) / 100 + spread * 0.25,
  };
}

export function CoinFountain({ count, spread, reducedMotion }: Props) {
  // Under reduced motion the coins would be the only thing moving on an
  // otherwise still screen — the worst possible place to spend the exemption.
  if (reducedMotion || count <= 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {Array.from({ length: count }, (_, i) => {
        const a = arc(i, count, spread);
        return (
          <motion.img
            key={i}
            src={ITEM.coin}
            alt=""
            className="absolute left-1/2 top-[44%]"
            style={{ width: a.size, height: a.size, marginLeft: -a.size / 2, marginTop: -a.size / 2 }}
            initial={{ x: 0, y: 0, scale: 0.35, opacity: 0 }}
            animate={{
              x: a.xs,
              // Up, hang, then down past the frame: four stops is the cheapest
              // thing that reads as gravity.
              y: [0, a.rise, a.rise * 0.55, 62],
              scale: [0.35, 1, 1, 0.8],
              rotate: [0, a.spin * 0.35, a.spin * 0.6, a.spin],
              opacity: [0, 1, 1, 0],
            }}
            transition={{ duration: a.duration, delay: a.delay, ease: 'easeOut', times: [0, 0.32, 0.5, 1] }}
          />
        );
      })}
    </div>
  );
}
