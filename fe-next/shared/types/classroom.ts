/**
 * The classroom results contract.
 *
 * Lives in `shared/` because the server builds it (backend/modules/classroomSummary)
 * and every client in the room renders it. Keeping one definition is what stops
 * the teacher's view and the students' view from drifting apart.
 */

import type { ClassroomTeam } from '../utils/teamBattle';

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

/**
 * SPED-friendly accessibility flags for a classroom game. Set by the teacher
 * in the setup wizard, stored on the classroom game, echoed here so every
 * client renders the same accommodations.
 */
export interface ClassroomAccessibility {
  /** Larger board/word typography on student devices. */
  largeText?: boolean;
  /** Sound cues nudged on for the room (student can still mute). */
  audioCues?: boolean;
  /** Flat bonus added to every human player's score. */
  participationPoints?: boolean;
}

/** Points every human player gets when participationPoints is on. */
export const PARTICIPATION_BONUS = 10;

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
  /** Present when the teacher ran a team battle: server-dealt rosters. */
  teamBattle?: { teamCount: number; teams: ClassroomTeam[] };
  /** Present when the SPED preset awarded a flat participation bonus. */
  participationBonus?: number;
  /** Echo of the room's accessibility flags (large type, audio cues). */
  accessibility?: ClassroomAccessibility;
}
