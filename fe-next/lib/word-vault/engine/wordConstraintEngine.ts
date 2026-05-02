import type { WordConstraintRiddle } from '../types';

const FINAL_TO_BASE_HE: Record<string, string> = {
  'ך': 'כ',
  'ם': 'מ',
  'ן': 'נ',
  'ף': 'פ',
  'ץ': 'צ',
};

export function normalizeHebrewFinalForms(word: string): string {
  let out = '';
  for (const ch of word) {
    out += FINAL_TO_BASE_HE[ch] ?? ch;
  }
  return out;
}

export type ValidationResult = { ok: true; matched: string } | { ok: false; reason: string };

export function validateWordConstraint(
  candidate: string,
  riddle: WordConstraintRiddle,
): ValidationResult {
  if (candidate.length < riddle.minLength) {
    return { ok: false, reason: 'too-short' };
  }
  const norm = normalizeHebrewFinalForms(candidate);
  for (const target of riddle.targetWords) {
    if (normalizeHebrewFinalForms(target) === norm) {
      return { ok: true, matched: target };
    }
  }
  return { ok: false, reason: 'no-match' };
}

export function isAllowedTileSet(candidate: string, riddle: WordConstraintRiddle): boolean {
  const pool = new Map<string, number>();
  for (const t of riddle.tiles) {
    pool.set(t.letter, (pool.get(t.letter) ?? 0) + 1);
  }
  for (const ch of candidate) {
    const remaining = pool.get(ch) ?? 0;
    if (remaining <= 0) return false;
    pool.set(ch, remaining - 1);
  }
  return true;
}
