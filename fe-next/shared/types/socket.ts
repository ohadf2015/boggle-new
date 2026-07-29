/**
 * Socket.IO Event Type Definitions
 * Defines all events between client and server
 */

import type {
  Language,
  LetterGrid,
  Avatar,
  GameUser,
  GameMode,
  ActiveRoom,
  LeaderboardEntry,
  TournamentStanding,
  WordDetail,
  BlastTileOverlay,
  LetterFeedback,
} from './game';

import type { BlastTileType } from './blast';

import type {
  SpamWarningPayload,
  SpamPenaltyPayload,
  SpamCooldownPayload,
  SpamCooldownEndPayload,
  WordBlockedByCooldownPayload
} from './spam';

import type {
  GenerateScoreCardRequest,
  GenerateScoreCardResponse
} from './scorecard';

// ==================== Client → Server Events ====================

export interface ClientToServerEvents {
  // Game events
  createGame: (data: CreateGamePayload) => void;
  join: (data: JoinGamePayload) => void;
  startGame: (data: StartGamePayload) => void;
  startGameAck: (data: { messageId: string }) => void;
  countdownComplete: (data: { messageId: string }) => void;
  lobbyAutoStartCancel: () => void;
  endGame: () => void;
  resetGame: () => void;
  closeRoom: () => void;
  getActiveRooms: () => void;
  leaveRoom: (data: { gameCode: string; username: string }) => void;
  getWordsForBoard: (data: { language: Language; boardSize?: { rows: number; cols: number } }) => void;
  broadcastShufflingGrid: (data: { gridState: unknown }) => void;

  // Word events
  submitWord: (data: { word: string; comboLevel?: number; comboType?: string | null }) => void;
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

  // Hint events (single-player mode)
  requestHint: () => void;

  // Engagement events
  'engagement:getDailyChallenges': (data: { playerId: string }) => void;
  'engagement:claimChallengeReward': (data: { playerId: string; challengeId: string }) => void;
  'engagement:getCalendarStatus': (data: { playerId: string }) => void;
  'engagement:claimCalendarReward': (data: { playerId: string }) => void;
  'engagement:getComebackStatus': (data: { playerId: string }) => void;
  'engagement:claimComebackBonus': (data: { playerId: string }) => void;
  'engagement:getStatus': (data: { playerId: string }) => void;
  'engagement:recordLogin': (data: { playerId: string }) => void;

  // Score card events
  'scorecard:generate': (data: GenerateScoreCardRequest) => void;

  // Spectator events
  upgradeToPlayer: (data: { gameCode: string }) => void;

  // Kick events
  kickPlayer: (data: { targetUsername: string }) => void;

  // TV mode events
  resultsRevealed: () => void;

  // Boost events
  // Legacy separate-emit path. Prefer bundling `boostToken` into startGame
  // (atomic registration); this event is kept for back-compat with older clients.
  'boost:apply': (data: { gameCode?: string; sessionId: string; token: string }) => void;
}

// ==================== Hint Types ====================

export interface HintPayload {
  hint: string;
  hintType: 'definition' | 'firstLetter' | 'length' | 'category';
  hintsRemaining: number;
  wordLength?: number;
  firstLetter?: string;
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
  wordsForBoard: (data: WordsForBoardPayload) => void;
  wordAccepted: (data: WordAcceptedPayload) => void;
  wordRejected: (data: { word: string; reason: string }) => void;
  wordTooShort: (data: { word: string; minLength: number }) => void;
  wordAlreadyFound: (data: { word: string }) => void;
  wordNotOnBoard: (data: { word: string }) => void;
  wordNeedsValidation: (data: { word: string; message: string }) => void;
  wordValidatedByVotes: (data: { word: string; score: number; newTotalScore: number }) => void;
  wordBecameValid: (data: { word: string; language: string }) => void;
  voteRecorded: (data: { word: string; success: boolean; error?: string }) => void;
  wordBlockedByCooldown: (data: WordBlockedByCooldownPayload) => void;

  // Spam detection events (private to player)
  spamWarning: (data: SpamWarningPayload) => void;
  spamPenalty: (data: SpamPenaltyPayload) => void;
  spamCooldown: (data: SpamCooldownPayload) => void;
  spamCooldownEnd: (data: SpamCooldownEndPayload) => void;

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

