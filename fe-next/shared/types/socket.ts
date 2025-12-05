/**
 * Socket.IO Event Type Definitions
 * Defines all events between client and server
 */

import type {
  Language,
  LetterGrid,
  Avatar,
  GameUser,
  ActiveRoom,
  LeaderboardEntry,
  TournamentStanding,
  WordDetail
} from './game';

// ==================== Client → Server Events ====================

export interface ClientToServerEvents {
  // Game events
  createGame: (data: CreateGamePayload) => void;
  join: (data: JoinGamePayload) => void;
  startGame: (data: StartGamePayload) => void;
  startGameAck: (data: { messageId: string }) => void;
  endGame: () => void;
  resetGame: () => void;
  closeRoom: () => void;
  getActiveRooms: () => void;
  leaveRoom: (data: { gameCode: string; username: string }) => void;
  getWordsForBoard: (data: { language: Language; boardSize?: { rows: number; cols: number } }) => void;
  broadcastShufflingGrid: (data: { gridState: unknown }) => void;

  // Word events
  submitWord: (data: { word: string; comboLevel?: number }) => void;
  submitWordVote: (data: SubmitWordVotePayload) => void;
  submitPeerValidationVote: (data: { word: string; isValid: boolean; gameCode?: string }) => void;
  validateWords: (data: { validatedScores: unknown }) => void;

  // Chat events
  chatMessage: (data: { message: string; gameCode?: string }) => void;

  // Bot events
  addBot: (data: { difficulty?: string }) => void;
  removeBot: (data: { botId?: string; username?: string }) => void;
  getBots: () => void;

  // Tournament events
  createTournament: (data: { name: string; totalRounds: number }) => void;
  startTournamentRound: () => void;
  getTournamentStandings: () => void;
  cancelTournament: () => void;

  // Presence events
  ping: () => void;
  presenceUpdate: (data: { status: 'active' | 'idle' | 'afk' }) => void;
  presenceHeartbeat: () => void;

  // Host events
  hostKeepAlive: () => void;
  hostReactivate: () => void;
}

// ==================== Server → Client Events ====================

export interface ServerToClientEvents {
  // Connection events
  pong: () => void;
  rateLimited: () => void;
  error: (data: { message: string; code?: string }) => void;
  warning: (data: { type: string; message: string }) => void;
  sessionMigrated: (data: { message: string }) => void;
  sessionTakenOver: (data: { message: string; gameCode: string }) => void;

  // Game events
  joined: (data: JoinedPayload) => void;
  joinedAsSpectator: (data: JoinedAsSpectatorPayload) => void;
  updateUsers: (data: { users: GameUser[] }) => void;
  activeRooms: (data: { rooms: ActiveRoom[] }) => void;
  startGame: (data: StartGameBroadcast) => void;
  timeUpdate: (data: { remainingTime: number }) => void;
  gameOver: (data: GameOverPayload) => void;
  gameReset: (data: { users: GameUser[] }) => void;
  roomClosed: (data: Record<string, never>) => void;
  leftRoom: (data: { success: boolean }) => void;
  gridShuffling: (data: { gridState: unknown }) => void;

  // Word events
  wordsForBoard: (data: { words: string[] }) => void;
  wordAccepted: (data: WordAcceptedPayload) => void;
  wordRejected: (data: { word: string; reason: string }) => void;
  wordTooShort: (data: { word: string; minLength: number }) => void;
  wordAlreadyFound: (data: { word: string }) => void;
  wordNotOnBoard: (data: { word: string }) => void;
  wordNeedsValidation: (data: { word: string; message: string }) => void;
  wordValidatedByVotes: (data: { word: string; score: number; newTotalScore: number }) => void;
  wordBecameValid: (data: { word: string; language: string }) => void;
  voteRecorded: (data: { word: string; success: boolean; error?: string }) => void;

  // Leaderboard events
  updateLeaderboard: (data: { leaderboard: LeaderboardEntry[] }) => void;

  // Achievement events
  liveAchievementUnlocked: (data: { achievements: AchievementPayload[] }) => void;

  // Validation events
  showWordFeedback: (data: WordFeedbackPayload) => void;
  peerValidationRequest: (data: PeerValidationRequestPayload) => void;
  peerVoteRecorded: (data: PeerVoteRecordedPayload) => void;
  peerValidationResult: (data: PeerValidationResultPayload) => void;
  validationComplete: (data: { success: boolean }) => void;

  // Chat events
  chatMessage: (data: ChatMessagePayload) => void;

  // Bot events
  botAdded: (data: BotAddedPayload) => void;
  botRemoved: (data: { success: boolean; botId: string; username: string }) => void;
  botsList: (data: { bots: BotInfo[] }) => void;

