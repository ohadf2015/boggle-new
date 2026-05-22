/**
 * JMdict reading extraction for bulk Japanese dictionary expansion.
 *
 * JA gameplay validates HIRAGANA. JMdict `<reb>` reading elements are kana
 * (hiragana or katakana). We fold katakana → hiragana, keep pure-hiragana
 * readings, and skip entries whose senses are flagged `&sens;` (sensitive —
 * JMdict's slur/discriminatory marker) or `&X;` (rude / X-rated). Vulgar/slang/
 * derogatory are kept (word-game norm — matches the slur-only auto-promo policy).
 */

import { isHiraganaWord } from '@/shared/constants/japaneseLetters';

const KATAKANA_START = 0x30a1; // ァ
const KATAKANA_END = 0x30f6;   // ヶ
const KANA_OFFSET = 0x60;      // katakana → hiragana

/** Fold katakana code points to hiragana; leave hiragana and ー (U+30FC) intact. */
export function katakanaToHiragana(input: string): string {
  let out = '';
  for (const ch of input) {
    const code = ch.codePointAt(0)!;
    out += code >= KATAKANA_START && code <= KATAKANA_END
      ? String.fromCodePoint(code - KANA_OFFSET)
      : ch;
  }
  return out;
}

// Entries with any of these JMdict misc entities are skipped wholesale (a reading
// is shared across senses, so we exclude conservatively).
const SKIP_ENTITIES = ['&sens;', '&X;'];

/**
 * Parse raw JMdict XML into the set of clean, pure-hiragana readings.
 * Tolerant of the full XML or fragments; uses block/regex scans (no XML parser
 * dependency) which is robust for JMdict's flat, regular structure.
 */
export function parseJmdictReadings(xml: string): Set<string> {
  const out = new Set<string>();
  if (!xml) return out;

  const entryPattern = /<entry\b[\s\S]*?<\/entry>/g;
  const rebPattern = /<reb>([^<]+)<\/reb>/g;

  let entryMatch: RegExpExecArray | null;
  while ((entryMatch = entryPattern.exec(xml)) !== null) {
    const block = entryMatch[0];
    if (SKIP_ENTITIES.some(tag => block.includes(tag))) continue;

    let rebMatch: RegExpExecArray | null;
    rebPattern.lastIndex = 0;
    while ((rebMatch = rebPattern.exec(block)) !== null) {
      const word = katakanaToHiragana(rebMatch[1].trim());
      if (word.length > 0 && isHiraganaWord(word)) out.add(word);
    }
  }
  return out;
}
