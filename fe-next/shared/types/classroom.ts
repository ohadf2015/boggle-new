/**
 * The classroom results contract.
 *
 * Lives in `shared/` because the server builds it (backend/modules/classroomSummary)
 * and every client in the room renders it. Keeping one definition is what stops
 * the teacher's view and the students' view from drifting apart.
 */

export interface ClassroomWordCoverage {
  /** The lesson word as the teacher entered it. */
  word: string;
  /** Usernames that found it, in the order the players were supplied. */
  foundBy: string[];
}

export interface ClassroomPlayerMastery {
  found: number;
  total: number;
}

export interface ClassroomSummary {
  teacherName: string;
  lessonNames: string[];
  /** Lesson ids, so results can deep-link the player into practice. */
  lessonIds: string[];
  /** Distinct lesson words in play. */
  totalWords: number;
  coverage: ClassroomWordCoverage[];
  /** Lesson words no one in the room found — the reteach list. */
  missedWords: string[];
  /** How many distinct lesson words the class found between them. */
  classFoundCount: number;
  masteryByPlayer: Record<string, ClassroomPlayerMastery>;
}
