export type PRNG = {
  next: () => number;
  intRange: (n: number) => number;
  chance: (p: number) => boolean;
  pick: <T>(arr: readonly T[]) => T;
  pickN: <T>(arr: readonly T[], n: number) => T[];
};

export function seededPRNG(seed: number): PRNG {
  let s = seed >>> 0;
  const next = () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const intRange = (n: number) => Math.floor(next() * n);
  const chance = (p: number) => next() < p;
  const pick = <T>(arr: readonly T[]): T => arr[intRange(arr.length)]!;
  const pickN = <T>(arr: readonly T[], n: number): T[] => {
    const pool = [...arr];
    const out: T[] = [];
    const k = Math.min(n, pool.length);
    for (let i = 0; i < k; i++) {
      const idx = intRange(pool.length);
      out.push(pool.splice(idx, 1)[0]!);
    }
    return out;
  };
  return { next, intRange, chance, pick, pickN };
}

export function hashStringToSeed(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
