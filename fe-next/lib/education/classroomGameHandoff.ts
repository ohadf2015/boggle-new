/**
 * Classroom → multiplayer handoff contract.
 *
 * One module owns BOTH ends of the channel so they cannot drift apart again:
 * the URL the teacher's lobby navigates to, and the predicate the multiplayer
 * session uses to decide whether to rehydrate `lessonGameData` from
 * sessionStorage. When these lived in two files the read was gated on
 * `?fromLesson=true`, which no caller ever set — the teacher's vocabulary and
 * chosen game mode were written and silently discarded.
 */

/** The URL ClassroomGameLobby sends the teacher to after the room is created. */
export function classroomMultiplayerPath(locale: string, gameCode: string): string {
  return `/${locale}/multiplayer?room=${gameCode}&classroom=true&host=true`;
}

/**
 * Whether this multiplayer entry carries a teacher-launched lesson.
 *
 * Deliberately NOT ungated: `lessonGameData` outlives the tab's classroom game
 * when the teacher leaves without passing through results, so a casual room
 * opened afterwards would inherit the class vocabulary.
 */
export function shouldLoadLessonData(search: string): boolean {
  const params = new URLSearchParams(search);
  return params.get('classroom') === 'true' || params.get('fromLesson') === 'true';
}
