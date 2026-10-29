/**
 * Education telemetry — thin wrapper over PostHog `capture` for the
 * education tree. Stable `edu_*` event names + snake_case property keys.
 *
 * Why a wrapper:
 * - Single grep target (`trackEdu*`) for compliance audits.
 * - Guarantees property naming convention without each caller needing to
 *   remember it.
 * - Never throws — analytics must not break gameplay.
 *
 * SCOPE NOTE (2026-09-15): four declarations — `edu_practice_start`,
 * `edu_xp_awarded`, `edu_student_join_classroom`, `edu_achievement_unlock` —
 * were deleted here. None had a call site anywhere in the codebase and none had
 * ever emitted an event. They made the education module look instrumented on
 * every audit while measuring nothing, which is worse than an honest gap.
 * `edu_student_join_classroom` was additionally a near-duplicate of the working
 * `edu_classroom_join`; keeping both would have split one funnel across two
 * names.
 *
 * The events that matter for CLASSROOM gameplay are emitted SERVER-side, from
 * `backend/utils/educationTelemetry.ts` — that is where classroom games are
 * actually completed. See that module's header for why.
 */

import { captureActivation, captureStudentJoin, persistTeacherActivation, safeCapture, safeRegister } from './telemetryCore';

export { safeCapture } from './telemetryCore';
export * from './telemetryTeacherReports';

export type PracticeType =
  | 'flashcard'
  | 'solo_board'
  | 'warmup'
  | 'word_list'
  | 'matching'
  | 'spelling'
  | 'blitz'
  | 'vocab_focus'
  | 'wordcraft'
  | 'lesson_completion';

export interface EduPracticeCompleteArgs {
  lessonId: string;
  practiceType: PracticeType;
  cardsReviewed?: number;
  cardsCorrect?: number;
  timeSpentSeconds?: number;
}

export function trackEduPracticeComplete(args: EduPracticeCompleteArgs): void {
  const accuracy =
    args.cardsReviewed && args.cardsReviewed > 0 && args.cardsCorrect !== undefined
      ? args.cardsCorrect / args.cardsReviewed
      : undefined;

  const props: Record<string, unknown> = {
    lesson_id: args.lessonId,
    practice_type: args.practiceType,
  };
  if (args.cardsReviewed !== undefined) props.cards_reviewed = args.cardsReviewed;
  if (args.cardsCorrect !== undefined) props.cards_correct = args.cardsCorrect;
  if (accuracy !== undefined) props.accuracy = accuracy;
  if (args.timeSpentSeconds !== undefined) props.time_spent_seconds = args.timeSpentSeconds;

  safeCapture('edu_practice_complete', props);
}

export type ClassroomJoinResult = 'success' | 'invalid_code' | 'already_member' | 'full' | 'room_locked' | 'name_taken' | 'server_error';

/**
 * Which of the TWO six-character code systems actually resolved.
 *
 * `/join/[code]` accepts both the roster `join_code` and the live game code
 * shown on the projector. Verified against production 2026-09-15, they are
 * shape-identical — roster `UHMKL4`, game `5L7UCD`, both six uppercase
 * alphanumerics — so nothing about the STRING can tell them apart. Only the
 * lookup can, which is why this is reported by the caller rather than derived.
 */
export type MatchedCodeType = 'roster_code' | 'game_code';

export type CodeCharset = 'letters' | 'digits' | 'alphanumeric' | 'other';

/** Shape only — the code itself is a shared secret and never leaves the client. */
function charsetOf(code: string): CodeCharset {
  if (/^[A-Za-z]+$/.test(code)) return 'letters';
  if (/^[0-9]+$/.test(code)) return 'digits';
  if (/^[A-Za-z0-9]+$/.test(code)) return 'alphanumeric';
  return 'other';
}

export interface EduClassroomJoinArgs {
  result: ClassroomJoinResult;
  classroomId?: string;
  /**
   * The code the student typed. Used ONLY to derive length + charset; it is
   * never put on the event.
   */
  attemptedCode?: string;
  matchedCodeType?: MatchedCodeType;
  /** Invite URL vs typed on /join. Never the code itself. */
  source?: 'invite_link' | 'typed_code';
}

export interface StudentJoinStartedArgs {
  /** Unknown until the join resolves — omit rather than fake it. */
  classroomId?: string;
  /** Invite URL vs typed on /join. Never the code itself. */
  source?: 'invite_link' | 'typed_code';
}

