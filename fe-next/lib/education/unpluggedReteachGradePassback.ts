/**
 * Google Classroom grade passback for Unplugged reteach Live completion
 * (+ miss-gap follow-through).
 *
 * Kahoot Classroom add-on foil: after a live kahoot, scores sync to the
 * Classroom gradebook. LexiClash does the same when the teacher finishes an
 * Unplugged reteach Live (device-free) — class-level cleared/total score, no
 * roster OAuth / student names. Complements #977 miss-gap homework passback.
 *
 * Phase-1 ship (mirrors #970 / #977):
 * - Pure builders for AddOnAttachment (`maxPoints`) + studentSubmission patch
 *   (`pointsEarned`, `postState=TURNED_IN`) ready for
 *   `courses.courseWork.addOnAttachments.studentSubmissions.patch` when
 *   `classroom.addons.teacher` is enabled.
 * - Teacher finish CTA on Unplugged Live → grade receipt deep-link.
 * - No `classroom.rosters.readonly`. Class-level missed words only.
 */

import { rejectStudentNames } from './chatgptReteach';
import {
  CLASS_GAP_ORIGIN,
  normalizeLocale,
  toClassGapPayload,
  type ClassGapShareInput,
  type ClassGapSharePayload,
} from './classGapShare';
import type { ClassroomAddonContextQuery } from './googleClassroomAddon';
import { buildUnpluggedReteachUrl } from './unpluggedReteachLive';
import {
  isDueDateOnOrAfter,
  normalizeDueDate,
  todayUtcDate,
} from './missGapAsyncAssignment';

/** Same Classroom iframe ancestors as #970 / #977 addon routes. */
const GRADE_PASSBACK_FRAME_ANCESTORS = [
  "'self'",
  'https://classroom.google.com',
  'https://*.classroom.google.com',
] as const;

export const UNPLUGGED_GRADE_PASSBACK_PATH = '/education/unplugged-grade-passback';
export const UNPLUGGED_GRADE_PASSBACK_API_PATH =
  '/api/classroom-addon/unplugged-grade-passback';

/** Fixed denominator for Unplugged Live completion grade. */
export const UNPLUGGED_MAX_POINTS = 100;

/** Late submit still grades — reduced so teachers see lateness in the draft. */
export const UNPLUGGED_LATE_POINTS_FACTOR = 0.7;

export type UnpluggedPostState = 'NEW' | 'TURNED_IN' | 'RETURNED';

export interface UnpluggedGradeScore {
  maxPoints: number;
  pointsEarned: number;
  onTime: boolean;
  completedOn: string;
  dueDate: string;
  postState: UnpluggedPostState;
  cleared: number;
  total: number;
  accuracy: number;
}

export interface UnpluggedGradeAttachment {
  title: string;
  teacherViewUri: string;
  studentViewUri: string;
  maxPoints: number;
}

export interface UnpluggedStudentSubmissionPatch {
  body: {
    pointsEarned: number;
    postState: UnpluggedPostState;
  };
  updateMask: string;
  patchPathTemplate: string;
}

export interface UnpluggedGradePassbackResult {
  ok: true;
  unpluggedLiveUrl: string;
  gradeReceiptUrl: string;
  score: UnpluggedGradeScore;
  attachment: UnpluggedGradeAttachment;
  studentSubmission: UnpluggedStudentSubmissionPatch;
  student_names: false;
  roster_scopes: false;
  oauth_required_for_grade_sync: true;
  foils: string[];
  instructions: string;
}

export interface UnpluggedGradePassbackFailure {
  ok: false;
  error: string;
}

export type UnpluggedGradePassbackResponse =
  | UnpluggedGradePassbackResult
  | UnpluggedGradePassbackFailure;

function localeOf(raw?: string | null): string {
  return normalizeLocale(raw || 'en');
}

/**
 * Completion grade for Unplugged reteach Live.
 * Accuracy = cleared/total → points. On-time → full; late → 70% of accuracy points.
 */
