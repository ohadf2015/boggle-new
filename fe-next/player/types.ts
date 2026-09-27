import type { LetterGrid, Language, Avatar } from '@/types';
import type { ClassroomGameMode } from '@/shared/types/vocabQuiz';

export interface Player {
  username: string;
  avatar?: Avatar;
  isHost?: boolean;
  isBot?: boolean;
  presence?: 'active' | 'idle' | 'afk';
  disconnected?: boolean;
}

export interface PendingGameStart {
  letterGrid?: LetterGrid;
  timerSeconds?: number;
  language?: Language;
  minWordLength?: number;
  messageId?: string;
}

export interface WordToVote {
  word: string;
  submittedBy: string;
  submitterAvatar?: {
    emoji?: string;
    color?: string;
  };
  timeoutSeconds: number;
  gameCode: string;
  language: string;
}

export interface PlayerViewProps {
  onShowResults: (data: unknown) => void;
  initialPlayers?: Player[];
  username: string;
  gameCode: string;
  pendingGameStart?: PendingGameStart | null;
  onGameStartConsumed?: () => void;
  roomLanguage?: Language | null;
  onUsernameChange?: (newName: string) => void;
  seriesRoundNumber?: number;
  /** SPA reset to lobby (no reload) — see usePlayerExit.onExitToLobby. */
  onExitToLobby?: () => void;
  /** This room belongs to a teacher's class — suppresses the host's share/invite chrome. */
  isClassroomMode?: boolean;
  /** The mode the teacher locked in, from the room's own record (not the lobby store). */
  classroomGameMode?: ClassroomGameMode;
}
