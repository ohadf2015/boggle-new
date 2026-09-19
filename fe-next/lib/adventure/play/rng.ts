/** Seeded PRNG for deterministic offers + combat (never Math.random in run logic). */

/** FNV-1a 32-bit hash of a string → uint32 seed. */
export function hashSeed(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** One mulberry32 step: returns [value in 0..1, next state]. Pure so reducers can store the state. */
export function nextRandom(state: number): [number, number] {
  const s = (state + 0x6d2b79f5) >>> 0;
  let t = s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, s];
}

/** Stateful convenience wrapper for one-shot deterministic sequences. */
export function makeRng(seed: string | number): () => number {
  let state = typeof seed === 'number' ? seed >>> 0 : hashSeed(seed);
  return () => {
    const [v, s] = nextRandom(state);
    state = s;
    return v;
  };
}