  // Tournament events
  tournamentCreated: (data: TournamentCreatedPayload) => void;
  tournamentRoundStarting: (data: TournamentRoundPayload) => void;
  tournamentRoundCompleted: (data: TournamentRoundPayload) => void;
  tournamentComplete: (data: TournamentCompletePayload) => void;
  tournamentCancelled: (data: { message: string }) => void;
  tournamentStandings: (data: TournamentStandingsPayload) => void;
  tournamentInfo: (data: TournamentInfoPayload) => void;
  tournamentPlayerJoined: (data: { username: string; standings: TournamentStanding[] }) => void;

  // Presence events
  userPresenceChanged: (data: { username: string; status: string; timestamp: number }) => void;
  playerDisconnected: (data: { username: string; message: string }) => void;
  playerReconnected: (data: { username: string }) => void;
  playerLeft: (data: { username: string; message: string }) => void;
  hostDisconnected: (data: { message: string; gracePeriodMs: number }) => void;
  hostLeftRoomClosing: (data: { message: string }) => void;
  hostReactivated: (data: { success: boolean }) => void;
}

// ==================== Payload Types ====================

export interface CreateGamePayload {
  gameCode: string;
  roomName?: string;
  language?: Language;
  hostUsername?: string;
  playerId?: string;
  avatar?: Avatar;
  authUserId?: string;
  guestTokenHash?: string;
  isRanked?: boolean;
  profilePictureUrl?: string;
}

export interface JoinGamePayload {
  gameCode: string;
  username: string;
  playerId?: string;
  avatar?: Avatar;
  authUserId?: string;
  guestTokenHash?: string;
  profilePictureUrl?: string;
}

export interface StartGamePayload {
  letterGrid: LetterGrid;
  timerSeconds: number;
  language?: Language;
  minWordLength?: number;
}

export interface JoinedPayload {
  success: boolean;
  gameCode: string;
  isHost: boolean;
  username: string;
  roomName: string;
  language: Language;
  users: GameUser[];
  reconnected?: boolean;
}

export interface JoinedAsSpectatorPayload {
  success: boolean;
  gameCode: string;
  spectator: boolean;
  roomName: string;
  language: Language;
}

export interface StartGameBroadcast {
  letterGrid?: LetterGrid;
  timerSeconds: number;
  language?: Language;
  minWordLength?: number;
  messageId?: string;
  reconnect?: boolean;
  lateJoin?: boolean;
  skipAck?: boolean;
}

export interface WordAcceptedPayload {
  word: string;
  score: number;
  baseScore: number;
  comboBonus: number;
  comboLevel: number;
  autoValidated: boolean;
}

export interface AchievementPayload {
  key: string;
  icon: string;
}

export interface GameOverPayload {
  scores: PlayerResultPayload[];
  letterGrid: LetterGrid | null;
}

export interface PlayerResultPayload {
  username: string;
  totalScore: number;
  wordDetails: WordDetail[];
  achievements: AchievementPayload[];
  titles: string[];
  avatar: Avatar;
}

export interface SubmitWordVotePayload {
  word: string;
  voteType: 'valid' | 'invalid';
  gameCode?: string;
  submittedBy?: string;
  isBot?: boolean;
}

export interface WordFeedbackPayload {
  word: string;
  submittedBy: string;
  submitterAvatar?: Avatar;
  voteInfo?: { upvotes: number; downvotes: number };
  wordQueue: Array<{
    word: string;
    submittedBy: string;
    submitterAvatar?: Avatar;
    voteInfo?: { upvotes: number; downvotes: number };
  }>;
  timeoutSeconds: number;
  gameCode: string;
  language: string;
}

export interface PeerValidationRequestPayload {
  word: string;
  submittedBy: string;
  submitterAvatar?: Avatar;
  confidence: number;
  timeoutSeconds: number;
  gameCode: string;
  language: string;
}

export interface PeerVoteRecordedPayload {
  word: string;
  success: boolean;
  totalVotes?: number;
  invalidVotes?: number;
  error?: string;
}

export interface PeerValidationResultPayload {
  word: string;
  submitter: string;
  rejected: boolean;
  invalidVotes: number;
  validVotes: number;
  scoreRemoved: number;
}

export interface ChatMessagePayload {
  username: string;
  message: string;
  timestamp: number;
  isHost: boolean;
}

export interface BotInfo {
  id: string;
  username: string;
  difficulty: string;
  avatar: Avatar;
}

export interface BotAddedPayload {
  success: boolean;
  bot: BotInfo;
}

export interface TournamentInfo {
  id: string;
  name: string;
  totalRounds: number;
  currentRound: number;
  status: string;
}

export interface TournamentCreatedPayload {
  tournament: TournamentInfo;
  standings: TournamentStanding[];
}

export interface TournamentRoundPayload {
  tournament: TournamentInfo;
  standings: TournamentStanding[];
}

export interface TournamentCompletePayload {
  tournament: TournamentInfo & { status: 'completed' };
  standings: TournamentStanding[];
}

export interface TournamentStandingsPayload {
  tournament: TournamentInfo | null;
  standings: TournamentStanding[];
}

export interface TournamentInfoPayload {
  tournament: TournamentInfo;
  standings: TournamentStanding[];
}
