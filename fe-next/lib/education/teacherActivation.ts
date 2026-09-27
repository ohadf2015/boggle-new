/**
 * Teacher activation — which dashboard nudge is honest right now.
 *
 * After approval, a classroom pays off when students can join AND when the
 * teacher has given them something to do. Dogfooding 2026-09-13 showed the
 * stall is assignment creation, not the join code; this function is the
 * single place that decides which of those two the dashboard may show.
 *
 * Pure on purpose. A failed assignment read must arrive as `null`, never as
 * `0` — otherwise a blip nags a teacher who already assigned work (pitfall
 * class 4: a failure wearing a fact's clothes).
 */

export type TeacherActivationStep = 'shareJoin' | 'firstAssignment' | null;

export interface TeacherActivationInput {
  rosterCount: number;
  /** `null` = unknown (loading or the read failed). Never coerce a failure to 0. */
  assignmentCount: number | null;
  joinCode?: string | null;
}

export function teacherActivationStep({
  rosterCount,
  assignmentCount,
  joinCode,
}: TeacherActivationInput): TeacherActivationStep {
  const code = (joinCode ?? '').trim();
  if (rosterCount <= 0) {
    return code ? 'shareJoin' : null;
  }
  if (assignmentCount === 0) return 'firstAssignment';
  return null;
}
