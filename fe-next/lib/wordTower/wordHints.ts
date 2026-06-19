/**
 * Word Tower — "how many words can I make" hint (pure, renderer-agnostic).
 *
 * Founder: it should be clearer which words exist. Rather than spoil the answers,
 * we surface a COUNT of how many dictionary words the player could spell right
 * now from their WHEEL (the small ring of reusable letters). The chain anchor was
 * retired, so a word only needs to be buildable from the wheel — no required
 * first letter. Inputs are expected in the dictionary's canonical form (uppercase,
 * Hebrew sofit→regular); the manager's wheel already matches it.
 */

/**
 * Count dictionary words that (a) are at least `minLen` long and (b) are
 * buildable from the `wheel` respecting letter multiplicity (each wheel tile used
 * at most once). `dict` is iterated once — memoise the call per wheel.
 */
export function countBuildableWords(
  dict: Iterable<string>,
  wheel: ReadonlyArray<string>,
  minLen: number,
  usedWords?: ReadonlySet<string>,
): number {
  if (wheel.length === 0) return 0;

  const avail = new Map<string, number>();
  for (const t of wheel) avail.set(t, (avail.get(t) ?? 0) + 1);

  let count = 0;
  for (const w of dict) {
    if (w.length < minLen) continue;
    if (usedWords?.has(w)) continue;
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
 * Pick a gentle clue: the SHORTEST dictionary word buildable from the `wheel`
 * (≥ `minLen`). Shortest = easiest to find, so the clue nudges rather than
 * solves. Returns null when nothing is buildable (the player should scramble).
 * Same canonical-form expectations as {@link countBuildableWords}.
 */
export function pickClueWord(
  dict: Iterable<string>,
  wheel: ReadonlyArray<string>,
  minLen: number,
  usedWords?: ReadonlySet<string>,
): string | null {
  if (wheel.length === 0) return null;
  const avail = new Map<string, number>();
  for (const t of wheel) avail.set(t, (avail.get(t) ?? 0) + 1);

  // Prefer the shortest word of length >= 4 (so the masked reveal shows more
  // than the bare minimum); fall back to the shortest word overall.
  const PREF = Math.max(minLen, 4);
  let best: string | null = null;      // shortest with length >= PREF
  let fallback: string | null = null;  // shortest overall (>= minLen)
  for (const w of dict) {
    if (w.length < minLen) continue;
    if (usedWords?.has(w)) continue;
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
