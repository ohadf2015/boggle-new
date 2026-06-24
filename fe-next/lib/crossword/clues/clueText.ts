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
