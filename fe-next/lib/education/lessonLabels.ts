/**
 * Labels for a lesson picker that spans a teacher's whole account.
 *
 * `useLessons()` returns every lesson the teacher owns, across all her classes,
 * and reusing one vocabulary list across periods is the intended workflow — so
 * the assignment creator can show "Week 3 Vocabulary" twice with nothing to
 * separate the rows.
 *
 * Only the ambiguous names get the classroom appended. Suffixing every row
 * would make the common case noisier for a problem it does not have; this is
 * the same rule the student word-count label follows.
 */

export interface PickerLesson {
  id: string;
  name: string;
  classroom_id?: string | null;
}

export interface LabelledLesson {
  id: string;
  label: string;
}

/** What a teacher would consider "the same name". */
function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

export function labelLessonsForPicker(
  lessons: PickerLesson[],
  classroomNamesById: Record<string, string>
): LabelledLesson[] {
  const counts = new Map<string, number>();
  for (const lesson of lessons) {
    const key = normalizeName(lesson.name);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return lessons.map((lesson) => {
    const isAmbiguous = (counts.get(normalizeName(lesson.name)) ?? 0) > 1;
    const classroomName = lesson.classroom_id
      ? classroomNamesById[lesson.classroom_id]
      : undefined;

    // No classroom to name (a teacher-wide lesson, or a class we could not
    // resolve) means no suffix — a dangling separator or a literal "undefined"
    // is worse than the ambiguity it was meant to fix.
    if (!isAmbiguous || !classroomName) {
      return { id: lesson.id, label: lesson.name };
    }
    return { id: lesson.id, label: `${lesson.name} — ${classroomName}` };
  });
}
