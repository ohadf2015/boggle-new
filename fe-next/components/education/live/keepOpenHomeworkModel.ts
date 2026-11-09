/** "Keep it open as homework": one school week, so the class can replay the words between lessons. */
export const KEEP_OPEN_DAYS = 7;

export interface HomeworkRow {
  lesson_id: string;
  due_date: string | null;
}

/**
 * The class's open homework for this lesson, if any. `today` and due dates are
 * compared as YYYY-MM-DD; a due date of today is still open.
 */
export function openHomeworkFor(rows: readonly HomeworkRow[], lessonId: string, today: string): { due: string | null } | null {
  for (const r of rows) {
    if (r.lesson_id !== lessonId) continue;
    const due = r.due_date ? r.due_date.slice(0, 10) : null;
    if (due === null || due >= today) return { due };
  }
  return null;
}
