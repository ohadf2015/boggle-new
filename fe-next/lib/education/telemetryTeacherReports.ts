/** Teacher live-game, report, assignment and HQ telemetry. Re-exported from `./telemetry`. */
import { captureActivation, persistTeacherActivation, safeCapture } from './telemetryCore';

export type LiveGameStartSource = 'create_room' | 'quick_start' | 'hq_express';

export interface EduLiveGameStartedArgs {
  classroomId: string;
  source: LiveGameStartSource;
  lessonCount?: number;
}

export function trackEduLiveGameStarted(args: EduLiveGameStartedArgs): void {
  const props: Record<string, unknown> = {
    classroom_id: args.classroomId,
    source: args.source,
  };
  if (args.lessonCount !== undefined) props.lesson_count = args.lessonCount;
  captureActivation('edu_live_game_started', props);
  // The teacher launched a room; whether students actually played is stamped
  // server-side when the first real (2+ player) round completes.
  persistTeacherActivation({ roomOpened: true });
}

export interface EduReportsViewedArgs {
  classroomId?: string;
  studentId?: string;
}

export function trackEduReportsViewed(args: EduReportsViewedArgs = {}): void {
  const props: Record<string, unknown> = {};
  if (args.classroomId) props.classroom_id = args.classroomId;
  if (args.studentId) props.student_id = args.studentId;
  safeCapture('edu_reports_viewed', props);
}

/** Class assignment grid opened. Property is `class_id`. */
export function trackProgressReportViewed(classId: string): void {
  if (!classId) return;
  safeCapture('progress_report_viewed', { class_id: classId });
}

/** Teacher copied the weekly summary text. Same property as the view event. */
export function trackWeeklySummaryCopied(classId: string): void {
  if (!classId) return;
  safeCapture('weekly_summary_copied', { class_id: classId });
}

/** HQ weekly email report: teacher copied the paste-ready report text. Same `class_id` property as the digest view events. */
export function trackTeacherWeeklyEmailReportCopied(args: { classroomId: string }): void {
  if (!args.classroomId) return;
  safeCapture('teacher_weekly_email_report_copied', { class_id: args.classroomId });
}

export interface EduFirstAssignmentCtaArgs {
  classroomId: string;
}

/** HQ panel: class has students, 0 assignments, no live room. */
export function trackEduFirstAssignmentCtaShown(args: EduFirstAssignmentCtaArgs): void {
  captureActivation('edu_first_assignment_cta_shown', { classroom_id: args.classroomId });
}

export function trackEduFirstAssignmentCtaClicked(args: EduFirstAssignmentCtaArgs): void {
  captureActivation('edu_first_assignment_cta_clicked', { classroom_id: args.classroomId });
}

/** First assignment actually created (dialog or starter pack). */
export function trackEduFirstAssignmentCreated(args: EduFirstAssignmentCtaArgs): void {
  safeCapture('edu_first_assignment_created', { classroom_id: args.classroomId });
}

/** Class-detail empty state: 0 assignments. Distinct from the HQ panel events. */
export function trackTeacherFirstAssignmentCtaViewed(args: EduFirstAssignmentCtaArgs): void {
  safeCapture('teacher_first_assignment_cta_viewed', { classroom_id: args.classroomId });
}

export function trackTeacherFirstAssignmentCtaClicked(args: EduFirstAssignmentCtaArgs): void {
  safeCapture('teacher_first_assignment_cta_clicked', { classroom_id: args.classroomId });
}

export interface EduAssignmentReminderArgs {
  assignmentId: string;
  classroomId?: string | null;
}

/**
 * Student's open assignment is due within 24h — the Academy hub reminder card
 * is on screen. Client-side like every other student-visible education event;
 * `hours_until_due` is rounded up so "3.2h left" reads as 4.
 */
export function trackEduAssignmentReminderShown(args: EduAssignmentReminderArgs & { hoursUntilDue: number }): void {
  const props: Record<string, unknown> = {
    assignment_id: args.assignmentId,
    hours_until_due: args.hoursUntilDue,
  };
  if (args.classroomId) props.classroom_id = args.classroomId;
  safeCapture('assignment_reminder_shown', props);
}

/**
 * Student was nudged about an assignment past its due date (throttled to one
 * nudge per assignment per day by assignmentDueReminder.ts).
 */
export function trackEduAssignmentOverdue(args: EduAssignmentReminderArgs & { daysOverdue: number }): void {
  const props: Record<string, unknown> = {
    assignment_id: args.assignmentId,
    days_overdue: args.daysOverdue,
  };
  if (args.classroomId) props.classroom_id = args.classroomId;
  safeCapture('assignment_overdue', props);
}

export interface EduStartLiveClassArgs {
  classroomId: string;
}

/** Assignment/classroom view: start the existing live-room flow. */
export function trackEduAssignmentStartLiveClicked(args: EduStartLiveClassArgs): void {
  safeCapture('edu_assignment_start_live_clicked', { classroom_id: args.classroomId });
}

export interface TeacherHqProgressViewedArgs {
  classroomId: string;
  studentCount: number;
  assignmentCount: number;
  submittedCount: number;
  hasPro: boolean;
}

/** HQ class-progress strip impression — evidence of value before the Pro ask. */
export function trackTeacherHqProgressViewed(args: TeacherHqProgressViewedArgs): void {
  safeCapture('teacher_hq_progress_viewed', {
    classroom_id: args.classroomId,
    student_count: args.studentCount,
    assignment_count: args.assignmentCount,
    submitted_count: args.submittedCount,
    has_pro: args.hasPro,
  });
}

export function trackTeacherHqUpgradeClicked(args: { classroomId: string }): void {
  safeCapture('teacher_hq_upgrade_clicked', { classroom_id: args.classroomId });
}

export interface TeacherAssignmentReportViewedArgs {
  classroomId: string;
  assignmentCount: number;
  hasPro: boolean;
}

/** Classroom report/assignments compact completion strip — last-mile before Pro. */
export function trackTeacherAssignmentReportViewed(args: TeacherAssignmentReportViewedArgs): void {
  safeCapture('teacher_assignment_report_viewed', {
    classroom_id: args.classroomId,
    assignment_count: args.assignmentCount,
    has_pro: args.hasPro,
  });
}

export function trackTeacherAssignmentReportUpgradeClicked(args: { classroomId: string }): void {
  safeCapture('teacher_assignment_report_upgrade_clicked', { classroom_id: args.classroomId });
}

/** Free roster progress report on the class view — its upgrade link click. */
export function trackTeacherRosterProgressUpgradeClicked(args: { classroomId: string }): void {
  safeCapture('teacher_roster_progress_upgrade_clicked', { classroom_id: args.classroomId });
}

/** Pro teacher printed the parent-share roster handout. */
export function trackTeacherRosterParentSharePrinted(args: { classroomId: string }): void {
  safeCapture('teacher_roster_parent_share_printed', { classroom_id: args.classroomId });
}

export interface EduInviteStudentsCtaArgs {
  classroomId: string;
}

/** Class-detail empty roster: 0 enrolled students. Distinct from HQ join-panel events. */
export function trackTeacherInviteStudentsCtaViewed(args: EduInviteStudentsCtaArgs): void {
  safeCapture('teacher_invite_students_cta_viewed', { classroom_id: args.classroomId });
}

export function trackTeacherInviteStudentsCtaClicked(args: EduInviteStudentsCtaArgs): void {
  safeCapture('teacher_invite_students_cta_clicked', { classroom_id: args.classroomId });
}
