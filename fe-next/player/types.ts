import type { LetterGrid, Language, Avatar } from '@/types';

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
}
