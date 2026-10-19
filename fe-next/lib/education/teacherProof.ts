/**
 * Honest social proof for the upgrade page: how many teachers actually ran live games lately.
 * Counts only real games (one per class + room code) from real teachers, and the page shows
 * the line only when both numbers are large enough to persuade; a small true number would
 * hurt more than it helps, and a rounded-up one would be a lie.
 */
export const TEACHER_PROOF_MIN_TEACHERS = 25;
export const TEACHER_PROOF_MIN_GAMES = 60;

export interface TeacherProof {
  teachers: number;
  games: number;
}

export interface ProofSessionRow {
  classroom_id: string;
  game_code: string | null;
}

export function summarizeTeacherProof(
  rows: readonly ProofSessionRow[],
  teacherOfClassroom: Readonly<Record<string, string>>,
  testTeachers: ReadonlySet<string>,
): TeacherProof {
  const games = new Set<string>();
  const teachers = new Set<string>();
  for (const row of rows) {
    const teacher = teacherOfClassroom[row.classroom_id];
    if (!row.game_code || !teacher || testTeachers.has(teacher)) continue;
    games.add(`${row.classroom_id}:${row.game_code}`);
    teachers.add(teacher);
  }
  return { teachers: teachers.size, games: games.size };
}

export function teacherProofToShow(proof: TeacherProof): TeacherProof | null {
  return proof.teachers >= TEACHER_PROOF_MIN_TEACHERS && proof.games >= TEACHER_PROOF_MIN_GAMES ? proof : null;
}