export function scoreUnpluggedReteach(args: {
  cleared: number;
  total: number;
  dueDate?: string;
  completedOn?: string;
  completed?: boolean;
  maxPoints?: number;
}): UnpluggedGradeScore {
  const total = Math.max(0, Math.round(args.total));
  const cleared = Math.max(0, Math.min(total, Math.round(args.cleared)));
  const maxPoints =
    typeof args.maxPoints === 'number' && args.maxPoints > 0
      ? Math.min(1000, Math.round(args.maxPoints))
      : UNPLUGGED_MAX_POINTS;
  const dueDate = normalizeDueDate(args.dueDate || todayUtcDate());
  const completedOn = normalizeDueDate(args.completedOn || todayUtcDate());
  const completed = args.completed !== false;
  const accuracy = total > 0 ? Math.round((cleared / total) * 100) : 0;

  if (!dueDate || !completedOn || !completed || total === 0) {
    return {
      maxPoints,
      pointsEarned: 0,
      onTime: false,
      completedOn: completedOn || '',
      dueDate: dueDate || '',
      postState: 'NEW',
      cleared,
      total,
      accuracy,
    };
  }

  const onTime = isDueDateOnOrAfter(dueDate, completedOn);
  const base = Math.round((accuracy / 100) * maxPoints);
  const pointsEarned = onTime
    ? base
    : Math.round(base * UNPLUGGED_LATE_POINTS_FACTOR);

  return {
    maxPoints,
    pointsEarned,
    onTime,
    completedOn,
    dueDate,
    postState: 'TURNED_IN',
    cleared,
    total,
    accuracy,
  };
}

function applyUnpluggedParams(
  url: URL,
  payload: ClassGapSharePayload,
  score?: UnpluggedGradeScore,
  dueDate?: string,
): void {
  if (payload.lesson) url.searchParams.set('lesson', payload.lesson);
  if (payload.teacher) url.searchParams.set('teacher', payload.teacher);
  url.searchParams.set('found', String(payload.found));
  url.searchParams.set('total', String(payload.total));
  if (payload.missedWords.length > 0) {
    url.searchParams.set('missed', payload.missedWords.join(','));
  }
  url.searchParams.set('lang', payload.locale);
  const due = dueDate || score?.dueDate;
  if (due) url.searchParams.set('due', due);
  if (score) {
    url.searchParams.set('points', String(score.pointsEarned));
    url.searchParams.set('max', String(score.maxPoints));
    url.searchParams.set('onTime', score.onTime ? '1' : '0');
    url.searchParams.set('completed', score.completedOn);
    url.searchParams.set('postState', score.postState);
    url.searchParams.set('cleared', String(score.cleared));
    url.searchParams.set('words', String(score.total));
    url.searchParams.set('accuracy', String(score.accuracy));
  }
}

/** Absolute grade-receipt / student attachment view URI (lexiclash.live). */
export function buildUnpluggedGradePassbackShareUrl(args: {
  input: ClassGapShareInput | ClassGapSharePayload;
  score?: UnpluggedGradeScore;
  dueDate?: string;
  context?: ClassroomAddonContextQuery;
}): string {
  const payload = isPayload(args.input) ? args.input : toClassGapPayload(args.input);
  const locale = localeOf(payload.locale);
  const url = new URL(`/${locale}${UNPLUGGED_GRADE_PASSBACK_PATH}`, CLASS_GAP_ORIGIN);
  applyUnpluggedParams(url, payload, args.score, args.dueDate);
  const ctx = args.context;
  if (ctx?.courseId) url.searchParams.set('courseId', String(ctx.courseId));
  if (ctx?.itemId) url.searchParams.set('itemId', String(ctx.itemId));
  if (ctx?.itemType) url.searchParams.set('itemType', String(ctx.itemType));
  if (ctx?.addOnToken) url.searchParams.set('addOnToken', String(ctx.addOnToken));
  if (ctx?.attachmentId) url.searchParams.set('attachmentId', String(ctx.attachmentId));
  if (ctx?.login_hint) url.searchParams.set('login_hint', String(ctx.login_hint));
  return url.toString();
}

