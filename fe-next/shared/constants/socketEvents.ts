/**
 * Socket Event Constants
 * Shared between frontend and backend to ensure consistency
 */

// ==================== Client → Server Events ====================

export const CLIENT_EVENTS = {
  // Game Lifecycle
  CREATE_GAME: 'createGame',
  JOIN: 'join',
  LEAVE_ROOM: 'leaveRoom',
  START_GAME: 'startGame',
  START_GAME_ACK: 'startGameAck',
  RESET_GAME: 'resetGame',
  CLOSE_ROOM: 'closeRoom',
  GET_WORDS_FOR_BOARD: 'getWordsForBoard',

  // Word Submission
  SUBMIT_WORD: 'submitWord',
  VALIDATE_WORDS: 'validateWords',
  SUBMIT_WORD_VOTE: 'submitWordVote',
  SUBMIT_PEER_VALIDATION_VOTE: 'submitPeerValidationVote',

  // Chat
  SEND_CHAT_MESSAGE: 'sendChatMessage',

  // Bot Management
  ADD_BOT: 'addBot',
  REMOVE_BOT: 'removeBot',

  // Tournament
  CREATE_TOURNAMENT: 'createTournament',
  START_TOURNAMENT_ROUND: 'startTournamentRound',
  CANCEL_TOURNAMENT: 'cancelTournament',

  // Presence
  HEARTBEAT: 'heartbeat',
  PRESENCE_UPDATE: 'presenceUpdate',
  WINDOW_FOCUS_CHANGE: 'windowFocusChange',

  // Host Actions
  KICK_PLAYER: 'kickPlayer',
  TRANSFER_HOST: 'transferHost',
  UPDATE_GAME_SETTINGS: 'updateGameSettings',

  // Rooms
  GET_ACTIVE_ROOMS: 'getActiveRooms',

  // Reconnection
  RECONNECT: 'reconnect',
} as const;

// ==================== Server → Client Events ====================

export const SERVER_EVENTS = {
  // Connection
  JOINED: 'joined',
  ERROR: 'error',
  RATE_LIMITED: 'rateLimited',
  WARNING: 'warning',
  SERVER_SHUTDOWN: 'serverShutdown',

  // Game State
  UPDATE_USERS: 'updateUsers',
  START_GAME: 'startGame',
  END_GAME: 'endGame',
  RESET_GAME: 'resetGame',
  TIME_UPDATE: 'timeUpdate',
  SHUFFLING_GRID_UPDATE: 'shufflingGridUpdate',
  WORDS_FOR_BOARD: 'wordsForBoard',

  // Word Responses
  WORD_ACCEPTED: 'wordAccepted',
  WORD_REJECTED: 'wordRejected',
  WORD_ALREADY_FOUND: 'wordAlreadyFound',
  WORD_NOT_ON_BOARD: 'wordNotOnBoard',
  WORD_TOO_SHORT: 'wordTooShort',
  WORD_NEEDS_VALIDATION: 'wordNeedsValidation',
  WORD_VALIDATING_WITH_AI: 'wordValidatingWithAI',
  WORD_BECAME_VALID: 'wordBecameValid',
  VALIDATION_COMPLETE: 'validationComplete',

  // Scores & Leaderboard
  UPDATE_LEADERBOARD: 'updateLeaderboard',
  LEADERBOARD_UPDATE: 'leaderboardUpdate',
  VALIDATED_SCORES: 'validatedScores',
  FINAL_SCORES: 'finalScores',

  // Achievements & XP
  LIVE_ACHIEVEMENT_UNLOCKED: 'liveAchievementUnlocked',
  ACHIEVEMENT_UNLOCKED: 'achievementUnlocked',
  XP_GAINED: 'xpGained',
  LEVEL_UP: 'levelUp',

  // Chat
  CHAT_MESSAGE: 'chatMessage',
  CHAT_HISTORY: 'chatHistory',

  // Word Feedback / Voting
  SHOW_WORD_FEEDBACK: 'showWordFeedback',
  NO_WORD_FEEDBACK: 'noWordFeedback',
  VOTE_RECORDED: 'voteRecorded',
  PEER_VOTE_RECORDED: 'peerVoteRecorded',

  // Presence
  PLAYER_PRESENCE_UPDATE: 'playerPresenceUpdate',
  PLAYER_DISCONNECTED: 'playerDisconnected',
  PLAYER_RECONNECTED: 'playerReconnected',
  PLAYER_CONNECTION_STATUS_CHANGED: 'playerConnectionStatusChanged',
  PLAYER_LEFT: 'playerLeft',
  PLAYER_JOINED_LATE: 'playerJoinedLate',
  PLAYER_FOUND_WORD: 'playerFoundWord',

  // Host Events
  HOST_DISCONNECTED: 'hostDisconnected',
  HOST_TRANSFERRED: 'hostTransferred',
  HOST_LEFT_ROOM_CLOSING: 'hostLeftRoomClosing',

  // Session Management
  SESSION_TAKEN_OVER: 'sessionTakenOver',
  SESSION_MIGRATED: 'sessionMigrated',

  // Bot Events
  BOT_ADDED: 'botAdded',
  BOT_REMOVED: 'botRemoved',

  // Tournament
  TOURNAMENT_CREATED: 'tournamentCreated',
  TOURNAMENT_ROUND_STARTING: 'tournamentRoundStarting',
  TOURNAMENT_ROUND_COMPLETED: 'tournamentRoundCompleted',
  TOURNAMENT_COMPLETE: 'tournamentComplete',
  TOURNAMENT_CANCELLED: 'tournamentCancelled',

  // Rooms
  ACTIVE_ROOMS: 'activeRooms',
} as const;

// ==================== Type Helpers ====================

export type ClientEvent = typeof CLIENT_EVENTS[keyof typeof CLIENT_EVENTS];
export type ServerEvent = typeof SERVER_EVENTS[keyof typeof SERVER_EVENTS];

// All events combined for validation
export const ALL_EVENTS = {
  ...CLIENT_EVENTS,
  ...SERVER_EVENTS,
} as const;
