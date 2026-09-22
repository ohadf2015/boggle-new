/**
 * Miss-gap → Unplugged / reteach Live deep-link contract.
 *
 * After #1120 (teacher assignment progress report): from the miss-gap teacher
 * progress UI or the last-lesson digest chips, deep-link into Unplugged reteach
 * Live (Kahoot Unplugged foil — teacher projects; students write on paper, no
 * devices) or seed a 3-min reteach Live. Extends #959 / #1120.
 *
 * Class-level missed words only — never student names. Pure — no DOM.
 */

import {
  buildClassGapReteachLiveData,
  classGapReteachLivePath,
  toClassGapPayload,
  type ClassGapReteachLiveData,
  type ClassGapShareInput,
  type ClassGapSharePayload,
} from './classGapShare';
import { buildClassicUnpluggedPath } from './classicUnplugged';
import { buildUnpluggedReteachPath } from './unpluggedReteachLive';

export interface MissGapUnpluggedReteachDeeplinkInput {
  locale: string;
  missedWords: string[];
  /** Lesson title for the Live seed / Unplugged chrome. */
  lesson?: string;
  teacher?: string;
  found?: number;
  total?: number;
}

export interface MissGapUnpluggedReteachDeeplink {
  /** `/{locale}/education/unplugged-reteach?...` — primary Kahoot Unplugged foil. */
  unpluggedPath: string;
  /** `/{locale}/education/classic-unplugged?...` — Classic:Unplugged foil. */
  classicUnpluggedPath: string;
  /** Multiplayer path for 3-min reteach Live (needs {@link reteachLiveData} seed). */
  reteachLivePath: string;
  /** Normalized class-gap payload (no student names). */
  payload: ClassGapSharePayload;
  /** Null when there are no missed words — do not seed Live. */
  reteachLiveData: ClassGapReteachLiveData | null;
}

function isSharePayload(value: unknown): value is ClassGapSharePayload {
  return (
    typeof value === 'object' &&
    value !== null &&
    'lesson' in value &&
    typeof (value as ClassGapSharePayload).lesson === 'string' &&
    Array.isArray((value as ClassGapSharePayload).missedWords) &&
    !('lessonNames' in value)
  );
}

function isShareInput(value: unknown): value is ClassGapShareInput {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray((value as ClassGapShareInput).lessonNames) &&
    Array.isArray((value as ClassGapShareInput).missedWords)
  );
}

function fromSimple(input: MissGapUnpluggedReteachDeeplinkInput): ClassGapShareInput {
  const missed = Array.isArray(input.missedWords) ? input.missedWords : [];
  const total =
    input.total != null && Number.isFinite(input.total)
      ? Math.max(0, Math.floor(input.total))
      : missed.length;
  const found =
    input.found != null && Number.isFinite(input.found)
      ? Math.max(0, Math.floor(input.found))
      : Math.max(0, total - missed.length);

  return {
    locale: input.locale,
    lessonNames: input.lesson ? [input.lesson] : [],
    teacherName: input.teacher ?? '',
    found,
    total,
    missedWords: missed,
  };
}

/**
 * Build the Unplugged + reteach Live deep-link contract from miss-gap words.
 * Returns null when there are no missed words (nothing to reteach).
 */
export function buildMissGapUnpluggedReteachDeeplink(
  input:
    | MissGapUnpluggedReteachDeeplinkInput
    | ClassGapShareInput
    | ClassGapSharePayload,
): MissGapUnpluggedReteachDeeplink | null {
  let payload: ClassGapSharePayload;
  if (isSharePayload(input)) {
    payload = input;
  } else if (isShareInput(input)) {
    payload = toClassGapPayload(input);
  } else {
    payload = toClassGapPayload(fromSimple(input));
  }

  if (payload.missedWords.length === 0) return null;

  return {
    unpluggedPath: buildUnpluggedReteachPath(payload),
    classicUnpluggedPath: buildClassicUnpluggedPath(payload),
    reteachLivePath: classGapReteachLivePath(payload.locale),
    payload,
    reteachLiveData: buildClassGapReteachLiveData(payload),
  };
}

/** True when a path matches the Unplugged reteach Live deep-link contract. */
export function isUnpluggedReteachLiveDeeplinkPath(path: string): boolean {
  if (typeof path !== 'string' || !path.startsWith('/')) return false;
  try {
    const url = new URL(path, 'https://local.invalid');
    if (!/^\/[a-z]{2}\/education\/unplugged-reteach$/.test(url.pathname)) return false;
    const missed = url.searchParams.get('missed');
    return Boolean(missed && missed.split(',').some((w) => w.trim().length > 0));
  } catch {
    return false;
  }
}
