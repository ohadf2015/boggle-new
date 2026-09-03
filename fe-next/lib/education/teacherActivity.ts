/**
 * Per-teacher activity payload for the admin funnel drill-down.
 *
 * Pure — all IO lives in the details route. Teacher counts are small (tens),
 * so classroom/student/assignment joins happen in memory the same way
 * `buildTeacherFunnel` does.
 */

export interface TeacherActivityInput {
  userId: string;
  profile: {
    id: string;
    user_role: string | null;
    last_seen_at: string | null;
    display_name: string | null;
    username: string | null;
  } | null;
  request: {
    email: string | null;
    full_name: string | null;
    status: string | null;
    trial_expires_at: string | null;
  } | null;
  classrooms: Array<{
    id: string;
    name: string | null;
    join_code: string | null;
    language: string | null;
    created_at: string | null;
  }>;
  memberships: Array<{
    classroom_id: string;
    student_id: string;
    joined_at: string | null;
  }>;
  lessons: Array<{
    id: string;
    name: string | null;
    language: string | null;
    created_at: string | null;
    words: unknown;
    source_game_code: string | null;
  }>;
  assignments: Array<{
    id: string;
    title: string | null;
    assignment_type: string | null;
    classroom_id: string | null;
    lesson_id: string | null;
    due_date: string | null;
    created_at: string | null;
  }>;
  progress: Array<{
    student_id: string;
    lesson_id: string;
    assignment_id: string | null;
    completed_at: string | null;
    current_level: number | null;
    total_xp: number | null;
    words_mastered: string[] | null;
  }>;
}

export interface TeacherActivityDetails {
  teacher: {
    id: string;
    email: string | null;
    fullName: string | null;
    displayName: string | null;
    username: string | null;
    roleGranted: boolean;
    lastSeenAt: string | null;
    trialExpiresAt: string | null;
    status: string | null;
  };
  classrooms: Array<{
    id: string;
    name: string | null;
    joinCode: string | null;
    language: string | null;
    createdAt: string | null;
    studentCount: number;
    students: Array<{ id: string; joinedAt: string | null }>;
  }>;
  wordlists: Array<{
    id: string;
    name: string | null;
    language: string | null;
    createdAt: string | null;
    wordCount: number;
    sourceGameCode: string | null;
  }>;
  assignments: Array<{
    id: string;
    title: string | null;
    type: string | null;
    classroomName: string | null;
    lessonName: string | null;
    dueDate: string | null;
    createdAt: string | null;
    completedCount: number;
  }>;
  completions: Array<{
    studentId: string;
    lessonId: string;
    lessonName: string | null;
    completedAt: string;
    currentLevel: number | null;
    totalXp: number | null;
    wordsMasteredCount: number;
  }>;
}

function wordCountOf(words: unknown): number {
  return Array.isArray(words) ? words.length : 0;
}

export function buildTeacherActivity(input: TeacherActivityInput): TeacherActivityDetails {
  const { userId, profile, request, classrooms, memberships, lessons, assignments, progress } =
    input;

  const studentsByClassroom = new Map<string, Array<{ id: string; joinedAt: string | null }>>();
  for (const m of memberships) {
    const list = studentsByClassroom.get(m.classroom_id) ?? [];
    list.push({ id: m.student_id, joinedAt: m.joined_at });
    studentsByClassroom.set(m.classroom_id, list);
  }

  const classroomNameById = new Map(classrooms.map((c) => [c.id, c.name ?? null]));
  const lessonNameById = new Map(lessons.map((l) => [l.id, l.name ?? null]));

  const completedCountByAssignment = new Map<string, number>();
  for (const p of progress) {
    if (!p.completed_at || !p.assignment_id) continue;
    completedCountByAssignment.set(
      p.assignment_id,
      (completedCountByAssignment.get(p.assignment_id) ?? 0) + 1,
    );
  }

  const completions = progress
    .filter((p): p is typeof p & { completed_at: string } => !!p.completed_at)
    .sort((a, b) => Date.parse(b.completed_at) - Date.parse(a.completed_at))
    .slice(0, 50)
    .map((p) => ({
      studentId: p.student_id,
      lessonId: p.lesson_id,
      lessonName: lessonNameById.get(p.lesson_id) ?? null,
      completedAt: p.completed_at,
      currentLevel: p.current_level,
      totalXp: p.total_xp,
      wordsMasteredCount: Array.isArray(p.words_mastered) ? p.words_mastered.length : 0,
    }));

  return {
    teacher: {
      id: profile?.id ?? userId,
      email: request?.email ?? null,
      fullName: request?.full_name ?? null,
      displayName: profile?.display_name ?? null,
      username: profile?.username ?? null,
      roleGranted: profile?.user_role === 'teacher',
      lastSeenAt: profile?.last_seen_at ?? null,
      trialExpiresAt: request?.trial_expires_at ?? null,
      status: request?.status ?? null,
    },
    classrooms: classrooms.map((c) => {
      const students = studentsByClassroom.get(c.id) ?? [];
      return {
        id: c.id,
        name: c.name,
        joinCode: c.join_code,
        language: c.language,
        createdAt: c.created_at,
        studentCount: students.length,
        students,
      };
    }),
    wordlists: lessons.map((l) => ({
      id: l.id,
      name: l.name,
      language: l.language,
      createdAt: l.created_at,
      wordCount: wordCountOf(l.words),
      sourceGameCode: l.source_game_code,
    })),
    assignments: assignments.map((a) => ({
      id: a.id,
      title: a.title || (a.lesson_id ? lessonNameById.get(a.lesson_id) ?? null : null),
      type: a.assignment_type,
      classroomName: a.classroom_id ? classroomNameById.get(a.classroom_id) ?? null : null,
      lessonName: a.lesson_id ? lessonNameById.get(a.lesson_id) ?? null : null,
      dueDate: a.due_date,
      createdAt: a.created_at,
      completedCount: completedCountByAssignment.get(a.id) ?? 0,
    })),
    completions,
  };
}
