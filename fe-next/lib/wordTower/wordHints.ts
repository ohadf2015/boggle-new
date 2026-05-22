/**
 * Word Tower — "how many words can I make" hint (pure, renderer-agnostic).
 *
 * Founder: it should be clearer which words exist. Rather than spoil the answers,
 * we surface a COUNT of how many dictionary words the player could build right
 * now from the anchor (the shared connector / required first letter) plus their
 * tray. Inputs are expected in the dictionary's canonical form (the dict stores
 * uppercase, Hebrew sofit→regular); the manager's anchor/tray already match it.
 */

/**
 * Count dictionary words that (a) are at least `minLen` long, (b) start with
 * `anchor`, and (c) are buildable from `anchor` + `tray` respecting letter
 * multiplicity. `dict` is iterated once — memoise the call per (anchor, tray).
 */
export function countBuildableWords(
  dict: Iterable<string>,
  anchor: string,
  tray: ReadonlyArray<string>,
  minLen: number,
): number {
  if (!anchor) return 0;

  // Available letters = the tray plus the anchor (the word's shared first letter).
  const avail = new Map<string, number>();
  avail.set(anchor, 1);
  for (const t of tray) avail.set(t, (avail.get(t) ?? 0) + 1);

  let count = 0;
  for (const w of dict) {
    if (w.length < minLen) continue;
    if (w[0] !== anchor) continue;
    const need = new Map<string, number>();
    let ok = true;
    for (const ch of w) {
      const n = (need.get(ch) ?? 0) + 1;
      need.set(ch, n);
      if (n > (avail.get(ch) ?? 0)) { ok = false; break; }
    }
    if (ok) count++;
  }
  return count;
}

/**
 * Pick a gentle clue: the SHORTEST dictionary word buildable from `anchor` +
 * `tray` (≥ `minLen`). Shortest = easiest to find, so the clue nudges rather
 * than solves. Returns null when nothing is buildable (the player should
 * scramble). Same canonical-form expectations as {@link countBuildableWords}.
 */
export function pickClueWord(
  dict: Iterable<string>,
  anchor: string,
  tray: ReadonlyArray<string>,
  minLen: number,
): string | null {
  if (!anchor) return null;
  const avail = new Map<string, number>();
  avail.set(anchor, 1);
  for (const t of tray) avail.set(t, (avail.get(t) ?? 0) + 1);

  // Prefer the shortest word of length >= 4 (so the masked reveal shows more
  // than the bare minimum); fall back to the shortest word overall.
  const PREF = Math.max(minLen, 4);
  let best: string | null = null;      // shortest with length >= PREF
  let fallback: string | null = null;  // shortest overall (>= minLen)
  for (const w of dict) {
    if (w.length < minLen) continue;
    if (w[0] !== anchor) continue;
    const improvesFallback = fallback === null || w.length < fallback.length;
    const improvesBest = w.length >= PREF && (best === null || w.length < best.length);
    if (!improvesFallback && !improvesBest) continue;
    const need = new Map<string, number>();
    let ok = true;
    for (const ch of w) {
      const n = (need.get(ch) ?? 0) + 1;
      need.set(ch, n);
      if (n > (avail.get(ch) ?? 0)) { ok = false; break; }
    }
    if (!ok) continue;
    if (improvesFallback) fallback = w;
    if (improvesBest) best = w;
  }
  return best ?? fallback;
}
