export const PLAYER_SEED_KEY = 'connections:seed';

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

/**
 * Stable per-device shuffle seed for the play-mode puzzle order. 0 (the SSR
 * value) means "legacy deterministic order" — the seeded path only kicks in
 * client-side, mirroring how levelStore returns level 1 on the server.
 */
export function getPlayerSeed(): number {
  if (!isBrowser()) return 0;
  const raw = window.localStorage.getItem(PLAYER_SEED_KEY);
  const n = raw === null ? Number.NaN : Number.parseInt(raw, 10);
  if (Number.isInteger(n) && n > 0) return n;
  const seed = 1 + Math.floor(Math.random() * 2 ** 31);
  window.localStorage.setItem(PLAYER_SEED_KEY, String(seed));
  return seed;
}
