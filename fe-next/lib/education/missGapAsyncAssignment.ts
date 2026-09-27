/**
 * Kahootopia Assignments foil — async due-date miss-gap homework.
 *
 * #972 shipped the shareable miss-gap practice card (take-home PDF). This layer
 * turns that card into **async homework**: teacher sets a due date, students
 * practise on their own (NOT a live Unplugged session), and on-time completion
 * feeds the class streak (`classStreak.ts`).
 *
 * Foil: Kahootopia Assignments are live-game homework. LexiClash assigns the
 * miss-gap practice card with a due date — async, device-light, class streak.
 *
 * Class-level missed words only — never student names. Reuses #972 payload +
 * Google Classroom Phase-1 share (itemtype=assignment → due date in Google's dialog).
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
import { buildGoogleClassroomShareUrl } from './googleClassroomShare';
import {
  encodeMissGapDefinitions,
  parseMissGapDefinitions,
} from './missGapDefinitions';
import { buildMissGapPracticeShareUrl } from './missGapPracticeShare';

export const MISS_GAP_ASSIGNMENT_PATH = '/education/miss-gap-assignment';

/** Default homework window: 3 calendar days from today (UTC date). */
export const DEFAULT_DUE_OFFSET_DAYS = 3;

export interface MissGapAssignmentInput extends ClassGapShareInput {
  /** ISO date YYYY-MM-DD. Empty/absent → teacher still picking. */
  dueDate?: string | null;
  /**
   * word → meaning, when the lesson had them. This is what upgrades the
   * homework from "which spelling is right" to "what does it mean" — see
   * `missGapDefinitions.ts` for the wire format.
   */
  definitions?: Record<string, string> | null;
}

export interface MissGapAssignmentPayload extends ClassGapSharePayload {
  /** Normalized YYYY-MM-DD or empty string when unset. */
  dueDate: string;
  /** Cleaned word→meaning map, lower-cased keys. `{}` when the lesson had none. */
  definitions: Record<string, string>;
}

function sanitizeText(value: string, max: number): string {
  return value
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

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

/** Accept only calendar dates YYYY-MM-DD. Rejects garbage / time strings. */
export function normalizeDueDate(raw: string | null | undefined): string {
  const value = String(raw || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return '';
  const [y, m, d] = value.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() !== m - 1 ||
    dt.getUTCDate() !== d
  ) {
    return '';
  }
  return value;
}

export function todayUtcDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function defaultMissGapDueDate(from: Date = new Date()): string {
  const d = new Date(
    Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()),
  );
  d.setUTCDate(d.getUTCDate() + DEFAULT_DUE_OFFSET_DAYS);
  return d.toISOString().slice(0, 10);
}

export function isDueDateOnOrAfter(dueDate: string, day: string): boolean {
  const due = normalizeDueDate(dueDate);
  const when = normalizeDueDate(day);
  if (!due || !when) return false;
  return when <= due;
}

function isPayload(
  value: MissGapAssignmentInput | MissGapAssignmentPayload | ClassGapSharePayload,
): value is MissGapAssignmentPayload | ClassGapSharePayload {
  return (
    typeof value === 'object' &&
    value !== null &&
    'lesson' in value &&
    typeof (value as ClassGapSharePayload).lesson === 'string' &&
    Array.isArray((value as ClassGapSharePayload).missedWords) &&
    !('lessonNames' in value)
  );
}

export function toMissGapAssignmentPayload(
  input: MissGapAssignmentInput | MissGapAssignmentPayload | ClassGapSharePayload,
): MissGapAssignmentPayload {
  const base = isPayload(input)
    ? {
        ...input,
        missedWords: normalizeMissedWords(input.missedWords),
      }
    : {
        ...toClassGapPayload(input),
        missedWords: normalizeMissedWords(
          toClassGapPayload(input).missedWords,
        ),
      };
  const dueDate = normalizeDueDate(
    'dueDate' in input ? (input as MissGapAssignmentInput).dueDate : '',
  );
  // Round-tripping through the wire format is the cheapest way to apply the
  // same cleaning, casing and caps the share link applies.
  const definitions = parseMissGapDefinitions(
    encodeMissGapDefinitions(
      'definitions' in input
        ? ((input as MissGapAssignmentInput).definitions ?? null)
        : null,
      base.missedWords,
    ),
  );
  return { ...base, dueDate, definitions };
}

