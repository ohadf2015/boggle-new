/**
 * Local persisted dedup for hidden achievements. Reveal-on-unlock only — we store
 * an "earned" flag per id so the celebration fires exactly once, ever. SSR-safe:
 * every accessor degrades to a no-op when localStorage is unavailable, and never
 * throws into the game loop.
 *
 * NOTE: this is the dedup that the pure (stateless) detectors deliberately omit.
 */

const KEY_PREFIX = 'lexiclash_hidden_ach_';

function store(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function hasEarned(id: string): boolean {
  try {
    return store()?.getItem(KEY_PREFIX + id) === '1';
  } catch {
    return false;
  }
}

/** Mark an achievement earned. Returns true iff this was the FIRST time. */
export function markEarned(id: string): boolean {
  if (hasEarned(id)) return false;
  try {
    store()?.setItem(KEY_PREFIX + id, '1');
  } catch {
    /* quota / unavailable — surfacing is cosmetic, never block gameplay */
  }
  return true;
}

/** All earned achievement ids (best-effort; [] when storage unavailable). */
export function getEarnedIds(): string[] {
  const s = store();
  if (!s) return [];
  const ids: string[] = [];
  try {
    for (let i = 0; i < s.length; i++) {
      const k = s.key(i);
      if (k && k.startsWith(KEY_PREFIX) && s.getItem(k) === '1') {
        ids.push(k.slice(KEY_PREFIX.length));
      }
    }
  } catch {
    return [];
  }
  return ids;
}