/**
 * `student_join_started` — the funnel step that was missing entirely: the
 * student passed validation and is about to POST the join. Pairs with the
 * `student_join_completed` branch of `trackEduClassroomJoin` so a drop-off
 * between "pressed GO" and "is in the class" can be counted. Never carries
 * the join code — classroom_id (when already known) and source only.
 */
export function trackStudentJoinStarted(args: StudentJoinStartedArgs): void {
  const props: Record<string, unknown> = {};
  if (args.classroomId) props.classroom_id = args.classroomId;
  if (args.source) props.source = args.source;
  captureStudentJoin('student_join_started', props);
}

/**
 * `edu_classroom_join` — the one event that has always worked, now carrying the
 * shape of its failures.
 *
 * Production 2026-09-15: 42 attempts, 21 success, 19 `not_found`. Seven of
 * twelve users hit a not-found at least once, and nothing on the event said
 * what they had typed or which system it belonged to. `matched_code_type` on
 * the successes and `code_length` / `code_charset` on the failures are what
 * turn that 50% into a diagnosable number.
 */
export function trackEduClassroomJoin(args: EduClassroomJoinArgs): void {
  const props: Record<string, unknown> = { result: args.result };
  if (args.classroomId) props.classroom_id = args.classroomId;
  if (args.matchedCodeType) props.matched_code_type = args.matchedCodeType;
  if (args.attemptedCode) {
    props.code_length = args.attemptedCode.length;
    props.code_charset = charsetOf(args.attemptedCode);
  }
  captureActivation('edu_classroom_join', props);

  // The teacher-activation funnel above stays `edu_classroom_join`. The student
  // join funnel is a separate pair of names so a drop-off between "opened the
  // invite" and "is in the class" can be counted without splitting the
  // existing dashboard. The code itself is a shared secret and never rides
  // either event — only its shape, on failures.
  if (args.result === 'success' || args.result === 'already_member') {
    const completed: Record<string, unknown> = {
      already_member: args.result === 'already_member',
    };
    if (args.classroomId) completed.classroom_id = args.classroomId;
    if (args.matchedCodeType) completed.matched_code_type = args.matchedCodeType;
    if (args.source) completed.source = args.source;
    captureStudentJoin('student_join_completed', completed);
    return;
  }
  const failed: Record<string, unknown> = { reason: args.result };
  if (args.attemptedCode) {
    failed.code_length = args.attemptedCode.length;
    failed.code_charset = charsetOf(args.attemptedCode);
  }
  if (args.source) failed.source = args.source;
  safeCapture('student_join_failed', failed);
}

export interface EduClassroomCreatedArgs {
  classroomId: string;
  /** Which surface created it — the dashboard form or the express game lobby. */
  createdVia: 'dashboard' | 'express_lobby' | 'onboarding';
  /** Classroom UI language, so create vs join can be quoted per language. */
  language?: string;
}

/**
 * Which UI surface created the class. The canonical `edu_classroom_created`
 * is emitted once by the create route; this browser twin used to share its name
 * and counted every class twice.
 */
export function trackEduClassroomCreated(args: EduClassroomCreatedArgs): void {
  const props: Record<string, unknown> = {
    classroom_id: args.classroomId,
    created_via: args.createdVia,
  };
  if (args.language) props.language = args.language;
  captureActivation('edu_classroom_create_ui_done', props);
}

export interface EduJoinCodeArgs {
  classroomId: string;
}

/**
 * Class-created → first-student funnel. Never send the join code itself
 * (shared secret). `classroom_id` is enough to stitch shown → copied → joined.
 * Copy is also used by the start-live-class CTA so one funnel counts copies.
 */
export function trackEduJoinCodeShown(args: EduJoinCodeArgs): void {
  captureActivation('edu_join_code_shown', { classroom_id: args.classroomId });
}


export function trackEduJoinCodeCopied(args: EduJoinCodeArgs): void {
  captureActivation('edu_join_code_copied', { classroom_id: args.classroomId });
  persistTeacherActivation({ inviteCopied: true });
}

export type EduJoinShareMethod = 'whatsapp' | 'google_classroom' | 'native' | 'copy_fallback';

export function trackEduJoinCodeShared(args: EduJoinCodeArgs & { method: EduJoinShareMethod }): void {
  captureActivation('edu_join_code_shared', { classroom_id: args.classroomId, method: args.method });
  persistTeacherActivation({ inviteCopied: true });
}

export function trackEduFirstStudentJoined(args: EduJoinCodeArgs): void {
  captureActivation('edu_first_student_seen', { classroom_id: args.classroomId });
}