  // TV mode events
  resultsRevealed: (data: Record<string, never>) => void;

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
  hostDisconnected: (data: {
    message: string;
    gracePeriodMs: number;
    i18nKey?: string;
    i18nParams?: Record<string, string | number>;
  }) => void;
  hostLeftRoomClosing: (data: {
    message: string;
    i18nKey?: string;
    i18nParams?: Record<string, string | number>;
    reason?: 'explicit_no_successor' | 'grace_expired' | 'host_switched_room';
  }) => void;
  hostReactivated: (data: { success: boolean }) => void;
  // Audit T3 (2026-05-10): typed payload + i18n envelope. Server-side
  // `message` was English-only; clients now prefer `i18nKey`+`i18nParams`
  // via `resolveHostLeftMessage`, falling back to `message` for back-compat.
  hostTransferred: (data: {
    previousHost: string;
    newHost: string;
    message?: string;
    i18nKey?: string;
    i18nParams?: Record<string, string | number>;
  }) => void;

  // Hint events (single-player mode)
  hintResponse: (data: HintPayload) => void;
  hintError: (data: { message: string; code?: string }) => void;
  hintAvailable: (data: { available: boolean; hintsRemaining: number }) => void;

  // XP and Level events
  xpGained: (data: XpGainedPayload) => void;
  levelUp: (data: LevelUpPayload) => void;

  // Engagement events
  'engagement:dailyChallenges': (data: { challenges: DailyChallenge[] }) => void;
  'engagement:challengeProgress': (data: { progress: ChallengeProgress[] }) => void;
  'engagement:challengeCompleted': (data: { completed: CompletedChallenge[] }) => void;
  'engagement:rewardClaimed': (data: ChallengeRewardResult) => void;
  'engagement:loginResult': (data: LoginResult) => void;
  'engagement:calendarStatus': (data: CalendarStatus) => void;
  'engagement:calendarRewardClaimed': (data: CalendarRewardResult) => void;
  'engagement:comebackAvailable': (data: ComebackStatus) => void;
  'engagement:comebackStatus': (data: ComebackStatus) => void;
  'engagement:comebackClaimed': (data: ComebackClaimResult) => void;
  'engagement:nearMisses': (data: { nearMisses: NearMiss[] }) => void;
  'engagement:oneMoreGame': (data: { prompt: OneMoreGamePrompt }) => void;
  'engagement:mysteryReward': (data: { reward: MysteryReward }) => void;
  'engagement:referralMilestone': (data: { milestone: ReferralMilestone }) => void;
  'engagement:status': (data: EngagementStatus) => void;
  'engagement:error': (data: { message: string }) => void;

  // Score card events
  'scorecard:data': (data: GenerateScoreCardResponse) => void;
  'scorecard:error': (data: { message: string; code?: string }) => void;

  // Blast multiplayer events
  // Note: blastWordAccepted was merged into wordAccepted (see wordHandler.mergedEmits.test.ts)
  blastComboSync: (data: BlastComboSyncPayload) => void;

  // Spectator events
  spectatorUpgraded: (data: SpectatorUpgradedPayload) => void;
  spectatorList: (data: { spectators: GameUser[] }) => void;

  // Kick events
  kicked: (data: { reason: 'host' | 'inactive' }) => void;
  playerKicked: (data: { username: string; reason: 'host' | 'inactive' }) => void;

  // Game lifecycle events
  totalBoardWords: (data: { count: number }) => void;
  gameStarting: (data: { gameMode: string }) => void;
  validatedScores: (data: {
    scores?: unknown[];
    letterGrid?: unknown;
    duplicateRuleDisabled?: boolean;
    playerCount?: number;
    gameMode?: string;
    wordHuntSummary?: unknown;
    blastSummary?: unknown;
    wheelRushSummary?: unknown;
    reconnect?: boolean;
  }) => void;
  playing: (data: Record<string, never>) => void;
  finished: (data: Record<string, never>) => void;

  // Lobby / ready-up events
  playerListUpdate: (data: { users: unknown[] }) => void;
  playersReadyUpdate: (data: { readyCount: number; totalPlayers: number; readyUsernames: string[] }) => void;
  allPlayersReady: (data: { readyCount: number; totalPlayers: number }) => void;
  autoStartCountdown: (data: { remaining: number }) => void;
  autoStartCancelled: (data: Record<string, never>) => void;
  // Lobby auto-start: server-owned countdown that begins when every non-host
  // human marks ready, so a stalled host no longer blocks the game. Distinct
  // from the bot auto-fill `autoStart*` events above and from the post-start
  // 3-2-1 countdown.
  lobbyAutoStartTick: (data: { secondsLeft: number }) => void;
  lobbyAutoStartCancelled: (data: Record<string, never>) => void;
  lobbyAutoStartFire: (data: Record<string, never>) => void;

