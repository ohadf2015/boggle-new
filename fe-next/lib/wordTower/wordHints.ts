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

/** How many candidates a single wheel's clue rotation holds. Past this the
 *  player is not short of ideas, and an unbounded list would grow with the
 *  dictionary for no gain. */
const CLUE_ROTATION_CAP = 12;

/**
 * Pick a gentle clue: the SHORTEST dictionary word buildable from the `wheel`
 * (≥ `minLen`). Shortest = easiest to find, so the clue nudges rather than
 * solves. Returns null when nothing is buildable (the player should scramble).
 * Same canonical-form expectations as {@link countBuildableWords}.
 *
 * `skip` advances through the ranked candidates so the SECOND clue on one wheel
 * is a different word than the first (it wraps once they run out). Without it
 * the function was fully determined by (dict, wheel, usedWords) — a player who
 * spent a rewarded ad on clue #2 got the exact same word back.
 */
export function pickClueWord(
  dict: Iterable<string>,
  wheel: ReadonlyArray<string>,
  minLen: number,
  usedWords?: ReadonlySet<string>,
  skip: number = 0,
): string | null {
  if (wheel.length === 0) return null;
  const avail = new Map<string, number>();
  for (const t of wheel) avail.set(t, (avail.get(t) ?? 0) + 1);

  // Prefer words of length >= 4 (so the reveal shows more than the bare
  // minimum), shortest first within each tier; sub-4 words are the fallback tier.
  const PREF = Math.max(minLen, 4);
  const candidates: string[] = [];
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
    if (ok) candidates.push(w);
  }
  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    const tierA = a.length >= PREF ? 0 : 1;
    const tierB = b.length >= PREF ? 0 : 1;
    if (tierA !== tierB) return tierA - tierB;
    if (a.length !== b.length) return a.length - b.length;
    return a < b ? -1 : a > b ? 1 : 0; // stable across dictionary iteration order
  });

  const pool = candidates.slice(0, CLUE_ROTATION_CAP);
  const i = ((skip % pool.length) + pool.length) % pool.length; // negative-safe
  return pool[i];
}
