/**
 * HostView props and the payload shapes it receives (moved out of HostView
 * so its phase hooks can share them).
 */
import type { Language } from '@/types';
import type { GameMode } from '@/shared/types/game';
import type { ClassroomGameMode } from '@/shared/types/vocabQuiz';
import type { Player } from './hooks';
import type { ClassroomLiveContext } from '@/shared/utils/classroomLiveContext';
// ==========================================
// Props
// ==========================================

export interface GameStartData {
  letterGrid: string[][];
  timerSeconds: number;
  language: Language;
  minWordLength?: number;
  messageId?: string;
}



export interface LessonData {
  lessonId: string;
  lessonName: string;
  vocabularyWords: string[];
  language: Language;
  /** Teacher's chosen game mode from ClassroomGameLobby; seeds the host selector. */
  gameMode?: GameMode;
  templateSettings?: {
    timerSeconds: number;
    difficulty: string;
    minWordLength: number;
    allowLateJoin: boolean;
  } | null;
}

export interface HostViewProps {
  gameCode: string;
  roomLanguage?: Language;
  initialPlayers?: Player[];
  username: string;
  onShowResults: (data: unknown) => void;
  /** Pending game start data from page-level socket handler (for host returning from results) */
  pendingGameStart?: GameStartData | null;
  /** Callback when pending game start has been consumed */
  onGameStartConsumed?: () => void;
  /** Lesson data for vocabulary-based games started from teacher dashboard */
  lessonData?: LessonData | null;
  /**
   * What the class is playing this round, off the `startGame` payload — lesson,
   * round number, format, team rosters. The projector is the teacher's only
   * live surface, and until 2026-09-16 it received none of this.
   */
  classroomLive?: ClassroomLiveContext | null;
  /** Callback when host changes their display name */
  onUsernameChange?: (newName: string) => void;
  /** Quick Play: auto-start solo game immediately after room join */
  autoStart?: boolean;
  /** Private rooms (Quick Play / classroom) hide invite + share affordances. */
  isPrivate?: boolean;
  /** Quick Play: auto-fill bots + start the moment the lobby mounts. */
  isQuickPlay?: boolean;
  /** SPA reset to lobby (no reload) — see useHostGameActions.onExitToLobby. */
  onExitToLobby?: () => void;
  /** Room was opened from the teacher dashboard (`?classroom=true`). */
  isClassroomMode?: boolean;
  /**
   * Mode the teacher fixed in the setup wizard, read from the live classroom
   * game record (Redis). That record is written when the room is created, so on
   * the teacher's own first moments the lookup can still 404 — hence the
   * `lessonData` fallback below, which is the same source `ClassroomModeBanner`
   * prefers. `LessonData.gameMode` is typed `GameMode` here and cannot carry
   * `vocab-quiz`, so neither source alone is sufficient.
   */
  classroomGameMode?: ClassroomGameMode;
}
