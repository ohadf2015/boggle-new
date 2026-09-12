/**
 * Google Classroom grade passback for #975 async miss-gap homework.
 *
 * Kahoot Marketplace foil: after students finish an assigned kahoot, scores
 * sync to the Classroom gradebook. LexiClash does the same for async miss-gap
 * practice — without roster OAuth / student names.
 *
 * Phase-1 ship (mirrors #970 Marketplace Discovery):
 * - Pure builders for AddOnAttachment (`maxPoints`) + studentSubmission patch
 *   (`pointsEarned`, `postState=TURNED_IN`) ready for
 *   `courses.courseWork.addOnAttachments.studentSubmissions.patch` when
 *   `classroom.addons.teacher` is enabled.
 * - Student completion on #975 wires a grade receipt + turn-in deep-link.
 * - No `classroom.rosters.readonly`. Class-level missed words only.
 */

import { rejectStudentNames } from './chatgptReteach';
import { CLASS_GAP_ORIGIN } from './classGapShare';
import type { ClassroomAddonContextQuery } from './googleClassroomAddon';

/** Same Classroom iframe ancestors as #970 addon routes. */
const GRADE_PASSBACK_FRAME_ANCESTORS = [
  "'self'",
  'https://classroom.google.com',
  'https://*.classroom.google.com',
] as const;
import {
  buildMissGapAssignmentShareUrl,
  isDueDateOnOrAfter,
  normalizeDueDate,
  toMissGapAssignmentPayload,
  todayUtcDate,
  type MissGapAssignmentInput,
  type MissGapAssignmentPayload,
} from './missGapAsyncAssignment';

export const MISS_GAP_GRADE_PASSBACK_PATH = '/education/miss-gap-grade-passback';
export const MISS_GAP_GRADE_PASSBACK_API_PATH = '/api/classroom-addon/grade-passback';

/** Fixed denominator for miss-gap homework (completion grade, not quiz accuracy). */
export const MISS_GAP_MAX_POINTS = 100;

/** Late turn-in still grades — reduced so teachers see lateness in the draft grade. */
export const MISS_GAP_LATE_POINTS = 70;

export type MissGapPostState = 'NEW' | 'TURNED_IN' | 'RETURNED';

export interface MissGapGradeScore {
  maxPoints: number;
  pointsEarned: number;
  onTime: boolean;
  completedOn: string;
  dueDate: string;
  postState: MissGapPostState;
}

export interface MissGapGradeAttachment {
  title: string;
  teacherViewUri: string;
  studentViewUri: string;
  maxPoints: number;
}

export interface MissGapStudentSubmissionPatch {
  /** Body for studentSubmissions.patch */
  body: {
    pointsEarned: number;
    postState: MissGapPostState;
  };
  /** FieldMask Google expects on the PATCH */
  updateMask: string;
  /**
   * Template path (course/item/attachment/submission IDs filled by Classroom
   * when `classroom.addons.teacher` is wired). Not called today.
   */
  patchPathTemplate: string;
}

export interface MissGapGradePassbackResult {
  ok: true;
  homeworkUrl: string;
  gradeReceiptUrl: string;
  score: MissGapGradeScore;
  attachment: MissGapGradeAttachment;
  studentSubmission: MissGapStudentSubmissionPatch;
  student_names: false;
  roster_scopes: false;
  oauth_required_for_grade_sync: true;
  foils: string[];
  instructions: string;
}

export interface MissGapGradePassbackFailure {
  ok: false;
  error: string;
}

export type MissGapGradePassbackResponse =
  | MissGapGradePassbackResult
  | MissGapGradePassbackFailure;

function normalizeLocale(raw?: string | null): string {
  const base = (raw || 'en').toLowerCase().split('-')[0];
  return ['en', 'he', 'sv', 'ja', 'es', 'ru'].includes(base) ? base : 'en';
}

/** On-time completions feed both class streak and full points. */
export function contributesToOnTimeGrade(
  dueDate: string,
  completedOn: string = todayUtcDate(),
): boolean {
  return isDueDateOnOrAfter(dueDate, completedOn);
}

/**
 * Completion grade for miss-gap homework.
 * On-time → 100/100; late → 70/100; incomplete → 0 (caller should not pass).
 */
