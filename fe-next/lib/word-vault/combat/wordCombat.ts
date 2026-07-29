import { normalizeHebrewFinalForms } from '../engine/wordConstraintEngine';

export const COMBAT_BASE_DAMAGE_PER_LETTER = 8;

const SHIELD_WORDS_NORMALIZED = new Set(['מגנ', 'הגנה', 'חומה', 'סלע']);

export function isShieldWord(rawWord: string): boolean {
  return SHIELD_WORDS_NORMALIZED.has(normalizeHebrewFinalForms(rawWord));
}

export type WordTier = 'small' | 'big' | 'huge' | 'legendary';

export function tierForWord(rawWord: string): WordTier {
  const len = normalizeHebrewFinalForms(rawWord).length;
  if (len >= 6) return 'legendary';
  if (len >= 5) return 'huge';
  if (len >= 4) return 'big';
  return 'small';
}

export function tierLabelHe(tier: WordTier): string {
  return tier === 'legendary' ? 'מילה אגדית!' : tier === 'huge' ? 'מכה ענקית!' : tier === 'big' ? 'יפה!' : '';
}

export function tierMultiplier(tier: WordTier): number {
  return tier === 'legendary' ? 2.5 : tier === 'huge' ? 1.8 : tier === 'big' ? 1.3 : 1;
}

const BONUS_WORDS_NORMALIZED: Record<string, number> = {
  מימ: 1.5,
  קרח: 2.0,
  שלג: 2.0,
  קור: 1.5,
  כיבוי: 2.5,
};

export const MERCY_WORD_NORMALIZED = 'קאל';
export const SOOTHE_WORDS_NORMALIZED = new Set(['אהבה', 'מתכונ', 'אחי', 'סליחה', 'זכרונ']);

export function computeAttackDamage(rawWord: string): number {
  const word = normalizeHebrewFinalForms(rawWord);
  if (word.length < 2) return 0;
  const base = word.length * COMBAT_BASE_DAMAGE_PER_LETTER;
  const bonus = BONUS_WORDS_NORMALIZED[word] ?? 1;
  const tierMul = tierMultiplier(tierForWord(rawWord));
  return Math.round(base * bonus * tierMul);
}

export function isSootheWord(rawWord: string): boolean {
  return SOOTHE_WORDS_NORMALIZED.has(normalizeHebrewFinalForms(rawWord));
}

export function isMercyWord(rawWord: string): boolean {
  return normalizeHebrewFinalForms(rawWord) === MERCY_WORD_NORMALIZED;
}

export function isCryoBonus(rawWord: string): boolean {
  const w = normalizeHebrewFinalForms(rawWord);
  const cooler = BONUS_WORDS_NORMALIZED[w];
  return cooler !== undefined && cooler >= 2;
}

export const HEBREW_LETTERS = [
  'א','ב','ג','ד','ה','ו','ז','ח','ט','י','כ','ל','מ','נ','ס','ע','פ','צ','ק','ר','ש','ת',
];

const STARTING_POOL_PREFERRED = ['א','ה','ל','מ','ר','ק','ב','י','ש','ח','ו','ת'];

export function rollStartingLetters(count: number = 9): string[] {
  const out: string[] = [];
  for (let i = 0; i < count; i += 1) {
    out.push(STARTING_POOL_PREFERRED[i % STARTING_POOL_PREFERRED.length]);
  }
  return shuffle(out);
}

export function rollNewLetter(): string {
  const i = Math.floor(Math.random() * HEBREW_LETTERS.length);
  return HEBREW_LETTERS[i];
}

const MERCY_GUARANTEED_LETTERS = ['ק', 'א', 'ל', 'ה', 'ב', 'מ'] as const;

/** Inject letters required for Phase 3 win conditions if missing from bar. */
export function ensureMercyLetters(letters: string[]): string[] {
  const next = [...letters];
  const present = new Set(next);
  const missing = MERCY_GUARANTEED_LETTERS.filter((l) => !present.has(l));
  if (missing.length === 0) return next;
  // Replace random tiles with the missing letters
  const replaceIdx = shuffle(next.map((_, i) => i)).slice(0, missing.length);
  for (let i = 0; i < missing.length; i += 1) {
    next[replaceIdx[i]] = missing[i];
  }
  return next;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const CINDER_TAUNTS = [
  'זה כל מה שיש לך?',
  'הא! מילים קטנות.',
  'בא לי לצלות אותך.',
  'נסה משהו ארוך יותר.',
  'משעמם.',
  'רעב. כועס. שניהם.',
];

export const CINDER_HURT_LINES = [
  'אוף!',
  'אאוץ׳.',
  'זה כאב.',
  'איך עשית את זה?',
];

export const CINDER_PHASE3_WHISPERS = [
  'מלו? זה אתה?',
  'אני זוכר ריח של לחם…',
  'אחי…',
  'תעצור. בבקשה.',
];
