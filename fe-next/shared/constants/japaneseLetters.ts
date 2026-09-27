/**
 * Single source of truth for Japanese board generation + word validation.
 *
 * Japanese gameplay is HIRAGANA, not kanji: hiragana is a phonetic syllabary, so
 * words are sequences of adjacent kana you can trace/anagram (ねこ = ne+ko) — the
 * Boggle/wheel primitive. Kanji are logographs and cannot work as grid tiles.
 *
 * Everything Japanese (backend grid + dictionary, frontend SP grid, the
 * /api/dictionary-words endpoint, serverDicts validation, and the ja.dict.gz
 * build) MUST import from here so the board script and the validation dictionary
 * never drift apart again (the kanji/hiragana split previously broke JA play and
 * silently rejected valid words at score-sync). See
 * docs/2026-05-21-japanese-multiplayer-gameplay-audit.md.
 */

/**
 * Hiragana frequency weights. Includes voiced (dakuten が-row), semi-voiced
 * (handakuten ぱ-row), small kana (ゃゅょっ) and the long-vowel mark (ー) so common
 * words (がっこう / きゅうりょう / ちょうり) are spellable. Weights ≈ corpus frequency.
 */
export const japaneseHiraganaFrequency: Record<string, number> = {
  // vowels
  'あ': 8, 'い': 9, 'う': 8, 'え': 5, 'お': 6,
  // k-row
  'か': 7, 'き': 5, 'く': 5, 'け': 4, 'こ': 6,
  // s-row
  'さ': 4, 'し': 7, 'す': 5, 'せ': 4, 'そ': 3,
  // t-row
  'た': 6, 'ち': 4, 'つ': 5, 'て': 6, 'と': 6,
  // n-row
  'な': 5, 'に': 6, 'ぬ': 1, 'ね': 2, 'の': 7,
  // h-row
  'は': 4, 'ひ': 2, 'ふ': 2, 'へ': 2, 'ほ': 2,
  // m-row
  'ま': 4, 'み': 3, 'む': 2, 'め': 2, 'も': 3,
  // y-row
  'や': 2, 'ゆ': 2, 'よ': 3,
  // r-row
  'ら': 4, 'り': 5, 'る': 5, 'れ': 3, 'ろ': 2,
  // w-row + syllabic n
  'わ': 2, 'を': 1, 'ん': 7,
  // dakuten (voiced)
  'が': 3, 'ぎ': 1, 'ぐ': 1, 'げ': 1, 'ご': 2,
  'ざ': 1, 'じ': 3, 'ず': 1, 'ぜ': 1, 'ぞ': 1,
  'だ': 2, 'ぢ': 1, 'づ': 1, 'で': 3, 'ど': 2,
  'ば': 1, 'び': 1, 'ぶ': 1, 'べ': 1, 'ぼ': 1,
  // handakuten (semi-voiced) — rare
  'ぱ': 1, 'ぴ': 1, 'ぷ': 1, 'ぺ': 1, 'ぽ': 1,
  // small kana (modifiers) + long-vowel mark
  'ゃ': 2, 'ゅ': 2, 'ょ': 2, 'っ': 3, 'ー': 2,
};

/** Distinct hiragana characters that may appear on a board. */
export const japaneseHiragana: string[] = Object.keys(japaneseHiraganaFrequency);

/** Flattened weighted draw pool — each kana repeated by its frequency weight. */
export const JAPANESE_HIRAGANA_POOL: string[] = Object.entries(japaneseHiraganaFrequency)
  .flatMap(([kana, weight]) => Array<string>(weight).fill(kana));

/** Draw one frequency-weighted hiragana tile. */
export function randomHiragana(rng: () => number = Math.random): string {
  return JAPANESE_HIRAGANA_POOL[Math.floor(rng() * JAPANESE_HIRAGANA_POOL.length)];
}

// Hiragana block (U+3040–U+309F) + the long-vowel mark ー (U+30FC). Excludes
// katakana and kanji so junk fragments (`あるクロ`, `ある三里`) never validate.
const HIRAGANA_WORD_RE = /^[぀-ゟー]+$/;

/** True if `word` is composed solely of hiragana (+ long-vowel mark). */
export function isHiraganaWord(word: string): boolean {
  return HIRAGANA_WORD_RE.test(word);
}

/** Parse a dictionary file's text into the set of pure-hiragana words it contains. */
export function extractHiraganaWords(content: string): string[] {
  if (!content) return [];
  const out: string[] = [];
  for (const raw of content.split('\n')) {
    const w = raw.trim();
    if (w.length > 0 && isHiraganaWord(w)) out.push(w);
  }
  return out;
}