export function scoreMissGapHomework(args: {
  dueDate: string;
  completedOn?: string;
  completed?: boolean;
  maxPoints?: number;
  /**
   * 0-100 from the run the student actually played. Omitted → the old
   * completion-only grade (nothing else knows an accuracy).
   */
  accuracy?: number;
}): MissGapGradeScore {
  const dueDate = normalizeDueDate(args.dueDate);
  const completedOn = normalizeDueDate(args.completedOn || todayUtcDate());
  const maxPoints =
    typeof args.maxPoints === 'number' && args.maxPoints > 0
      ? Math.min(1000, Math.round(args.maxPoints))
      : MISS_GAP_MAX_POINTS;
  const completed = args.completed !== false;

  if (!dueDate || !completedOn || !completed) {
    return {
      maxPoints,
      pointsEarned: 0,
      onTime: false,
      completedOn: completedOn || '',
      dueDate: dueDate || '',
      postState: 'NEW',
    };
  }

  const onTime = contributesToOnTimeGrade(dueDate, completedOn);
  const base = onTime
    ? maxPoints
    : Math.round((MISS_GAP_LATE_POINTS / MISS_GAP_MAX_POINTS) * maxPoints);
  // Half the grade is for turning it in, half for getting the words right. A
  // 2-of-6 run used to pass back a full 100 because "completed" was the only
  // thing the old checkbox homework could measure.
  const pointsEarned =
    typeof args.accuracy === 'number' && Number.isFinite(args.accuracy)
      ? Math.round(base * (0.5 + 0.5 * (Math.min(100, Math.max(0, args.accuracy)) / 100)))
      : base;

  return {
    maxPoints,
    pointsEarned,
    onTime,
    completedOn,
    dueDate,
    postState: 'TURNED_IN',
  };
}

function applyHomeworkParams(
  url: URL,
  payload: MissGapAssignmentPayload,
  score?: MissGapGradeScore,
): void {
  if (payload.lesson) url.searchParams.set('lesson', payload.lesson);
  if (payload.teacher) url.searchParams.set('teacher', payload.teacher);
  url.searchParams.set('found', String(payload.found));
  url.searchParams.set('total', String(payload.total));
  if (payload.missedWords.length > 0) {
    url.searchParams.set('missed', payload.missedWords.join(','));
  }
  url.searchParams.set('lang', payload.locale);
  if (payload.dueDate) url.searchParams.set('due', payload.dueDate);
  if (score) {
    url.searchParams.set('points', String(score.pointsEarned));
    url.searchParams.set('max', String(score.maxPoints));
    url.searchParams.set('onTime', score.onTime ? '1' : '0');
    url.searchParams.set('completed', score.completedOn);
    url.searchParams.set('postState', score.postState);
  }
}