  // Word / room broadcast events
  playerFoundWord: (data: {
    username: string;
    word: string;
    wordCount: number;
    score: number;
    comboLevel: number;
    comboSync?: { comboType: string; username: string };
  }) => void;
  wordSubmit: (data: { word: string; username: string }) => void;
  roomCreate: (data: { gameCode: string; roomName: string }) => void;
  avatarUpdated: (data: { username: string; avatarImage?: unknown; customAvatar?: unknown }) => void;

  // Round events (monotonic breakers)
  roundEventWarning: (data: { eventType: string; gameSessionId?: number; timestamp: number }) => void;
  roundEventStart: (data: { eventType: string; gameSessionId?: number; duration: number; data?: Record<string, unknown> }) => void;
  roundEventEnd: (data: { eventType: string; gameSessionId?: number }) => void;

  // Special word found
  specialWordFound: (data: { word: string; foundBy: string; bonus: number; gameSessionId?: number }) => void;

  // Earthquake / Fire Round events
  fireRoundStart: (data: { gameSessionId?: string; grid: unknown[][]; duration: number }) => void;
  fireRoundEnd: (data: { gameSessionId?: string }) => void;
  earthquakeShake: (data: { gameSessionId?: string }) => void;
  earthquakeWarning: (data: { gameSessionId?: string; timestamp: number }) => void;

  // Engagement — daily missions & grand slam
  'engagement:dailyMissions': (data: { missions: unknown[] }) => void;
  'engagement:grandSlamClaimed': (data: { claimed: boolean; [key: string]: unknown }) => void;

  // Engagement — Word of the Day
  'engagement:wotd': (data: { word: string; language: string; [key: string]: unknown }) => void;
  'engagement:wotdRecorded': (data: { success?: boolean; found?: boolean; [key: string]: unknown }) => void;
  'engagement:wotdStats': (data: { stats?: unknown; [key: string]: unknown }) => void;

  // Party game events
  'party:gameUpdate': (data: Record<string, unknown>) => void;
  'party:phaseChange': (data: { phase: string; gameState?: unknown }) => void;
  'party:playerJoined': (data: { player: unknown }) => void;
  'party:playerLeft': (data: { socketId: string; username?: string }) => void;

  // Boost ack — server confirms a boost token was registered against the player's game.
  'boost:applied': (data: { success: boolean; boostType?: string }) => void;
}

// ==================== Payload Types ====================

// Board theme information for date-themed word generation
export interface BoardTheme {
  nameKey: string;   // Translation key for theme name (e.g., 'theme.christmas')
  emoji: string;     // Emoji to display with theme (e.g., '🎄')
  isHoliday: boolean; // True for holidays, false for day-of-week themes
}

export interface WordsForBoardPayload {
  words: string[];
  theme?: BoardTheme; // Theme info for display, optional for backward compatibility
}

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
  isPrivate?: boolean;
  isClassroom?: boolean;
}

export interface JoinGamePayload {
  gameCode: string;
  username: string;
  playerId?: string;
  avatar?: Avatar;
  authUserId?: string;
  guestTokenHash?: string;
}

export interface StartGamePayload {
  letterGrid: LetterGrid;
  timerSeconds: number;
  language?: Language;
  minWordLength?: number;
  gameMode?: GameMode;
  /** Optional boost token bundled with startGame (atomic boost registration). */
  boostToken?: string;
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
  /** True when joining a game already in progress (late join). Lets the client
   *  arm the lost-`startGame` recovery fallback, same as a reconnection. */
  gameInProgress?: boolean;
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
  gameMode?: GameMode;
  goldenLetters?: Array<{ row: number; col: number }>;
  /** Server's authoritative session id — required for reconnect/lateJoin so
   *  the client's timeUpdate session-id guard accepts subsequent ticks. */
  gameSessionId?: number;
}

export interface WordAcceptedPayload {
  word: string;
  score: number;
  baseScore: number;
  comboBonus: number;
  comboLevel: number;
  autoValidated: boolean;
  fireRoundActive?: boolean;
  fireRoundMultiplier?: number;
  fireRoundBonus?: number;
  goldenBonus?: number;
  isSpecialWord?: boolean;
  inputMethod?: 'kb' | 'drag';
  /** Merged blast data (Fix 2) — present when gameMode is blast */
  blast?: {
    tileBonus: number;
    tilesCleared: string[];
    movesUsed: number;
    bonusMove: boolean;
    comboType?: string | null;
  };
}

