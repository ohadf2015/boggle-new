/**
 * The one spelling of a miss-gap class key.
 *
 * A homework link carries no classroom id — the key IS `lesson::teacher`, built
 * on the client by `buildMissGapClassKey`. Two API routes then write it and read
 * it back, and for a while they disagreed: `complete` collapsed internal
 * whitespace, `progress` only trimmed. A lesson called "Week  3" was written
 * under `week 3::…` and queried under `week  3::…`, so the teacher's card said
 * "nobody has played yet" while the class was finishing it.
 *
 * That is pitfalls Class 3 exactly — two routes to the same value, quietly
 * drifting. One function, both callers, no second spelling.
 */

const CONTROL_CHARS = /[\u0000-\u001f\u007f]/g;

/** Longest key we store; the column is text but an unbounded key is a foot-gun. */
export const MAX_CLASS_KEY = 200;

/** Upper bound on a signed class token (`k`); a v1 token for a 200-char key is ~330 chars. */
export const MAX_CLASS_TOKEN = 512;

/** Distinct students one homework (class key + due date) accepts; the roster read returns this many. */
export const MAX_STUDENTS_PER_ASSIGNMENT = 60;

export function normalizeMissGapClassKey(raw: unknown): string {
  return String(raw ?? '')
    .replace(CONTROL_CHARS, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_CLASS_KEY)
    .toLowerCase();
}
