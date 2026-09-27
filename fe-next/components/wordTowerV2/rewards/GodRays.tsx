'use client';

import { motion } from 'framer-motion';

/**
 * The light fan that wheels out from behind an opened chest — the one cue both
 * of the bar's reveal frames lean on, and the reason a gold card reads as
 * treasure from across the room before a single word is drawn.
 *
 * Only the top tiers get it (`tierFx().rays` is 0 for a common), so the rays
 * themselves are the rarity signal.
 *
 * The opacity is STATIC and only the rotation animates. A big layer that tweens
 * its opacity is the mobile-web flash in Class 5 of `.claude/rules/60-recurring-
 * pitfalls.md`; a transform-only spin stays on the compositor and repaints
 * nothing. Under reduced motion the fan is simply still — the light is the
 * point, the wheeling is not.
 */

interface Props {
  /** Spokes in the fan; 0 draws nothing at all. */
  rays: number;
  /** Rarity colour, as a raw hex — this is a gradient, not a fill. */
  hex: string;
  /** 0..1, from `tierFx().flood`. */
  strength: number;
  reducedMotion?: boolean;
}

export function GodRays({ rays, hex, strength, reducedMotion }: Props) {
  if (rays <= 0) return null;
  // Each spoke is a lit wedge and a dark one, so `rays` spokes need 2n stops.
  const step = 360 / (rays * 2);
  const stops: string[] = [];
  for (let i = 0; i < rays * 2; i += 1) {
    const from = (i * step).toFixed(2);
    const to = ((i + 1) * step).toFixed(2);
    stops.push(`${i % 2 ? 'transparent' : hex} ${from}deg ${to}deg`);
  }

  return (
    <motion.div
      className="pointer-events-none absolute left-1/2 top-[42%] h-[160vmin] w-[160vmin]"
      aria-hidden
      initial={{ rotate: 0 }}
      animate={reducedMotion ? { rotate: 0 } : { rotate: 360 }}
      transition={reducedMotion ? undefined : { duration: 26, ease: 'linear', repeat: Infinity }}
      style={{
        marginLeft: '-80vmin',
        marginTop: '-80vmin',
        // A big masked conic gradient is the one shape that can miss compositor
        // promotion and repaint on every rotation frame — and it spins during
        // the busiest frame of the run (sparks, coins and the shake at once).
        willChange: 'transform',
        opacity: Math.min(0.5, strength * 0.62),
        background: `conic-gradient(from 0deg, ${stops.join(', ')})`,
        // Feathered at both ends: no hard disc edge, and the chest itself sits
        // in a clear pool rather than being sliced by the spokes.
        WebkitMaskImage: 'radial-gradient(circle, transparent 6%, black 22%, transparent 58%)',
        maskImage: 'radial-gradient(circle, transparent 6%, black 22%, transparent 58%)',
      }}
    />
  );
}

