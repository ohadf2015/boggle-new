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

/**
 * The `lessonGameData` sessionStorage payload, as written by ClassroomGameLobby
 * and read back by useMultiplayerSession. Declared here so the reteach round
 * can rebuild it without re-importing the lobby.
 */
export interface LessonGameData {
  lessonId: string;
  lessonName: string;
  vocabularyWords: string[];
  language?: string;
  gameMode?: string;
  targetWord?: string;
  templateSettings?: {
    timerSeconds: number;
    difficulty: string;
    minWordLength: number;
    allowLateJoin: boolean;
  } | null;
}

/** The slice of the server-built classroom summary a reteach round needs. */
export interface ReteachSource {
  /** Lesson words no one in the room found — the entire reteach vocabulary. */
  missedWords: string[];
  lessonIds: string[];
  lessonNames: string[];
}

/**
 * Build the lesson payload for a reteach round: the same lesson, narrowed to
 * only the words the class missed.
 *
 * `previous` is the payload of the round just played (the teacher's own
 * sessionStorage), so the reteach inherits their mode, timer, and board size
 * instead of resetting to defaults. It may be null (cleared storage, legacy
 * deeplink) — then the summary's ids/names are the fallback.
 *
 * Returns null when there is nothing to reteach, or when the result would
 * fail the session reader's own validation (missing lessonId/lessonName) —
 * staging such a payload would silently re-run the FULL lesson, which is the
 * exact bug this channel exists to prevent.
 */
export function buildReteachLessonData(
  previous: Partial<LessonGameData> | null,
  summary: ReteachSource
): LessonGameData | null {
  if (!summary.missedWords || summary.missedWords.length === 0) return null;

  const base = previous && typeof previous === 'object' ? previous : {};
  const lessonId = base.lessonId || summary.lessonIds.join(',');
  const lessonName = base.lessonName || summary.lessonNames.join(', ');
  if (!lessonId || !lessonName) return null;

  return {
    ...base,
    lessonId,
    lessonName,
    vocabularyWords: summary.missedWords,
    // A Word Hunt target pinned for the full lesson may be a word the class
    // already found — on a reteach board let the game choose.
    targetWord: '',
  };
}
