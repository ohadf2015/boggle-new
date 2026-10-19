/**
 * Honest social proof for the upgrade page: how many teachers actually ran live games lately.
 * Counts only real games (one per class + room code) from real teachers, and the page shows
 * the line only above a small floor: enough that the number is specific and not an anecdote,
 * never rounded up. Raise the floor as the product grows.
 */
export const TEACHER_PROOF_MIN_TEACHERS = 5;
export const TEACHER_PROOF_MIN_GAMES = 10;

export interface TeacherProof {
  teachers: number;
  games: number;
}

export interface ProofSessionRow {
  classroom_id: string | null;
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
    const teacher = row.classroom_id ? teacherOfClassroom[row.classroom_id] : undefined;
    if (!row.game_code || !teacher || testTeachers.has(teacher)) continue;
    games.add(`${row.classroom_id}:${row.game_code}`);
    teachers.add(teacher);
  }
  return { teachers: teachers.size, games: games.size };
}

export function teacherProofToShow(proof: TeacherProof): TeacherProof | null {
  return proof.teachers >= TEACHER_PROOF_MIN_TEACHERS && proof.games >= TEACHER_PROOF_MIN_GAMES ? proof : null;
}

/** One-hour server cache for the public count. Lives here, not in the route file: a Next route may only export HTTP handlers. */
export const teacherProofCache: { at: number; body: Record<string, unknown> | null } = { at: 0, body: null };

export function resetTeacherProofCache() {
  teacherProofCache.at = 0;
  teacherProofCache.body = null;
}
