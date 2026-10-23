/** Classes with 3+ students are the ones that go on to play; below that, getting students in is the job. */
export const STUDENT_GOAL = 3;

export function belowStudentGoal(memberCount: number | undefined): boolean {
  return (memberCount ?? 0) < STUDENT_GOAL;
}
