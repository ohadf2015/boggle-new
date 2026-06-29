/**
 * Swedish diacritic-stripping guard.
 *
 * Background (2026-06-28 incident — "SÖNDAG bug"):
 * A batch of Swedish words was ingested into `swedish_words_approved.txt` with
 * its diacritics ASCII-folded (å→a, ä→a, ö→o). That left non-words like
 * `sondag`, `mandag`, `lordag` in the approved set. Because Swedish validation
 * is a plain `word.toLowerCase()` membership check (see backend/dictionary.ts),
 * those stripped tokens validated as real words — so the game accepted "SONDAG"
 * in place of the correct "SÖNDAG".
 *
 * In Swedish, Å, Ä and Ö are independent letters, NOT accent variants of A/O.
 * Folding them away is always a corpus error, never a valid normalization. This
 * module detects such artifacts so a unit test can fail CI if they ever return.
 *
 * Detection is reference-based (no hardcoded list): an ASCII-only approved entry
 * is flagged when (a) a real å/ä/ö-bearing word in the reference corpus folds to
 * exactly that ASCII string, and (b) the ASCII string is not itself a real word
 * in the reference corpus. That second condition keeps legitimately-ASCII Swedish
 * words (bil, hund, katt, son, …) from being flagged.
 */

/** Fold Swedish diacritics to their ASCII look-alikes. */
export function foldSwedishDiacritics(word: string): string {
  return word
    .toLowerCase()
    .replace(/å/g, 'a')
    .replace(/ä/g, 'a')
    .replace(/ö/g, 'o');
}

export interface DiacriticArtifact {
  /** The corrupt ASCII entry found in the approved list. */
  stripped: string;
  /** Real å/ä/ö-bearing word(s) it was almost certainly folded from. */
  suggestions: string[];
}

/**
 * Allowlist of ASCII entries that fold-collide with a real å/ä/ö word but are
 * NOT diacritic-stripping artifacts, so the guard must not flag them. These are
 * legitimate dictionary entries that simply happen to ASCII-fold onto a rarer
 * accented word. Grouped by why each is legitimate. Curated 2026-06-28.
 *
 * If you add a Swedish word and the guard flags it, first confirm it is NOT a
 * stripped form of a common word (å/ä/ö are distinct letters!). Only then add
 * it here, with a reason.
 */
export const KNOWN_FOLD_COLLISIONS: ReadonlySet<string> = new Set([
  // Swedish given names / surnames (collide with rare accented words)
  'anders', 'lars', 'sara', 'brad', 'bratt', 'manne', 'sana',
  // Proper nouns / exonyms
  'aten', // Aten = Athens (sv exonym) — collides with "äten" (eaten)
  'vasa', 'vasas', // Vasa = the warship / royal house — collides with "väsa"
  // Brands
  'ford', // collides with "förd" (past participle of föra)
  // English loanwords carried intentionally
  'apple', 'star', 'tracks',
  // Legitimate Swedish inflections present in the corpus
  'nordens', // genitive of "Norden" (the Nordics) — collides with "nördens"
]);

/**
 * Find diacritic-stripped artifacts in an approved word list.
 *
 * @param approved  Candidate words to audit (the approved/seed list).
 * @param reference Authoritative corpus that carries correct å/ä/ö spelling.
 * @param allowlist ASCII fold-collisions that are legitimate (not artifacts).
 *                  Defaults to {@link KNOWN_FOLD_COLLISIONS}.
 * @returns One entry per suspected stripping artifact, with suggested fixes.
 */
export function findDiacriticStrippedSwedishWords(
  approved: Iterable<string>,
  reference: Iterable<string>,
  allowlist: Iterable<string> = KNOWN_FOLD_COLLISIONS,
): DiacriticArtifact[] {
  const truth = new Set<string>();
  for (const raw of reference) {
    const w = raw.trim().toLowerCase();
    if (w) truth.add(w);
  }

  const allowed = new Set<string>();
  for (const raw of allowlist) {
    const w = raw.trim().toLowerCase();
    if (w) allowed.add(w);
  }

  // folded-ASCII -> real diacritic word(s)
  const foldedToReal = new Map<string, string[]>();
  for (const w of truth) {
    if (!/[åäö]/.test(w)) continue;
    const folded = foldSwedishDiacritics(w);
    if (folded === w) continue; // no diacritics actually folded
    const bucket = foldedToReal.get(folded);
    if (bucket) bucket.push(w);
    else foldedToReal.set(folded, [w]);
  }

  const seen = new Set<string>();
  const artifacts: DiacriticArtifact[] = [];
  for (const raw of approved) {
    const w = raw.trim().toLowerCase();
    if (!w || seen.has(w)) continue;
    seen.add(w);
    if (/[åäö]/.test(w)) continue; // already spelled with diacritics — fine
    if (truth.has(w)) continue; // legitimate ASCII Swedish word — fine
    if (allowed.has(w)) continue; // curated legitimate fold-collision
    const suggestions = foldedToReal.get(w);
    if (suggestions) {
      artifacts.push({ stripped: w, suggestions: [...suggestions].sort() });
    }
  }
  return artifacts;
}
