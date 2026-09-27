/**
 * Unplugged reteach Live — teacher-screen-only projector from last-session misses.
 *
 * NOT a multiplayer room. Teacher projects one missed word at a time; students
 * answer on the #957 printable practice sheet (no student devices). Foils Kahoot
 * Classic Unplugged / Team Tiles. Reuses class-gap payload shape (#899).
 */

import {
  CLASS_GAP_ORIGIN,
  normalizeLocale,
  toClassGapPayload,
  type ClassGapShareInput,
  type ClassGapSharePayload,
} from './classGapShare';

export type UnpluggedReteachPayload = ClassGapSharePayload;

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

/**
 * Absolute URL (rare — share/export). Prefer {@link buildUnpluggedReteachPath}
 * for in-app navigation.
 */
export function buildUnpluggedReteachUrl(
  input: ClassGapShareInput | ClassGapSharePayload,
): string {
  const payload = isPayload(input) ? input : toClassGapPayload(input);
  const url = new URL(`/${payload.locale}/education/unplugged-reteach`, CLASS_GAP_ORIGIN);
  applyParams(url, payload);
  return url.toString();
}

/**
 * Relative in-app path: `/{locale}/education/unplugged-reteach?...`
 * Accepts ClassGapShareInput or an already-normalized ClassGapSharePayload.
 */
export function buildUnpluggedReteachPath(
  input: ClassGapShareInput | ClassGapSharePayload | string,
  maybePayload?: ClassGapShareInput | ClassGapSharePayload,
): string {
  let payload: ClassGapSharePayload;
  if (typeof input === 'string') {
    const base = maybePayload
      ? isPayload(maybePayload)
        ? maybePayload
        : toClassGapPayload(maybePayload)
      : toClassGapPayload({
          locale: input,
          lessonNames: [],
          teacherName: '',
          found: 0,
          total: 0,
          missedWords: [],
        });
    payload = { ...base, locale: normalizeLocale(input) };
  } else {
    payload = isPayload(input) ? input : toClassGapPayload(input);
  }
  const url = new URL(`/${payload.locale}/education/unplugged-reteach`, 'https://local.invalid');
  applyParams(url, payload);
  return `${url.pathname}${url.search}`;
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