/** Absolute grade-receipt / student attachment view URI. */
export function buildMissGapGradePassbackShareUrl(args: {
  input: MissGapAssignmentInput | MissGapAssignmentPayload;
  score?: MissGapGradeScore;
  context?: ClassroomAddonContextQuery;
}): string {
  const payload = toMissGapAssignmentPayload(args.input);
  const locale = normalizeLocale(payload.locale);
  const url = new URL(`/${locale}${MISS_GAP_GRADE_PASSBACK_PATH}`, CLASS_GAP_ORIGIN);
  applyHomeworkParams(url, payload, args.score);
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
export function buildMissGapGradePassbackPath(args: {
  input: MissGapAssignmentInput | MissGapAssignmentPayload;
  score?: MissGapGradeScore;
}): string {
  const abs = buildMissGapGradePassbackShareUrl(args);
  const u = new URL(abs);
  return `${u.pathname}${u.search}`;
}

/**
 * AddOnAttachment body with maxPoints so Classroom can enable Grade sync.
 * Teacher + student views point at the miss-gap grade receipt (framed).
 */
export function buildMissGapGradeAttachment(args: {
  input: MissGapAssignmentInput | MissGapAssignmentPayload;
  title?: string;
  maxPoints?: number;
}): MissGapGradeAttachment {
  const payload = toMissGapAssignmentPayload(args.input);
  if (payload.missedWords.length === 0) {
    throw new Error('buildMissGapGradeAttachment: at least one missed word required');
  }
  const maxPoints =
    typeof args.maxPoints === 'number' && args.maxPoints > 0
      ? Math.min(1000, Math.round(args.maxPoints))
      : MISS_GAP_MAX_POINTS;
  const viewUri = buildMissGapGradePassbackShareUrl({ input: payload });
  const lesson = payload.lesson || 'class';
  return {
    title: args.title?.trim() || `Miss-gap homework — ${lesson}`,
    teacherViewUri: viewUri,
    studentViewUri: viewUri,
    maxPoints,
  };
}

/** studentSubmissions.patch body + updateMask (deferred OAuth wire-up). */
export function buildMissGapStudentSubmissionPatch(
  score: MissGapGradeScore,
): MissGapStudentSubmissionPatch {
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
 * One-shot grade passback payload when homework completes.
 * Pure: no network. Ready for Marketplace create + patch when addons.teacher lands.
 */
export function buildMissGapGradePassback(body: unknown): MissGapGradePassbackResponse {
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

  const dueDate = normalizeDueDate(
    typeof raw.due === 'string'
      ? raw.due
      : typeof raw.dueDate === 'string'
        ? raw.dueDate
        : '',
  );
  if (!dueDate) {
    return { ok: false, error: 'Provide due (YYYY-MM-DD) for grade passback.' };
  }

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

  const input: MissGapAssignmentInput = {
    locale: typeof raw.locale === 'string' ? raw.locale : 'en',
    lessonNames:
      typeof raw.lesson === 'string' && raw.lesson.trim()
        ? [raw.lesson.trim()]
        : ['Miss-gap homework'],
    teacherName: typeof raw.teacher === 'string' ? raw.teacher : '',
    found: typeof raw.found === 'number' ? raw.found : 0,
    total: typeof raw.total === 'number' ? raw.total : missedWords.length,
    missedWords,
    dueDate,
  };

  const payload = toMissGapAssignmentPayload(input);
  const score = scoreMissGapHomework({
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
    typeof raw.title === 'string' && raw.title.trim()
      ? raw.title.trim()
      : undefined;

  let attachment: MissGapGradeAttachment;
  try {
    attachment = buildMissGapGradeAttachment({
      input: payload,
      title,
      maxPoints: score.maxPoints,
    });
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Failed to build grade attachment',
    };
  }

  // Receipt URI includes the scored points for the student turn-in view.
  const gradeReceiptUrl = buildMissGapGradePassbackShareUrl({
    input: payload,
    score,
  });
  attachment = {
    ...attachment,
    studentViewUri: gradeReceiptUrl,
    teacherViewUri: gradeReceiptUrl,
  };

  const homeworkUrl = buildMissGapAssignmentShareUrl(payload);
  const studentSubmission = buildMissGapStudentSubmissionPatch(score);

  return {
    ok: true,
    homeworkUrl,
    gradeReceiptUrl,
    score,
    attachment,
    studentSubmission,
    student_names: false,
    roster_scopes: false,
    oauth_required_for_grade_sync: true,
    foils: ['Kahoot Marketplace grade passback'],
    instructions:
      'On homework complete, show gradeReceiptUrl to the student. attachment.maxPoints enables Classroom Grade sync; studentSubmission is the body+updateMask for studentSubmissions.patch when classroom.addons.teacher is enabled. Never include student names. Stream assign stays Phase-1 share dialog.',
  };
}

export function missGapGradePassbackMarketplaceSlice(): Record<string, unknown> {
  return {
    name: 'LexiClash miss-gap grade passback',
    foils: ['Kahoot Marketplace grade passback'],
    extends: ['#970', '#975'],
    maxPoints: MISS_GAP_MAX_POINTS,
    latePoints: MISS_GAP_LATE_POINTS,
    student_names: false,
    roster_scopes: false,
    oauth_required_for_grade_sync: true,
    api: `${CLASS_GAP_ORIGIN}${MISS_GAP_GRADE_PASSBACK_API_PATH}`,
    studentViewUriTemplate: `${CLASS_GAP_ORIGIN}/{locale}${MISS_GAP_GRADE_PASSBACK_PATH}`,
    frame_ancestors: [...GRADE_PASSBACK_FRAME_ANCESTORS],
    notes:
      'Completion grade for #975 async miss-gap homework. Patch path deferred until classroom.addons.teacher; receipt + attachment shape ship today.',
  };
}

export function missGapGradePassbackCorsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    'Cache-Control': 'no-store',
  };
}

/** CSP so Classroom can frame the grade receipt / student attachment view. */
export function missGapGradePassbackContentSecurityPolicy(): string {
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
