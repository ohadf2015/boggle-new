// Word Alchemy — pure game logic + curated puzzles. Extracted from page.tsx so the
// page file only exports Next page fields (default + metadata); a webpack prod build
// rejects arbitrary named exports from a page. Imported by the page + unit tests.
import { HEBREW_FINAL_TO_REGULAR } from "@/shared/utils/wordNormalization";

// ─── Pure game logic (exported for unit tests) ──────────────────────────────

export const ALCHEMY_OPS = [
  'synonym',
  'anagram',
  'reverse',
  'addLetter',
  'removeLetter',
  'changeLetter',
  'homophone',
] as const;

export type AlchemyOp = (typeof ALCHEMY_OPS)[number];

export interface AlchemyStep {
  op: AlchemyOp;
  /** The word this step produces (uppercase, letters only). */
  answer: string;
  /** Optional clue translation key — used for ambiguous ops (synonym/homophone). */
  clueKey?: string;
}

export interface AlchemyPuzzle {
  id: string;
  start: string;
  steps: AlchemyStep[];
}

/**
 * Normalize a guess to the canonical answer form, language-agnostically:
 * English letters are uppercased and kept; Hebrew letters are kept as-is (no
 * case) with sofit/final forms folded to their base letter (ם→מ, ן→נ, …) so a
 * player can type either form; everything else (spaces, punctuation, niqqud) is
 * stripped. Curated answers are stored in this same base form.
 */
export function normalizeGuess(input: string): string {
  let out = '';
  for (const ch of input.toUpperCase()) {
    if (ch >= 'A' && ch <= 'Z') out += ch;                       // English A–Z
    else if (HEBREW_FINAL_TO_REGULAR[ch]) out += HEBREW_FINAL_TO_REGULAR[ch]; // sofit → base
    else if (ch >= 'א' && ch <= 'ת') out += ch;        // Hebrew base letters
  }
  return out;
}

/** Exact-match a player's guess against a step's curated answer. */
export function checkGuess(guess: string, answer: string): boolean {
  const g = normalizeGuess(guess);
  return g.length > 0 && g === normalizeGuess(answer);
}

/**
 * Progressive letter reveal. The more wrong attempts, the more letters show —
 * but the top tier still hides the middle letter so the answer is never fully
 * given away. Returns a space-joined mask, e.g. `'B _ _ R'`.
 */
export function revealHint(answer: string, wrongCount: number): string {
  const letters = answer.toUpperCase().split('');
  const n = letters.length;
  const tier = wrongCount < 2 ? 0 : wrongCount < 4 ? 1 : wrongCount < 6 ? 2 : 3;
  const revealed = new Set<number>();
  if (tier >= 1) revealed.add(0);
  if (tier >= 2) revealed.add(n - 1);
  if (tier >= 3) {
    const mid = Math.floor(n / 2);
    for (let i = 0; i < n; i++) if (i !== mid) revealed.add(i);
  }
  return letters.map((ch, i) => (revealed.has(i) ? ch : '_')).join(' ');
}

/**
 * Hand-authored chains for the admin pilot. English-only content (the chrome
 * is localized via `t()`); each labelled op genuinely maps the prior word to
 * the answer, so the moves are fair once you know the operation.
 */
export const PUZZLES: AlchemyPuzzle[] = [
  {
    id: 'p1',
    start: 'STAR',
    steps: [
      { op: 'reverse', answer: 'RATS' },
      { op: 'anagram', answer: 'ARTS' },
    ],
  },
  {
    id: 'p2',
    start: 'FLOUR',
    steps: [
      { op: 'homophone', answer: 'FLOWER', clueKey: 'wordAlchemy.clues.p2s1' },
      { op: 'removeLetter', answer: 'LOWER' },
    ],
  },
  {
    id: 'p3',
    start: 'CAT',
    steps: [
      { op: 'addLetter', answer: 'COAT' },
      { op: 'changeLetter', answer: 'GOAT' },
    ],
  },
  {
    id: 'p4',
    start: 'NIGHT',
    steps: [
      { op: 'anagram', answer: 'THING' },
      { op: 'changeLetter', answer: 'THINK' },
    ],
  },
  {
    id: 'p5',
    start: 'FAST',
    steps: [
      { op: 'synonym', answer: 'QUICK', clueKey: 'wordAlchemy.clues.p5s1' },
      { op: 'changeLetter', answer: 'QUACK' },
    ],
  },
  {
    id: 'p6',
    start: 'SUN',
    steps: [
      { op: 'homophone', answer: 'SON', clueKey: 'wordAlchemy.clues.p6s1' },
      { op: 'addLetter', answer: 'SONG' },
    ],
  },
];

/**
 * Hebrew chains for the /he playtest. Stored in BASE-letter form (no sofit) so
 * `normalizeGuess` matches them whether the player types base or final letters;
 * the UI applies sofit only for display. Every op genuinely maps the prior word
 * to the answer (reverse/anagram/add/remove/change — the mechanical ops, which
 * transfer cleanly to Hebrew; synonym/homophone are skipped here since Hebrew
 * phonetics make homophones unreliable). All words verified against the he list.
 */
export const PUZZLES_HE: AlchemyPuzzle[] = [
  {
    id: 'h1',
    start: 'רוח', // wind
    steps: [
      { op: 'reverse', answer: 'חור' },       // hole — רוח reversed
      { op: 'changeLetter', answer: 'חול' },   // sand — ר→ל
    ],
  },
  {
    id: 'h2',
    start: 'ספר', // book
    steps: [
      { op: 'anagram', answer: 'פרס' },        // prize — same letters
      { op: 'addLetter', answer: 'פרסה' },     // hoof — +ה
    ],
  },
  {
    id: 'h3',
    start: 'כלב', // dog
    steps: [
      { op: 'changeLetter', answer: 'כלא' },   // prison — ב→א
      { op: 'changeLetter', answer: 'מלא' },   // full — כ→מ
    ],
  },
  {
    id: 'h4',
    start: 'שמלה', // dress
    steps: [
      { op: 'removeLetter', answer: 'מלה' },   // word — −ש
      { op: 'anagram', answer: 'להמ' },        // "to them" (להם) — same letters
    ],
  },
  {
    id: 'h5',
    start: 'אור', // light
    steps: [
      { op: 'addLetter', answer: 'אורז' },     // rice — +ז
      { op: 'changeLetter', answer: 'אורח' },  // guest — ז→ח
    ],
  },
  {
    id: 'h6',
    start: 'חתול', // cat
    steps: [
      { op: 'removeLetter', answer: 'חול' },   // sand — −ת
      { op: 'reverse', answer: 'לוח' },        // board — חול reversed
    ],
  },
];
