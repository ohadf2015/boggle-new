/**
 * Shareable miss-gap practice card / PDF — take-home after Unplugged Classroom assign.
 *
 * Kahoot Classic Unplugged has no take-home. After a teacher assigns Unplugged
 * reteach via Google Classroom (#968/#970), this builds a public share URL whose
 * page + print dialog reuse the #957 missed-words practice sheet (class-level
 * words only — never student names). Foil: parents / Slack get a practice card
 * they can open and Print → Save as PDF.
 *
 * Reuses class-gap payload shape (#899) and #957 sanitize/dedupe caps.
 */

import {
  CLASS_GAP_ORIGIN,
  MAX_MISSED_WORDS,
  MAX_WORD_LENGTH,
  normalizeLocale,
  toClassGapPayload,
  type ClassGapShareInput,
  type ClassGapSharePayload,
} from './classGapShare';

export const MISS_GAP_PRACTICE_PATH = '/education/miss-gap-practice';

function sanitizeText(value: string, max: number): string {
  return value
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

/** Same trim/dedupe/cap as #957 printable sheet — no student names. */
function normalizeMissedWords(words: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of words || []) {
    const word = sanitizeText(String(raw || ''), MAX_WORD_LENGTH);
    if (!word) continue;
    const key = word.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(word);
    if (out.length >= MAX_MISSED_WORDS) break;
  }
  return out;
}

function isPayload(
  value: ClassGapShareInput | ClassGapSharePayload,
): value is ClassGapSharePayload {
  return (
    typeof value === 'object' &&
    value !== null &&
    'lesson' in value &&
    typeof (value as ClassGapSharePayload).lesson === 'string' &&
    Array.isArray((value as ClassGapSharePayload).missedWords) &&
    !('lessonNames' in value)
  );
}

function toPayload(
  input: ClassGapShareInput | ClassGapSharePayload,
): ClassGapSharePayload {
  const base = isPayload(input) ? input : toClassGapPayload(input);
  return {
    ...base,
    missedWords: normalizeMissedWords(base.missedWords),
  };
}

function applyParams(url: URL, payload: ClassGapSharePayload): void {
  if (payload.lesson) url.searchParams.set('lesson', payload.lesson);
  if (payload.teacher) url.searchParams.set('teacher', payload.teacher);
  url.searchParams.set('found', String(payload.found));
  url.searchParams.set('total', String(payload.total));
  if (payload.missedWords.length > 0) {
    url.searchParams.set('missed', payload.missedWords.join(','));
  }
  url.searchParams.set('lang', payload.locale);
}

/** Absolute share URL on lexiclash.live (parents / Slack / GC comments). */
export function buildMissGapPracticeShareUrl(
  input: ClassGapShareInput | ClassGapSharePayload,
): string {
  const payload = toPayload(input);
  const url = new URL(`/${payload.locale}${MISS_GAP_PRACTICE_PATH}`, CLASS_GAP_ORIGIN);
  applyParams(url, payload);
  return url.toString();
}

/** Relative in-app path for Link hrefs. */
export function buildMissGapPracticePath(
  input: ClassGapShareInput | ClassGapSharePayload,
): string {
  const payload = toPayload(input);
  const url = new URL(`/${payload.locale}${MISS_GAP_PRACTICE_PATH}`, 'https://local.invalid');
  applyParams(url, payload);
  return `${url.pathname}${url.search}`;
}

/** OG unfurl image for the practice card. */
export function buildMissGapPracticeOgImageUrl(
  input: ClassGapShareInput | ClassGapSharePayload,
): string {
  const payload = toPayload(input);
  const url = new URL('/api/og/miss-gap-practice', CLASS_GAP_ORIGIN);
  applyParams(url, payload);
  return url.toString();
}

export function missGapPracticeLocalePath(locale: string): string {
  return `/${normalizeLocale(locale)}${MISS_GAP_PRACTICE_PATH}`;
}
