import type { ClassroomGameMode } from '@/shared/types/vocabQuiz';

/**
 * What `/api/education/classroom/live-game` tells a client about a live
 * classroom room.
 *
 * The teacher's own browser knows all of this from `lessonGameData` in its
 * sessionStorage. Nobody else does — which is why a student's classroom lobby
 * rendered Classic defaults over a Vocab Quiz and a heading that said
 * "Classroom Session" rather than the class's name.
 *
 * Types only, so both the route and the client hook can name the same shape
 * without the client pulling a server module into its bundle.
 */
export interface LiveClassroomGameSettingsInfo {
  timerMinutes: number | null;
  boardSize: 'small' | 'medium' | 'large' | null;
  allowLateJoin: boolean;
  vocabQuizQuestionCount: number | null;
  vocabQuizSeconds: number | null;
}

export interface LiveClassroomGameInfo {
  gameCode: string;
  classroomId: string;
  /** Null when the server could not resolve it — fall back to the generic label. */
  classroomName: string | null;
  lessonNames: string[];
  gameMode: ClassroomGameMode;
  settings: LiveClassroomGameSettingsInfo;
}