/** Relative in-app path for Link hrefs. */
export function buildUnpluggedGradePassbackPath(args: {
  input: ClassGapShareInput | ClassGapSharePayload;
  score?: UnpluggedGradeScore;
  dueDate?: string;
}): string {
  const abs = buildUnpluggedGradePassbackShareUrl(args);
  const u = new URL(abs);
  return `${u.pathname}${u.search}`;
}

export function buildUnpluggedGradeAttachment(args: {
  input: ClassGapShareInput | ClassGapSharePayload;
  title?: string;
  maxPoints?: number;
  dueDate?: string;
}): UnpluggedGradeAttachment {
  const payload = isPayload(args.input) ? args.input : toClassGapPayload(args.input);
  if (payload.missedWords.length === 0) {
    throw new Error('buildUnpluggedGradeAttachment: at least one missed word required');
  }
  const maxPoints =
    typeof args.maxPoints === 'number' && args.maxPoints > 0
      ? Math.min(1000, Math.round(args.maxPoints))
      : UNPLUGGED_MAX_POINTS;
  const viewUri = buildUnpluggedGradePassbackShareUrl({
    input: payload,
    dueDate: args.dueDate,
  });
  const lesson = payload.lesson || 'class';
  return {
    title: args.title?.trim() || `Unplugged reteach — ${lesson}`,
    teacherViewUri: viewUri,
    studentViewUri: viewUri,
    maxPoints,
  };
}

export function buildUnpluggedStudentSubmissionPatch(
  score: UnpluggedGradeScore,
): UnpluggedStudentSubmissionPatch {
  return {
    body: {
      pointsEarned: score.pointsEarned,
      postState: score.postState,
    },
    updateMask: 'pointsEarned,postState',
    patchPathTemplate:
      'https://classroom.googleapis.com/v1/courses/{courseId}/courseWork/{itemId}/addOnAttachments/{attachmentId}/studentSubmissions/{submissionId}',
  };
}

/**
 * One-shot grade passback payload when Unplugged reteach Live finishes.
 * Pure: no network. Ready for Marketplace create + patch when addons.teacher lands.
 */
