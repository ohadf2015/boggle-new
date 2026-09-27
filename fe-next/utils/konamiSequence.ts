/**
 * The classic Konami code. Arrow keys use KeyboardEvent.key values; the final
 * two are letters compared case-insensitively (Shift may upper-case them).
 */
export const KONAMI_SEQUENCE = [
  'ArrowUp',
  'ArrowUp',
  'ArrowDown',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowLeft',
  'ArrowRight',
  'b',
  'a',
] as const;

function norm(key: string): string {
  // Single-character keys (letters) are case-folded; named keys (Arrow*) pass through.
  return key.length === 1 ? key.toLowerCase() : key;
}

export interface KonamiStep {
  /** Index of the next expected key. */
  progress: number;
  /** True only on the keypress that completes the full sequence. */
  matched: boolean;
}

/**
 * Pure reducer: advance the Konami matcher by one keypress.
 *
 * - Correct next key → progress advances; completing the sequence sets
 *   `matched` and resets progress to 0 (so the code is re-armable).
 * - Wrong key → progress resets, but if that key is itself the first step we
 *   keep progress at 1 (lenient restart, e.g. Up-Up-Up still makes headway).
 */
export function advanceKonami(progress: number, key: string): KonamiStep {
  const k = norm(key);
  if (k === norm(KONAMI_SEQUENCE[progress])) {
    const next = progress + 1;
    if (next === KONAMI_SEQUENCE.length) {
      return { progress: 0, matched: true };
    }
    return { progress: next, matched: false };
  }
  // Mismatch: restart, allowing the wrong key to seed a fresh attempt.
  return { progress: k === norm(KONAMI_SEQUENCE[0]) ? 1 : 0, matched: false };
}
