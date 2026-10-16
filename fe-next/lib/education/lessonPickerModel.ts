/**
 * Pure rules behind the lesson pickers (lobby + assignment creator).
 *
 * One game deals one board in one language, so a selection never mixes
 * languages: picking a list in another language starts a fresh selection.
 */

export interface PickerLessonLike {
  id: string;
  name: string;
  language?: string | null;
  words?: ReadonlyArray<{ word?: string | null } | null> | null;
}

/** Every unique non-blank word across `lessons`: the lobby's "playable" count, not the board's `canIntegrate` filter. */
export function playableLessonWords(lessons: readonly PickerLessonLike[]): string[] {
  const words = lessons.flatMap(
    (lesson) => lesson.words?.map((w) => w?.word).filter((w): w is string => !!w?.trim()) ?? []
  );
  return [...new Set(words)];
}

export function lessonWordCount(lesson: PickerLessonLike): number {
  return playableLessonWords([lesson]).length;
}

/** Class-language lessons first; the incoming order (newest first) is kept inside each language. */
export function sortLessonsForClass<T extends PickerLessonLike>(lessons: readonly T[], classLanguage: string | null | undefined): T[] {
  if (!classLanguage) return [...lessons];
  return [
    ...lessons.filter((l) => l.language === classLanguage),
    ...lessons.filter((l) => l.language !== classLanguage),
  ];
}

/** The first selected list's language is what launch sends as the board language. */
export function boardLanguageOf(selected: readonly PickerLessonLike[]): { language: string | null; mixed: boolean } {
  const language = selected[0]?.language ?? null;
  const mixed = selected.some((l) => (l.language ?? null) !== language);
  return { language, mixed };
}

export function toggleLessonInOneLanguage(
  lessons: readonly PickerLessonLike[],
  selectedIds: readonly string[],
  toggledId: string
): { ids: string[]; switchedTo: string | null } {
  if (selectedIds.includes(toggledId)) {
    return { ids: selectedIds.filter((id) => id !== toggledId), switchedTo: null };
  }
  const toggled = lessons.find((l) => l.id === toggledId);
  const current = lessons.find((l) => selectedIds.includes(l.id));
  const differs = !!current && !!toggled?.language && !!current.language && toggled.language !== current.language;
  if (differs) return { ids: [toggledId], switchedTo: toggled.language ?? null };
  return { ids: [...selectedIds, toggledId], switchedTo: null };
}

/** The language "Select all" acts on: the selection's, else the class's (if it has lists), else the first list's. */
export function activeLanguageOf(
  lessons: readonly PickerLessonLike[],
  selectedIds: readonly string[],
  classLanguage: string | null | undefined
): string | null {
  const selected = lessons.find((l) => selectedIds.includes(l.id));
  if (selected) return selected.language ?? null;
  if (classLanguage && lessons.some((l) => l.language === classLanguage)) return classLanguage;
  return lessons[0]?.language ?? null;
}
