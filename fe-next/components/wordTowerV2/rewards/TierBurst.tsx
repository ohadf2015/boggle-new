'use client';

import { motion } from 'framer-motion';
import type { ChestTier } from '@/lib/wordTowerV2/estate';
import { tierFx } from '@/lib/wordTowerV2/rewards';
import { CoinFountain } from './CoinFountain';
import { GodRays } from './GodRays';

const STAR_ART = '/images/word-tower-v2/empire/fx-star.webp';

/**
 * The rarity colour, as a raw value — these draw gradients and glows, not
 * fills, so they cannot be Tailwind tokens. The chest sits on the dark game
 * surface only, so the dark-theme values are the only ones that ever show.
 */
export const TIER_HEX: Record<ChestTier, string> = {
  common: '#fffef0', // neo-cream
  rare: '#00ffff', // neo-cyan
  epic: '#ff1493', // neo-pink
};

/** Deterministic spark geometry — no RNG, so the server and client agree. */
function spark(i: number, n: number, spread: number) {
  const angle = (i / n) * Math.PI * 2 + (i % 3) * 0.41;
  const reach = spread * 50 * (0.55 + ((i * 37) % 46) / 100);
  return {
    x: `${(Math.cos(angle) * reach).toFixed(1)}vmin`,
    y: `${(Math.sin(angle) * reach).toFixed(1)}vmin`,
    size: 13 + ((i * 17) % 20),
    spin: (i % 2 ? 1 : -1) * (160 + ((i * 29) % 220)),
    delay: ((i * 13) % 16) / 100,
  };
}

interface Props {
  tier: ChestTier;
  /** The lid is rattling: light seeping out, nothing thrown yet. */
  rattling: boolean;
  /** The lid has blown. */
  popped: boolean;
  reducedMotion?: boolean;
}

/**
 * Everything the burst throws at the screen, sized by rarity: the light that
 * seeps out while the lid rattles, the colour flood, the shockwave ring and a
 * shower of stars. Common is a glint; epic fills the screen. The magnitudes all
 * come from `tierFx` so the tier is legible in a single frame, before any text.
 */
export function TierBurst({ tier, rattling, popped, reducedMotion }: Props) {
  const fx = tierFx(tier);
  const hex = TIER_HEX[tier];

  if (reducedMotion) {
    // Still, but not plain: the flood and the ray fan are LIGHT, not motion, so
    // the rarity is every bit as legible with the animation turned off.
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        {popped ? <GodRays rays={fx.rays} hex={hex} strength={fx.flood} reducedMotion /> : null}
        <div
          className="absolute inset-0"
          style={{
            background: popped
              ? `radial-gradient(circle at 50% 42%, ${hex}${Math.round(fx.flood * 90).toString(16).padStart(2, '0')} 0%, transparent 62%)`
              : undefined,
          }}
        />
      </div>
    );
  }

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* Behind everything: the light fan that says "treasure" from across the
          room. Rare and up only — `tierFx().rays` is 0 for a common. */}
      {popped ? <GodRays rays={fx.rays} hex={hex} strength={fx.flood} /> : null}

      {/* Light seeping out of the seam, then the flood when it blows. */}
      <motion.div
        className="absolute inset-0"
        style={{ background: `radial-gradient(circle at 50% 42%, ${hex} 0%, transparent 60%)` }}
        initial={{ opacity: 0 }}
        animate={
          popped
            ? { opacity: [fx.flood * 1.5, fx.flood * 0.45], scale: [0.9, 1.06] }
            : rattling
              ? { opacity: [0, fx.flood * 0.55, fx.flood * 0.2, fx.flood * 0.6] }
              : { opacity: 0 }
        }
        transition={popped ? { duration: 0.5 } : { duration: fx.anticipationMs / 1000, times: [0, 0.4, 0.7, 1] }}
      />

      {/* The shockwave: one hard ring, as wide as the tier is loud. */}
      {popped ? (
        <motion.div
          className="absolute left-1/2 top-[42%] rounded-full border-[6px]"
          style={{ borderColor: hex, width: '14vmin', height: '14vmin', marginLeft: '-7vmin', marginTop: '-7vmin' }}
          initial={{ scale: 0.2, opacity: 0.95 }}
          animate={{ scale: fx.spread * 9, opacity: 0 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
        />
      ) : null}

      {/* The gold shower, thrown before the number is ever drawn. */}
      {popped ? <CoinFountain count={fx.coinBurst} spread={fx.spread} /> : null}

      {/* Sparks. */}
      {popped
        ? Array.from({ length: fx.sparks }, (_, i) => {
            const s = spark(i, fx.sparks, fx.spread);
            return (
              <motion.img
                key={i}
                src={STAR_ART}
                alt=""
                className="absolute left-1/2 top-[42%]"
                style={{ width: s.size, height: s.size, marginLeft: -s.size / 2, marginTop: -s.size / 2 }}
                initial={{ x: 0, y: 0, scale: 0.3, opacity: 0 }}
                animate={{ x: s.x, y: s.y, scale: [0.3, 1.15, 0.5], rotate: s.spin, opacity: [0, 1, 0] }}
                transition={{ duration: 0.85 + fx.spread * 0.3, delay: s.delay, ease: 'easeOut' }}
              />
            );
          })
        : null}
    </div>
  );
}
