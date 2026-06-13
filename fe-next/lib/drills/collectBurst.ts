import { mulberry32, fnv1aHash } from '@/lib/rng/seededRandom';

/**
 * Pure particle-spec generator for the in-game "collect" burst (the satisfying
 * spray of sparks when a word/gem is collected). Kept pure + seed-deterministic
 * so the burst is unit-testable — GSAP animates these specs in DrillRewardBurst,
 * but the math (how many, how far, what tint) lives here.
 */

export interface BurstParticle {
  /** Stable key. */
  id: number;
  /** Travel direction, radians. */
  angle: number;
  /** Travel distance from the origin, px. */
  distance: number;
  /** Particle size, px. */
  size: number;
  /** Entrance stagger, seconds. */
  delay: number;
  /** Spin applied over the particle's life, degrees. */
  rotation: number;
}

export interface BurstSpec {
  particleCount: number;
  particles: BurstParticle[];
}

const PALETTE_SIZE = 4;

/** Tier → tailwind background class for the burst spark. Index = tierColorIndex. */
export const BURST_COLORS = ['bg-neo-lime', 'bg-neo-cyan', 'bg-neo-yellow', 'bg-neo-pink'];

/**
 * Build a deterministic burst.
 *
 * @param magnitude 0..1 normalized reward strength. Bigger reward → more
 *   particles, wider spray. Clamped.
 * @param seed any string/number that identifies this specific collect event
 *   (e.g. the found word + its index) so replays/tests are stable.
 */
export function buildBurst(magnitude: number, seed: string | number): BurstSpec {
  const m = Math.max(0, Math.min(1, magnitude));
  const rand = mulberry32(typeof seed === 'number' ? seed : fnv1aHash(seed));

  // 7 sparks at the floor, up to 18 for a legendary haul.
  const particleCount = Math.round(7 + m * 11);

  const baseDistance = 48 + m * 64; // 48px → 112px reach
  const particles: BurstParticle[] = [];

  for (let i = 0; i < particleCount; i++) {
    // Even radial spread + jitter so it reads as a burst, not a clock face.
    const evenAngle = (i / particleCount) * Math.PI * 2;
    const jitter = (rand() - 0.5) * (Math.PI / particleCount);
    particles.push({
      id: i,
      angle: evenAngle + jitter,
      distance: baseDistance * (0.7 + rand() * 0.6),
      size: 6 + Math.round(rand() * (4 + m * 6)),
      delay: i * 0.012,
      rotation: (rand() - 0.5) * 220,
    });
  }

  return { particleCount, particles };
}

/** Pick a stable color class for a particle index. */
export function burstColor(index: number): string {
  return BURST_COLORS[index % PALETTE_SIZE];
}