function applyParams(url: URL, payload: MissGapAssignmentPayload): void {
  if (payload.lesson) url.searchParams.set('lesson', payload.lesson);
  if (payload.teacher) url.searchParams.set('teacher', payload.teacher);
  url.searchParams.set('found', String(payload.found));
  url.searchParams.set('total', String(payload.total));
  if (payload.missedWords.length > 0) {
    url.searchParams.set('missed', payload.missedWords.join(','));
  }
  url.searchParams.set('lang', payload.locale);
  if (payload.dueDate) url.searchParams.set('due', payload.dueDate);
  const defs = encodeMissGapDefinitions(payload.definitions, payload.missedWords);
  if (defs) url.searchParams.set('defs', defs);
}

/**
 * Absolute homework URL on lexiclash.live (parents / GC / Slack).
 *
 * Carries `role=student` so the link can never be mistaken for the teacher's
 * compose entry — see `missGapEntry.ts`. Without it, a share link that lost
 * its `due=` param on the way through a chat app opened the due-date picker
 * instead of the game.
 */
export function buildMissGapAssignmentShareUrl(
  input: MissGapAssignmentInput | MissGapAssignmentPayload | ClassGapSharePayload,
): string {
  const payload = toMissGapAssignmentPayload(input);
  const url = new URL(
    `/${payload.locale}${MISS_GAP_ASSIGNMENT_PATH}`,
    CLASS_GAP_ORIGIN,
  );
  applyParams(url, payload);
  url.searchParams.set('role', 'student');
  return url.toString();
}

/** Relative in-app path for Link hrefs. */
export function buildMissGapAssignmentPath(
  input: MissGapAssignmentInput | MissGapAssignmentPayload | ClassGapSharePayload,
): string {
  const payload = toMissGapAssignmentPayload(input);
  const url = new URL(
    `/${payload.locale}${MISS_GAP_ASSIGNMENT_PATH}`,
    'https://local.invalid',
  );
  applyParams(url, payload);
  return `${url.pathname}${url.search}`;
}

/**
 * Google Classroom Stream assign — points at the **async** miss-gap homework URL
 * (practice card + due), NOT Unplugged Live. itemtype=assignment so Google prompts
 * for a due date; our `due` query param mirrors what the teacher picked in-app.
 */
export function buildMissGapAssignmentGoogleClassroomUrl(args: {
  input: MissGapAssignmentInput | MissGapAssignmentPayload | ClassGapSharePayload;
  title: string;
  body: string;
}): string {
  const homeworkUrl = buildMissGapAssignmentShareUrl(args.input);
  return buildGoogleClassroomShareUrl({
    joinUrl: homeworkUrl,
    title: args.title,
    body: args.body,
    itemType: 'assignment',
  });
}

/** Practice-card URL students open from the assignment (reuse #972 surface). */
export function buildMissGapAssignmentPracticeUrl(
  input: MissGapAssignmentInput | MissGapAssignmentPayload | ClassGapSharePayload,
): string {
  const payload = toMissGapAssignmentPayload(input);
  return buildMissGapPracticeShareUrl(payload);
}

export function missGapAssignmentLocalePath(locale: string): string {
  return `/${normalizeLocale(locale)}${MISS_GAP_ASSIGNMENT_PATH}`;
}

/** Stable class key for streak storage — lesson+teacher, no student PII. */
export function buildMissGapClassKey(payload: {
  lesson?: string;
  teacher?: string;
}): string {
  const lesson = sanitizeText(payload.lesson || '', 80).toLowerCase() || 'lesson';
  const teacher = sanitizeText(payload.teacher || '', 40).toLowerCase() || 'class';
  return `${lesson}::${teacher}`;
}