export interface AchievementPayload {
  key: string;
  icon: string;
  /** Achievement count for tier calculation (GOLD/PLATINUM cinematics) */
  count?: number;
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
  voteType: 'like' | 'dislike';
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

// ==================== XP and Level Types ====================

export interface XpBreakdown {
  gameCompletion: number;
  scoreXp: number;
  winBonus: number;
  achievementXp: number;
}

export interface XpGainedPayload {
  xpEarned: number;
  xpBreakdown: XpBreakdown;
  newTotalXp: number;
  newLevel: number;
}

export interface LevelUpPayload {
  oldLevel: number;
  newLevel: number;
  levelsGained: number;
  newTitles: string[];
}

// ==================== Engagement Types ====================

export interface DailyChallenge {
  id: string;
  type: string;
  title: string;
  description: string;
  target: number;
  current: number;
  tier: 'easy' | 'medium' | 'hard';
  xpReward: number;
  completed: boolean;
  claimed: boolean;
}

export interface ChallengeProgress {
  challengeId: string;
  current: number;
  target: number;
}

export interface CompletedChallenge {
  challengeId: string;
  type: string;
  title: string;
  xpReward: number;
}

export interface ChallengeRewardResult {
  success: boolean;
  reward?: {
    xp: number;
    totalXp: number;
    streakMultiplier: number;
  };
  error?: string;
}

export interface LoginResult {
  streak: number;
  streakBonus?: {
    xpMultiplier: number;
    badge?: string;
    title?: string;
    avatarFrame?: string;
  };
  milestoneReached?: number;
  nextMilestone?: number;
}

export interface CalendarStatus {
  currentDay: number;
  claimedDays: number[];
  todayClaimable: boolean;
  rewards: CalendarReward[];
}

export interface CalendarReward {
  day: number;
  type: 'xp' | 'badge' | 'title' | 'avatar_frame';
  value: string | number;
  claimed: boolean;
  isMilestone: boolean;
}

export interface CalendarRewardResult {
  success: boolean;
  reward?: {
    day: number;
    type: string;
    value: string | number;
  };
  error?: string;
}

export interface ComebackStatus {
  eligible: boolean;
  daysAway?: number;
  xpMultiplier?: number;
  expiresAt?: string;
}

export interface ComebackClaimResult {
  success: boolean;
  bonus?: {
    xpMultiplier: number;
    expiresAt: string;
  };
  error?: string;
}

export interface NearMiss {
  achievementKey: string;
  achievementTitle: string;
  current: number;
  target: number;
  percentComplete: number;
}

export interface OneMoreGamePrompt {
  type: string;
  message: string;
  incentive?: string;
}

export interface MysteryReward {
  type: 'xp' | 'badge' | 'title' | 'cosmetic';
  value: string | number;
  display: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
}

export interface ReferralMilestone {
  milestone: 'first_game_played' | 'five_games_played' | 'ten_games_played';
  referredUsername: string;
  rewardXp: number;
  message: string;
}

export interface EngagementStatus {
  streak: number;
  streakMultiplier: number;
  calendarDay: number;
  comebackEligible: boolean;
  dailyChallenges?: DailyChallenge[];
  challengeStats?: {
    completed: number;
    total: number;
  };
}

// ==================== Blast Multiplayer Types ====================

export interface BlastComboSyncPayload {
  comboType: string;
  username: string;
}

// ==================== Word Hunt Types ====================

export interface WordHuntLifeUpdatePayload {
  playerLives: Record<string, number>;
  eliminatedPlayers: string[];
}

export interface WordHuntTargetResultPayload {
  guess: string;
  feedback: LetterFeedback[];
  correct: boolean;
  isFirstFinder: boolean;
  bonus: number;
  livesRemaining: number;
}

export interface WordHuntTargetFoundPayload {
  username: string;
  targetWord: string;
  isFirstFinder: boolean;
}

export interface WordHuntEliminatedPayload {
  username: string;
}

// ==================== Spectator Types ====================

export interface SpectatorUpgradedPayload {
  success: boolean;
  username: string;
  users: GameUser[];
  isHost: boolean;
  lateJoin?: boolean;
}