export interface EduTeacherOnboardingStepArgs {
  step: number;
  totalSteps: number;
  action: 'view' | 'next' | 'skip' | 'complete' | 'back';
}

export function trackEduTeacherOnboardingStep(args: EduTeacherOnboardingStepArgs): void {
  captureActivation('edu_teacher_onboarding_step', {
    flow: 'infographic',
    step: args.step,
    total_steps: args.totalSteps,
    action: args.action,
  });
}

export type TeacherOnboardingChecklistAction = 'view' | 'cta' | 'dismiss';

export interface TeacherOnboardingChecklistStepArgs {
  step:
    | 'create_classroom'
    | 'create_first_assignment'
    | 'share_join_link'
    | 'start_live_class';
  action: TeacherOnboardingChecklistAction;
}

/**
 * Dashboard checklist (classroom → assignment → join link → start live class).
 * Same event as the infographic, split by `flow` so one name answers "where do
 * teachers drop off in onboarding".
 */
export function trackTeacherOnboardingStep(args: TeacherOnboardingChecklistStepArgs): void {
  safeCapture('edu_teacher_onboarding_step', {
    flow: 'checklist',
    step: args.step,
    action: args.action,
  });
}

/** One-tap starter pack on the empty assignment dialog. */
export function trackTeacherFirstAssignmentTemplate(args: {
  templateId: string;
  action: 'view' | 'assign';
}): void {
  safeCapture('teacher_first_assignment_template', {
    template_id: args.templateId,
    action: args.action,
  });
}

/** One-click assign from the grade/subject template gallery. */
export function trackEduTemplateAssigned(args: {
  templateId: string;
  classroomId: string;
}): void {
  safeCapture('edu_template_assigned', {
    template_id: args.templateId,
    classroom_id: args.classroomId,
  });
}

export interface EduTeacherSnapshot {
  classroomCount: number;
  studentCount: number;
  hasPro: boolean;
}

function snapshotProps(s: EduTeacherSnapshot): Record<string, unknown> {
  return { classroom_count: s.classroomCount, student_count: s.studentCount, has_pro: s.hasPro };
}

/**
 * `edu_teacher_dashboard_viewed` — one per /teacher mount, after classrooms and
 * the Pro entitlement resolve.
 *
 * Production 2026-09-17: 54 approved teachers, 4 seen more than a day after
 * approval. Pageviews said who opened /teacher, not what they found there —
 * a teacher with no class and one with a full roster looked identical. Daily
 * uniques on this event are the returning-teacher number; the snapshot is the
 * state they were in when they left.
 */
export function trackEduTeacherDashboardViewed(s: EduTeacherSnapshot): void {
  safeCapture('edu_teacher_dashboard_viewed', snapshotProps(s));
}

/**
 * `edu_teacher_tools_opened` — the collapsed Tools drawer holds the classroom
 * manager, assignments, analytics and reports. Every one of those had
 * near-zero use and no way to tell "unwanted" from "never found".
 */
export function trackEduTeacherToolsOpened(s: EduTeacherSnapshot): void {
  safeCapture('edu_teacher_tools_opened', snapshotProps(s));
}

/**
 * `edu_progress_digest_viewed` — free teachers used to open /teacher/reports
 * and only see a ProGate. The digest is the edu-funnel impression: last-lesson
 * numbers plus a Teacher Pro CTA. `pulse_state` tells empty vs real lesson
 * without sending student names.
 */
export function trackEduProgressDigestViewed(args: { hasPro: boolean; state: string }): void {
  safeCapture('edu_progress_digest_viewed', {
    has_pro: args.hasPro,
    pulse_state: args.state,
  });
}

/**
 * `teacher_digest_viewed` — weekly HQ digest impression. Mid-trial day 7
 * is the conversion beat (Polar CTA on the same card). Never send student names.
 */
export function trackTeacherDigestViewed(args: {
  hasPro: boolean;
  trialDay7: boolean;
  studentsActive: number;
  trialExpired?: boolean;
}): void {
  const props = {
    has_pro: args.hasPro,
    trial_day_7: args.trialDay7,
    trial_expired: args.trialExpired === true,
    students_active: args.studentsActive,
  };
  safeCapture('teacher_digest_viewed', props);
  captureActivation('edu_digest_viewed', props);
}

