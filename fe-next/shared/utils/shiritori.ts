/**
 * Shiritori (しりとり) chain engine — pure, dependency-free, shared by backend
 * (room state machine + bot) and frontend (turn UI / input hints).
 *
 * The chain rule is: the next word's HEAD kana must equal the previous word's
 * TAIL kana. Japanese orthography makes head/tail non-trivial:
 *   - a trailing long-vowel mark ー resolves to the VOWEL of the kana before it
 *     (すきー → い, because き is an い-row kana);
 *   - small kana (ゃゅょ / ぁぃぅぇぉ / っ / ゎ) map to their LARGE form
 *     (きんぎょ → よ);
 *   - dakuten/handakuten voicing is KEPT (strict): が matches が, not か;
 *   - a word ending in ん has no successor — playing one loses the round.
 *
 * Spec: docs/2026-05-21-shiritori-mode-spec.md §2. The strict-dakuten and
 * ー→vowel choices are the standard rules; a lenient toggle can come later.
 */

// Gojūon vowel classification: every kana → its vowel (あいうえお).
const VOWEL_ROWS: Record<string, string> = {
  あ: 'あかがさざただなはばぱまやらわゎ',
  い: 'いきぎしじちぢにひびぴみりゐ',
  う: 'うくぐすずつづぬふぶぷむゆる',
  え: 'えけげせぜてでねへべぺめれゑ',
  お: 'おこごそぞとどのほぼぽもよろを',
};
const KANA_VOWEL: Record<string, string> = {};
for (const [vowel, kana] of Object.entries(VOWEL_ROWS)) {
  for (const k of kana) KANA_VOWEL[k] = vowel;
}

// Small kana → their large counterpart (used to normalize a mora's matching kana).
const SMALL_TO_LARGE: Record<string, string> = {
  ぁ: 'あ', ぃ: 'い', ぅ: 'う', ぇ: 'え', ぉ: 'お',
  ゃ: 'や', ゅ: 'ゆ', ょ: 'よ', っ: 'つ', ゎ: 'わ',
};

/** Map a small kana to its large form; leave other kana unchanged. */
export function normalizeKana(kana: string): string {
  return SMALL_TO_LARGE[kana] ?? kana;
}

/** The kana a successor word must START with, given `word`. */
export function shiritoriHead(word: string): string {
  const chars = [...word];
  if (chars.length === 0) return '';
  return normalizeKana(chars[0]);
}

/** The kana the previous word's successor must MATCH (its effective last mora). */
export function shiritoriTail(word: string): string {
  const chars = [...word];
  if (chars.length === 0) return '';
  let i = chars.length - 1;
  const endsLong = chars[i] === 'ー';
  while (i >= 0 && chars[i] === 'ー') i--; // skip a run of long-vowel marks
  if (i < 0) return '';
  const base = normalizeKana(chars[i]);
  // ー takes the vowel of the kana it lengthens.
  return endsLong ? (KANA_VOWEL[base] ?? base) : base;
}

/** A word ending in ん has no valid successor — playing it loses the round. */
export function endsInN(word: string): boolean {
  const chars = [...word];
  return chars.length > 0 && chars[chars.length - 1] === 'ん';
}

/** True if `next` legally follows `prev` in the chain (tail(prev) === head(next)). */
export function chains(prev: string, next: string): boolean {
  if (!prev || !next) return false;
  return shiritoriTail(prev) === shiritoriHead(next);
}
