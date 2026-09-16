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

/** One row of the whole-session leaderboard. */
export interface ClassroomSessionStanding {
  username: string;
  /** Summed across every round this student played. */
  totalScore: number;
  roundsPlayed: number;
  rank: number;
}

/** One plinth on the end-of-game podium. */
export interface ClassroomPodiumEntry {
  username: string;
  score: number;
  /** 1, 2 or 3 — the server's ranking, never recomputed on a client. */
  rank: number;
  /** Lesson words this player found; absent for a player with no mastery row. */
  wordsFound?: number;
  totalWords?: number;
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
  /**
   * Present when the teacher ran a team battle: server-dealt rosters, plus the
   * per-student totals the team panel sums.
   *
   * `scores` is the LESSON total, not the round's, and it is here rather than
   * left to the client because the two surfaces that render teams have
   * different data: the student's results page holds the full score list, the
   * projector holds only the top-three `podium`. Summing a top three into a
   * team total is simply wrong, and it is the kind of wrong that looks
   * plausible on screen.
   */
  teamBattle?: {
    teamCount: number;
    teams: ClassroomTeam[];
    scores?: Array<{ username: string; score: number }>;
  };
  /** Present when the SPED preset awarded a flat participation bonus. */
  participationBonus?: number;
  /** Echo of the room's accessibility flags (large type, audio cues). */
  accessibility?: ClassroomAccessibility;
  /**
   * Top human finishers, best first. Server-built so the projector, the
   * teacher's laptop and every student phone celebrate the same three names.
   */
  podium?: ClassroomPodiumEntry[];
  /**
   * The LESSON's standings — every student, summed across every round played.
   *
   * The podium above is one round; a rematch zeroes the room's scores, so after
   * round two the podium answers "who won that round" and nothing answered "who
   * won today". A teacher running three rounds in a period had no way to tell
   * her class who had actually won (reported 2026-09-14). Absent on a
   * single-round session, where the podium already IS the answer.
   */
  sessionStandings?: ClassroomSessionStanding[];
  /** Rounds finished in this session. Absent or 1 on the first results screen. */
  roundsPlayed?: number;
  /**
   * Subset of `missedWords` the board generator never actually embedded, so
   * results can say "the class never saw these" instead of blaming the class.
   * Absent when the placed list is unknown — then all misses read as misses.
   * `missedWords` stays whole: a reteach round should still cover these.
   */
  neverPlacedWords?: string[];
}