/** Polar CTA tap on the weekly digest — never student names. */
export function trackTeacherDigestUpgradeCtaClicked(args: {
  hasPro: boolean;
  trialDay7: boolean;
  trialExpired?: boolean;
  overCap?: boolean;
}): void {
  const props = {
    has_pro: args.hasPro,
    trial_day_7: args.trialDay7,
    trial_expired: args.trialExpired === true,
    over_cap: args.overCap === true,
  };
  safeCapture('teacher_digest_upgrade_cta_clicked', props);
  captureActivation('edu_digest_upgrade_cta_clicked', props);
}

/**
 * `edu_reteach_live_scheduled` — one-click "schedule reteach Live in ~14 days"
 * from miss-gap words on the last-lesson digest. Kahoot Teacher Takeover foil:
 * rebuild hard Qs, replay ~2 weeks later. Counts words only — never student names.
 */
export function trackEduReteachLiveScheduled(args: {
  wordCount: number;
  delayDays: number;
}): void {
  safeCapture('edu_reteach_live_scheduled', {
    word_count: args.wordCount,
    delay_days: args.delayDays,
  });
}


export type EduTeacherAction = 'create_classroom' | 'create_lesson' | 'create_assignment';

export interface EduTeacherActionFailedArgs {
  action: EduTeacherAction;
  /** Server/Supabase message or error code. Capped — never user-typed content. */
  reason: string;
}

/**
 * `edu_teacher_action_failed` — the create hooks return `{success:false}` and
 * the only trace was a console line in the teacher's own browser. A create
 * that fails looks exactly like a teacher who never tried (rules class 4).
 */
export function trackEduTeacherActionFailed(args: EduTeacherActionFailedArgs): void {
  safeCapture('edu_teacher_action_failed', {
    action: args.action,
    reason: args.reason.slice(0, 120),
  });
}

export type EduErrorSurface =
  | 'record_xp'
  | 'practice_session'
  | 'classroom_game'
  | 'lesson_load'
  | 'spaced_repetition';

export interface EduErrorArgs {
  surface: EduErrorSurface;
  code: string;
}

export function trackEduError(args: EduErrorArgs): void {
  safeCapture('edu_error', {
    surface: args.surface,
    code: args.code,
  });
}

/**
 * Register `classroom_id` as a PostHog SUPER PROPERTY, so it rides every
 * subsequent event from this browser — `game_started`, `game_completed`,
 * `growth:game_started`, `growth:game_completed`, `results_viewed`, all of it.
 *
 * Why a super property rather than editing the emitters: `classroom_id` has
 * never appeared on ANY game lifecycle event, all-time, so "which modes do
 * students play in class" was unanswerable. The lifecycle events are emitted
 * from many call sites — and `game_completed` deliberately dual-emits under
 * both its canonical and `growth:` names — so adding the property at each
 * emitter is exactly the asymmetric-paths pitfall (rules class 3): one path
 * would carry it and its twin would not. Registering once covers every path by
 * construction.
 *
 * MUST be called with `null` when the student leaves classroom context. Super
 * properties persist in localStorage, so a value left behind would tag every
 * later solo game as classroom play (rules class 2 — stale state).
 */
export function setEduClassroomContext(classroomId: string | null): void {
  safeRegister({ classroom_id: classroomId });
}

/**
 * Register `is_test_account`, so QA and automation traffic can be excluded with
 * a property filter instead of the hand-built email patterns the 2026-09-12
 * purge had to reconstruct by hand (`.claude/rules/70-test-accounts.md`).
 *
 * Always pass an explicit boolean — an ABSENT property and `false` are
 * different things in a PostHog filter, and "absent" would quietly drop real
 * users from any funnel written as `is_test_account = false`.
 */
export function setEduTestAccountFlag(isTestAccount: boolean): void {
  safeRegister({ is_test_account: isTestAccount });
}

/**
 * The QA/automation signup convention: `<tag>@lexiclash.test`
 * (`.claude/rules/70-test-accounts.md`). A DB trigger sets
 * `profiles.is_test_account` from the same address, so this mirrors the
 * server's own predicate rather than inventing a second one.
 *
 * Deliberately NOT matched: a `+qa` alias on a real domain. The rule says such
 * aliases are not auto-flagged, and widening the match here would quietly drop
 * real users out of every funnel.
 *
 * LIMIT: anonymous guest students have `auth.users.email IS NULL` by
 * construction, so email can never catch them. They are flagged in the DB via
 * the test-teacher's classroom; `profiles.is_test_account` stays the
 * authoritative filter for those.
 */
export function isTestAccountEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.trim().toLowerCase().endsWith('@lexiclash.test');
}
