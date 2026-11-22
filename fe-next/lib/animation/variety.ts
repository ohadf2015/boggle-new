/** Bounded randomness for repeated feedback, so the same moment never plays identically twice. */
export type Rand = () => number;

export const jitter = (base: number, spread: number, rand: Rand = Math.random): number =>
  base + (rand() * 2 - 1) * spread;

export const pick = <T,>(items: readonly T[], rand: Rand = Math.random): T =>
  items[Math.min(items.length - 1, Math.floor(rand() * items.length))];

export function pickOther<T>(items: readonly T[], prev: T | undefined, rand: Rand = Math.random): T {
  const rest = items.filter((i) => i !== prev);
  return pick(rest.length ? rest : items, rand);
}

export const sign = (rand: Rand = Math.random): 1 | -1 => (rand() < 0.5 ? -1 : 1);

export function lowEndMotion(): boolean {
  if (typeof navigator === 'undefined') return false;
  const nav = navigator as Navigator & { deviceMemory?: number };
  return (nav.hardwareConcurrency || 8) <= 4 || (nav.deviceMemory ?? 8) <= 4;
}
