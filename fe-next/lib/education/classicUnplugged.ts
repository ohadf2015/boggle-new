/**
 * Classic Unplugged — teacher-screen miss-gap Live (class or teams submit).
 *
 * NOT a multiplayer room. Shared projector; class/teams discuss; teacher
 * submits consensus. Foils Kahoot Classic:Unplugged (asymmetry left after
 * #1047 Team Tiles). Reuses class-gap payload (#899) and Unplugged finish +
 * #1045 grade passback (cleared/total).
 */

import {
  CLASS_GAP_ORIGIN,
  normalizeLocale,
  toClassGapPayload,
  type ClassGapShareInput,
  type ClassGapSharePayload,
} from './classGapShare';

export type ClassicUnpluggedPayload = ClassGapSharePayload;

export const CLASSIC_UNPLUGGED_PATH = '/education/classic-unplugged';

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

/** Absolute URL (share/export). Prefer {@link buildClassicUnpluggedPath}. */
export function buildClassicUnpluggedUrl(
  input: ClassGapShareInput | ClassGapSharePayload,
): string {
  const payload = isPayload(input) ? input : toClassGapPayload(input);
  const url = new URL(
    `/${payload.locale}${CLASSIC_UNPLUGGED_PATH}`,
    CLASS_GAP_ORIGIN,
  );
  applyParams(url, payload);
  return url.toString();
}

/**
 * Relative in-app path: `/{locale}/education/classic-unplugged?...`
 * Accepts ClassGapShareInput or an already-normalized ClassGapSharePayload.
 */
export function buildClassicUnpluggedPath(
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
  const url = new URL(
    `/${payload.locale}${CLASSIC_UNPLUGGED_PATH}`,
    'https://local.invalid',
  );
  applyParams(url, payload);
  return `${url.pathname}${url.search}`;
}
