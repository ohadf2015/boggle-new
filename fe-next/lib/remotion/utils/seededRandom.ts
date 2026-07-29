/**
 * Seeded Random Utilities
 *
 * Deterministic PRNG using mulberry32 algorithm.
 * Essential for Remotion compositions where renders must be
 * frame-reproducible (same seed = same particles every time).
 */

/**
 * Create a seeded PRNG using mulberry32 algorithm.
 * Returns a function that generates deterministic numbers in [0, 1).
 *
 * @param seed - Integer seed value
 * @returns Function that returns next pseudo-random number
 */
export function createSeededRandom(seed: number): () => number {
  let t = seed + 0x6d2b79f5;
  return () => {
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generate a deterministic array of particle data.
 * Common pattern used across multiple cinematics.
 *
 * @param count - Number of particles
 * @param width - Container width
 * @param height - Container height
 * @param seed - PRNG seed (default: 42)
 * @param sizeRange - [min, max] particle size (default: [4, 12])
 */
export function generateParticleArray(
  count: number,
  width: number,
  height: number,
  seed = 42,
  sizeRange: [number, number] = [4, 12],
) {
  const rand = createSeededRandom(seed);
  const [minSize, maxSize] = sizeRange;
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: rand() * width,
    y: rand() * height,
    size: minSize + rand() * (maxSize - minSize),
    speed: 0.5 + rand() * 1.5,
    delay: rand() * 30,
  }));
}