export function buildUnpluggedGradePassback(body: unknown): UnpluggedGradePassbackResponse {
  const nameErr = rejectStudentNames(body);
  if (nameErr) return { ok: false, error: nameErr };

  const raw = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  const missed =
    raw.missed_words ?? raw.missedWords ?? raw.words ?? raw.missed ?? [];
  const missedWords = Array.isArray(missed)
    ? missed.map((w) => String(w ?? '').trim()).filter(Boolean)
    : typeof missed === 'string'
      ? missed.split(/[,;\n]+/).map((w) => w.trim()).filter(Boolean)
      : [];

  if (missedWords.length === 0) {
    return { ok: false, error: 'Provide at least one missed word (no student names).' };
  }

  const totalRaw =
    typeof raw.total === 'number'
      ? raw.total
      : typeof raw.words === 'number'
        ? raw.words
        : missedWords.length;
  const clearedRaw =
    typeof raw.cleared === 'number'
      ? raw.cleared
      : typeof raw.found === 'number'
        ? raw.found
        : totalRaw;

  const dueDate = normalizeDueDate(
    typeof raw.due === 'string'
      ? raw.due
      : typeof raw.dueDate === 'string'
        ? raw.dueDate
        : todayUtcDate(),
  );

  const completed =
    raw.completed === false || raw.completed === 'false' || raw.completed === 0
      ? false
      : true;
  const completedOn =
    typeof raw.completedOn === 'string'
      ? raw.completedOn
      : typeof raw.completed === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.completed)
        ? raw.completed
        : todayUtcDate();

  const input: ClassGapShareInput = {
    locale: typeof raw.locale === 'string' ? raw.locale : 'en',
    lessonNames:
      typeof raw.lesson === 'string' && raw.lesson.trim()
        ? [raw.lesson.trim()]
        : ['Unplugged reteach'],
    teacherName: typeof raw.teacher === 'string' ? raw.teacher : '',
    found: typeof raw.found === 'number' ? raw.found : Math.max(0, totalRaw - missedWords.length),
    total: typeof raw.sessionTotal === 'number' ? raw.sessionTotal : totalRaw,
    missedWords,
  };

  const payload = toClassGapPayload(input);
  const score = scoreUnpluggedReteach({
    cleared: clearedRaw,
    total: totalRaw,
    dueDate,
    completedOn,
    completed,
    maxPoints:
      typeof raw.maxPoints === 'number'
        ? raw.maxPoints
        : typeof raw.max === 'number'
          ? raw.max
          : undefined,
  });

  if (typeof raw.points === 'number' && raw.points >= 0) {
    score.pointsEarned = Math.min(score.maxPoints, Math.round(raw.points));
  }

  const title =
    typeof raw.title === 'string' && raw.title.trim() ? raw.title.trim() : undefined;

  let attachment: UnpluggedGradeAttachment;
  try {
    attachment = buildUnpluggedGradeAttachment({
      input: payload,
      title,
      maxPoints: score.maxPoints,
      dueDate,
    });
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Failed to build grade attachment',
    };
  }

  const gradeReceiptUrl = buildUnpluggedGradePassbackShareUrl({
    input: payload,
    score,
    dueDate,
  });
  attachment = {
    ...attachment,
    studentViewUri: gradeReceiptUrl,
    teacherViewUri: gradeReceiptUrl,
  };

  const unpluggedLiveUrl = buildUnpluggedReteachUrl(payload);
  const studentSubmission = buildUnpluggedStudentSubmissionPatch(score);

  return {
    ok: true,
    unpluggedLiveUrl,
    gradeReceiptUrl,
    score,
    attachment,
    studentSubmission,
    student_names: false,
    roster_scopes: false,
    oauth_required_for_grade_sync: true,
    foils: ['Kahoot Classroom add-on grade passback', 'Kahoot Marketplace grade passback'],
    instructions:
      'On Unplugged Live finish, show gradeReceiptUrl to the teacher. attachment.maxPoints enables Classroom Grade sync; studentSubmission is the body+updateMask for studentSubmissions.patch when classroom.addons.teacher is enabled. Class-level cleared/total only — never student names. Complements #977 miss-gap homework passback.',
  };
}

export function unpluggedGradePassbackMarketplaceSlice(): Record<string, unknown> {
  return {
    name: 'LexiClash Unplugged reteach grade passback',
    foils: ['Kahoot Classroom add-on grade passback', 'Kahoot Marketplace grade passback'],
    extends: ['#970', '#977', '#980', '#981'],
    maxPoints: UNPLUGGED_MAX_POINTS,
    lateFactor: UNPLUGGED_LATE_POINTS_FACTOR,
    student_names: false,
    roster_scopes: false,
    oauth_required_for_grade_sync: true,
    api: `${CLASS_GAP_ORIGIN}${UNPLUGGED_GRADE_PASSBACK_API_PATH}`,
    studentViewUriTemplate: `${CLASS_GAP_ORIGIN}/{locale}${UNPLUGGED_GRADE_PASSBACK_PATH}`,
    frame_ancestors: [...GRADE_PASSBACK_FRAME_ANCESTORS],
    notes:
      'Class completion grade for Unplugged reteach Live (cleared/total). Patch path deferred until classroom.addons.teacher; receipt + attachment shape ship today. Miss-gap homework passback remains at /api/classroom-addon/grade-passback.',
  };
}

export function unpluggedGradePassbackCorsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    'Cache-Control': 'no-store',
  };
}

export function unpluggedGradePassbackContentSecurityPolicy(): string {
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://*.supabase.co https://*.posthog.com https://eu.i.posthog.com",
    "frame-src 'self' https://classroom.google.com",
    `frame-ancestors ${GRADE_PASSBACK_FRAME_ANCESTORS.join(' ')}`,
  ].join('; ');
}

function isPayload(
  value: ClassGapShareInput | ClassGapSharePayload,
): value is ClassGapSharePayload {
  return (
    typeof value === 'object' &&
    value !== null &&
    'lesson' in value &&
    'missedWords' in value &&
    'locale' in value
  );
}
