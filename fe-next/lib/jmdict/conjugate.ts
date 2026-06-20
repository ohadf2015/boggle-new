/**
 * Deterministic Japanese conjugation derivation for dictionary expansion.
 *
 * JMdict is a LEMMA dictionary — inflected forms are absent, so a player forming
 * たべた / のんだ / たかかった on a hiragana board is wrongly rejected. Conjugation
 * is fully deterministic GIVEN the verb class, which JMdict declares via <pos>
 * entities. We generate from authority (lemma + declared class), never guess:
 *   - ichidan  (v1, v1-s)         stem = reading − る
 *   - godan    (v5u/k/g/s/t/n/b/m/r)  euphonic stem by ending
 *   - i-adj    (adj-i)            stem = reading − い
 * Irregular / special classes (v5k-s iku, v5r-i aru, vs-i/vs-s suru, vk kuru,
 * adj-ix ii) are SKIPPED — they would need bespoke rules, so we mint zero junk.
 *
 * Only a conservative high-frequency core of forms is emitted (past, negative,
 * polite, polite-past, te, past-negative; adjectives add adverbial), all the
 * forms a casual word-game player actually types.
 */

import { isHiraganaWord } from '@/shared/constants/japaneseLetters';

export type ConjClass =
  | 'ichidan'
  | 'godan-u'
  | 'godan-k'
  | 'godan-g'
  | 'godan-s'
  | 'godan-t'
  | 'godan-n'
  | 'godan-b'
  | 'godan-m'
  | 'godan-r'
  | 'adj-i';

// JMdict <pos> entity (without the surrounding & ;) → conjugation class.
// Anything not listed here (incl. every *-s/*-i/irregular variant) yields null.
const POS_TO_CLASS: Record<string, ConjClass> = {
  v1: 'ichidan',
  'v1-s': 'ichidan', // くれる: differs only in imperative, which we don't emit
  v5u: 'godan-u',
  v5k: 'godan-k',
  v5g: 'godan-g',
  v5s: 'godan-s',
  v5t: 'godan-t',
  v5n: 'godan-n',
  v5b: 'godan-b',
  v5m: 'godan-m',
  v5r: 'godan-r',
  'adj-i': 'adj-i',
};

// The okurigana a reading MUST end in for its class — guards against conjugating
// e.g. a noun reading attached to a する compound entry.
const REQUIRED_ENDING: Record<ConjClass, string> = {
  ichidan: 'る',
  'godan-u': 'う',
  'godan-k': 'く',
  'godan-g': 'ぐ',
  'godan-s': 'す',
  'godan-t': 'つ',
  'godan-n': 'ぬ',
  'godan-b': 'ぶ',
  'godan-m': 'む',
  'godan-r': 'る',
  'adj-i': 'い',
};

/** Resolve a list of JMdict POS entities to a single conjugation class (or null). */
export function classifyConjugation(posTags: readonly string[]): ConjClass | null {
  for (const tag of posTags) {
    const cls = POS_TO_CLASS[tag];
    if (cls) return cls;
  }
  return null;
}

// The three highest-frequency irregular verbs cannot be rule-derived, so each
// carries an explicit form table — fired ONLY when BOTH the exact lemma reading
// AND its declared irregular POS match (so a compound-suru noun reading like
// べんきょう, which never equals する, is never force-conjugated).
const IRREGULARS: { reading: string; pos: string[]; forms: string[] }[] = [
  { reading: 'する', pos: ['vs-i', 'vs-s'], forms: ['した', 'します', 'しない', 'して', 'しました', 'しなかった'] },
  { reading: 'くる', pos: ['vk'], forms: ['きた', 'きます', 'こない', 'きて', 'きました', 'こなかった'] },
  { reading: 'いく', pos: ['v5k-s'], forms: ['いった', 'いきます', 'いかない', 'いって', 'いきました', 'いかなかった'] },
];
const IRREGULAR_POS = new Set(IRREGULARS.flatMap((r) => r.pos));

/** True if these POS entities are conjugatable by rule OR by the irregular table. */
export function isConjugatablePos(posTags: readonly string[]): boolean {
  return classifyConjugation(posTags) !== null || posTags.some((p) => IRREGULAR_POS.has(p));
}

// Godan euphonic suffix tables: [past, te, neg-stem, polite-stem].
// neg = stem + negStem + ない ; polite = stem + politeStem + ます.
const GODAN: Record<string, { past: string; te: string; neg: string; polite: string }> = {
  'godan-u': { past: 'った', te: 'って', neg: 'わ', polite: 'い' },
  'godan-k': { past: 'いた', te: 'いて', neg: 'か', polite: 'き' },
  'godan-g': { past: 'いだ', te: 'いで', neg: 'が', polite: 'ぎ' },
  'godan-s': { past: 'した', te: 'して', neg: 'さ', polite: 'し' },
  'godan-t': { past: 'った', te: 'って', neg: 'た', polite: 'ち' },
  'godan-n': { past: 'んだ', te: 'んで', neg: 'な', polite: 'に' },
  'godan-b': { past: 'んだ', te: 'んで', neg: 'ば', polite: 'び' },
  'godan-m': { past: 'んだ', te: 'んで', neg: 'ま', polite: 'み' },
  'godan-r': { past: 'った', te: 'って', neg: 'ら', polite: 'り' },
};

function conjugate(reading: string, cls: ConjClass): string[] {
  if (!reading.endsWith(REQUIRED_ENDING[cls])) return [];
  const stem = reading.slice(0, -1); // drop final mora
  if (stem.length === 0) return [];

  let forms: string[];
  if (cls === 'ichidan') {
    forms = [
      `${stem}た`, // past
      `${stem}ない`, // negative
      `${stem}ます`, // polite
      `${stem}ました`, // polite past
      `${stem}て`, // te-form
      `${stem}なかった`, // past negative
    ];
  } else if (cls === 'adj-i') {
    forms = [
      `${stem}かった`, // past
      `${stem}くない`, // negative
      `${stem}くて`, // te-form
      `${stem}く`, // adverbial
      `${stem}くなかった`, // past negative
    ];
  } else {
    const g = GODAN[cls];
    forms = [
      `${stem}${g.past}`,
      `${stem}${g.te}`,
      `${stem}${g.neg}ない`,
      `${stem}${g.polite}ます`,
      `${stem}${g.polite}ました`,
      `${stem}${g.neg}なかった`,
    ];
  }

  // Belt-and-suspenders: only pure-hiragana, and never re-emit the lemma.
  return forms.filter((w) => w !== reading && isHiraganaWord(w));
}

/**
 * Derive the conjugated forms for a JMdict reading given its raw POS entities.
 * Returns [] when the entry is not safely conjugatable.
 */
export function deriveForms(reading: string, posTags: readonly string[]): string[] {
  // Irregulars first: exact lemma + declared irregular POS.
  for (const irr of IRREGULARS) {
    if (reading === irr.reading && posTags.some((p) => irr.pos.includes(p))) {
      return irr.forms.filter((w) => w !== reading && isHiraganaWord(w));
    }
  }
  const cls = classifyConjugation(posTags);
  if (!cls) return [];
  return conjugate(reading, cls);
}
