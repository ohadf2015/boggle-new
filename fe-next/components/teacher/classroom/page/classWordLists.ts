interface ListLike {
  id: string;
  name: string;
  classroom_id: string | null;
  updated_at: string;
  words: readonly unknown[];
}

interface AssignmentLike {
  lesson_id: string;
  created_at: string;
  vocabulary_lessons?: ListLike | null;
}

export interface ClassWordList {
  id: string;
  name: string;
  wordCount: number;
}

/** A class's word lists: assigned ones (starter packs land here) plus lists saved to the class, once each, newest first. */
export function classWordLists(assignments: readonly AssignmentLike[], lessons: readonly ListLike[], classroomId: string): ClassWordList[] {
  const own = new Map(lessons.map((l) => [l.id, l]));
  const seen = new Map<string, { list: ClassWordList; at: string }>();
  for (const a of assignments) {
    const l = a.vocabulary_lessons ?? own.get(a.lesson_id);
    if (!l || seen.has(l.id)) continue;
    seen.set(l.id, { list: { id: l.id, name: l.name, wordCount: l.words.length }, at: a.created_at });
  }
  for (const l of lessons) {
    if (l.classroom_id !== classroomId || seen.has(l.id)) continue;
    seen.set(l.id, { list: { id: l.id, name: l.name, wordCount: l.words.length }, at: l.updated_at });
  }
  return [...seen.values()].sort((a, b) => b.at.localeCompare(a.at)).map((e) => e.list);
}
