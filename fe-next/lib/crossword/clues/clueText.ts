// Pure helpers for turning raw dictionary definitions into crossword clue text and
// gating clue quality. No network, no fs — unit-tested. Imported by both the build
// script (scripts/crossword/clues/*) and the runtime clue bank.

const LEADING_ARTICLE = /^(a|an|the)\s+/i;
const POS_PREFIX = /^[a-z]+\t/; // Datamuse defs look like "n\t...", "v\t..."
const PARENS = /\([^)]*\)/g;

/** Strip Datamuse POS prefix, parentheticals, leading article, trailing period; sentence-case. */
export function cleanDefinition(raw: string): string {
  let s = raw.replace(POS_PREFIX, '');
  s = s.replace(PARENS, ' ');
  s = s.replace(/\s+/g, ' ').trim();
  s = s.replace(/\.+$/, '').trim();
  s = s.replace(LEADING_ARTICLE, '');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Shared 3+ char prefix => same stem (cheap derivative check, catches run/running). */
function sharesStem(a: string, b: string): boolean {
  const x = a.toLowerCase();
  const y = b.toLowerCase();
  let n = 0;
  const max = Math.min(x.length, y.length);
  while (n < max && x[n] === y[n]) n++;
  return n >= 3 && Math.min(x.length, y.length) >= 3;
}

/**
 * True if the clue gives the answer away (contains it, or a derivative of it). Tokenizes on
 * Unicode letters (`\p{L}`), not `[a-z]` — the old Latin-only regex matched zero Hebrew/accented
 * characters, so the gate silently passed every non-English clue (Hebrew bank was ~20% circular).
 */
export function isCircularClue(clue: string, answer: string): boolean {
  const ans = answer.toLowerCase();
  const words = clue.toLowerCase().match(/\p{L}+/gu) ?? [];
  return words.some((w) => w === ans || w.includes(ans) || sharesStem(w, ans));
}

const CLUE_MAX = 64;

/** Non-empty and within the length cap. */
export function clueLengthOk(clue: string): boolean {
  const t = clue.trim();
  return t.length > 0 && t.length <= CLUE_MAX;
}

/** Collapse whitespace, trim, capitalize first letter. */
export function normalizeClue(clue: string): string {
  const t = clue.replace(/\s+/g, ' ').trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/**
 * Turn a dictionary definition (e.g. a Wiktionary gloss) into a short crossword clue:
 * clean → first clause/sentence → cap at CLUE_MAX on a word boundary (no ellipsis).
 * Returns null if the result is empty, untrimmable to length, or circular (gives the
 * answer away). Language-agnostic: tokenization uses \p{L} via isCircularClue.
 */
function firstSentence(def: string): string {
  let s = cleanDefinition(def).replace(/…+$/, '').trim();
  // first sentence (Latin "." / ";" and CJK "。" "；"), then drop a trailing "— extra" gloss
  s = s.split(/(?<=[.;])\s|。|；/)[0].trim();
  s = s.split(/\s[—–]\s/)[0].trim();
  return s.replace(/[.;,\s]+$/, '').trim(); // drop the sentence-end punctuation the split kept
}

const MODIFIER_START = new RegExp(
  [
    'котор\\p{L}*', 'а также', 'также', 'обычно', 'как правило', 'в том числе', 'чаще всего', 'преимущественно', 'особенно',
    '\\p{L}+(?:щ|вш|нн|ем|им)(?:ий|ый|ая|ее|ое|ие|ые|их|ых|ым|им|ими|ую|ого|ей|ой)',
    '\\p{L}+т(?:ый|ая|ое|ые|ых|ым|ую|ого|ой)',
    'que', 'con', 'cuy[oa]s?', 'el cual', 'la cual', 'generalmente', 'especialmente', 'normalmente', 'sobre todo', 'en especial', 'y también', 'también',
    '\\p{L}+(?:ad|id)[oa]s?', '\\p{L}+(?:ando|iendo)',
  ].map((p) => `^(?:${p})(?!\\p{L})`).join('|'),
  'u',
);

/** False when the clue is a hard word-boundary cut that stops mid-clause (reads as truncated). */
export function clueEndsAtClause(def: string, clue: string): boolean {
  const s = normalizeClue(firstSentence(def)).toLowerCase();
  const c = clue.toLowerCase();
  if (!s.startsWith(c)) return false;
  const rest = s.slice(c.length);
  if (rest === '') return true;
  // a comma cut is safe only when it drops a modifier clause; cutting a list leaves half a meaning
  const next = rest.replace(/^\s*,\s*/, '');
  return rest !== next && c.split(/\s+/).length >= 3 && MODIFIER_START.test(next);
}

export function definitionToClue(def: string, answer: string): string | null {
  if (!def) return null;
  let s = firstSentence(def);
  if (s.length > CLUE_MAX) {
    // prefer cutting at a clause (comma) boundary so we don't dangle mid-phrase
    const parts = s.split(',');
    let acc = '';
    for (const p of parts) {
      const next = acc ? `${acc},${p}` : p;
      if (next.trim().length <= CLUE_MAX) acc = next; else break;
    }
    s = acc.trim();
    if (s.length === 0 || s.length > CLUE_MAX) {
      const cut = s.length ? s : parts[0]; // first clause still too long → hard word-boundary cut
      const c = cut.slice(0, CLUE_MAX);
      const sp = c.lastIndexOf(' ');
      s = (sp > 20 ? c.slice(0, sp) : c).trim(); // CJK has no spaces → hard cut
    }
    s = s.replace(/[.;,\s]+$/, '').trim();
  }
  s = normalizeClue(s);
  if (!clueLengthOk(s)) return null;
  if (isCircularClue(s, answer)) return null;
  return s;
}
