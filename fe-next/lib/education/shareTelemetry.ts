import { safeCapture } from './telemetry';

export type EduShareMethod = 'native' | 'whatsapp' | 'copy';

/** Teacher sent a parent their child's report link. */
export function trackEduParentReportShared(args: { classroomId: string; method: EduShareMethod }): void {
  safeCapture('edu_parent_report_shared', { classroom_id: args.classroomId, method: args.method });
}

/** Student shared their own round card with friends. No name, class or code rides the event. */
export function trackEduStudentResultShared(args: { method: EduShareMethod; gameMode?: string }): void {
  safeCapture('edu_student_result_shared', { method: args.method, game_mode: args.gameMode ?? null });
}

/** Teacher invited a colleague from a round that went well. */
export function trackEduTeacherInviteShared(args: { method: EduShareMethod; students: number }): void {
  safeCapture('edu_teacher_invite_shared', { method: args.method, students: args.students });
}
