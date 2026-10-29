import type { Language } from '@/shared/types';
/** Classroom game record shapes (Redis `classroom_game:<code>`). */

import type { PracticeFocusSetting } from '@/lib/education/vocabFocus';
import type { ClassroomTeam } from '@/shared/utils/teamBattle';
import type { ClassroomSessionScores } from './classroomSessionScores';
import type { ClassroomBossId } from '@/shared/types/classroomBoss';

export interface ClassroomGamePlayer {
  userId: string;
  username: string;
  socketId: string;
  joinedAt?: string;
}

export interface ClassroomGameSettings {
  timerMinutes?: number;
  boardSize?: 'small' | 'medium' | 'large';
  allowLateJoin?: boolean;
  /** Teacher's padlock: no new seats while true. Never accepted at creation, so every session starts unlocked. */
  lobbyLocked?: boolean;
  /** `a:<authUserId>` / `g:<guestTokenHash>` of everyone seated when the lock went on. */
  lobbyLockedSeats?: string[];
  /**
   * `vocab-quiz` is a live 4-choice question round, not a board game. It is
   * deliberately absent from the canonical `GameMode` union in
   * shared/types/game.ts: a quiz has no letter grid, no submitted words and no
   * duplicate/rarity scoring, so widening that union would drag it into random
   * mode rolls, quick-play matchmaking and every board-engine mode branch.
   */
  gameMode?: 'classic' | 'blast' | 'word-hunt' | 'wheel-rush' | 'vocab-quiz' | 'wordcraft';
  vocabQuizVariant?: 'classic' | 'boss';
  /** Boss Battle v2: a classic board round fought against this boss. Absent = plain classic. */
  classroomBossId?: ClassroomBossId;
  /**
   * Word Hunt only: the lesson word the teacher pinned as the hunted target.
   * Empty/absent means "let the game pick". Re-validated against the lesson at
   * game start — never trusted from the socket payload alone.
   */
  targetWord?: string;
  /**
   * Vocab Quiz only: which skill to drill. `any` mixes what the lesson supports.
   * Typed off the shared builder's own union so a newly added focus cannot
   * silently fall out of the classroom settings.
   */
  vocabQuizFocus?: PracticeFocusSetting;
  /** Vocab Quiz only: questions in the round (capped by what the lesson can build). */
  vocabQuizQuestionCount?: number;
  /** Vocab Quiz only: seconds on each question's clock. */
  vocabQuizSeconds?: number;
  /** Vocab Quiz only: whether to enable treasure chests (Gold-Quest-style rewards). */
  treasureChestsEnabled?: boolean;
  /** Free-for-all or team battle (weekly teams / juegos en equipo). */
  playStyle?: 'ffa' | 'teams';
  /** Team count when playStyle === 'teams' (server clamps to 2-4). */
  teamCount?: number;
  /** SPED-friendly accommodations chosen in the setup wizard. */
  accessibility?: {
    largeText?: boolean;
    audioCues?: boolean;
    participationPoints?: boolean;
  };
  /** In-round economy switches (classroomEconomyStore). Absent = power-ups on, wrong-answer cost off. */
  economy?: { wrongAnswerCost?: boolean; powerUps?: boolean };
}

export interface ClassroomGame {
  gameCode: string;
  classroomId: string;
  teacherId: string;
  teacherName: string;
  lessonIds: string[];
  lessonNames: string[];
  vocabularyWords: string[];
  /** See CreateClassroomGameData.language. */
  language?: Language;
  /**
   * The subset of `vocabularyWords` the generated board actually carries,
   * written once at game start. Embedding is best-effort — placement is capped
   * at roughly one word per three cells and skips anything longer than the
   * board — so this is usually SMALLER than `vocabularyWords`. Absent until the
   * board exists; a support student's word bank falls back to the full lesson
   * list until then.
   */
  placedVocabulary?: string[];
  /** Set while `vocabularyWords` is narrowed for a replay; `pending` until that replay round starts. */
  reteach?: { fullVocabularyWords: string[]; fullTargetWord?: string; pending: boolean };
  settings: ClassroomGameSettings;
  players: ClassroomGamePlayer[];
  createdAt: string;
  startedAt?: string;
  /**
   * The ROUND clock. `'finished'` is written at the end of every round, not at
   * the end of the lesson, so it never means "this code is dead" — see
   * `classroomGameSession.ts`.
   */
  status: 'waiting' | 'playing' | 'finished' | 'ended';
  /** The SESSION clock: set once when the teacher ends the game. Terminal. */
  endedAt?: string;
  /**
   * Running per-student totals across every round of this session.
   *
   * The room in `gameStateManager` zeroes its scores on each rematch
   * (`resetScoresForNewRound`), so this record — which outlives the round — is
   * the only place a lesson-long total can live. See
   * `classroomSessionScores.ts` for why it has to exist at all.
   */
  sessionScores?: ClassroomSessionScores;
  /** Rounds this session has actually finished. 1 during the first results screen. */
  roundsPlayed?: number;
  /**
   * Team battle: the assignment dealt when this session's first team round
   * started, and reused by every round after it.
   *
   * `assignTeams` is stable for a fixed roster and violently unstable for a
   * growing one — it sorts and seeded-shuffles everybody, so one late arrival
   * re-deals the whole class. Recomputing per round was survivable while teams
   * appeared only on the results screen; the projector now paints them live, so
   * the deal has to be a stored fact. `reconcileTeams` extends it additively.
   */
  teams?: ClassroomTeam[];
}

export interface CreateClassroomGameData {
  gameCode: string;
  classroomId: string;
  teacherId: string;
  teacherName: string;
  lessonIds: string[];
  lessonNames: string[];
  vocabularyWords: string[];
  /** The round's deal + validation language (resolveClassroomGameLanguage). Absent on records made before it existed. */
  language?: Language;
  settings: ClassroomGameSettings;
}
