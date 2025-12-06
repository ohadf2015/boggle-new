/**
 * Socket Event Validation
 * CommonJS bridge for shared Zod schemas
 *
 * This module imports schemas from the shared TypeScript module and provides
 * CommonJS exports for use in the backend handlers.
 *
 * IMPORTANT: All schema definitions live in shared/schemas/socketSchemas.ts
 * Do not add duplicate schemas here - add them to the shared module instead.
 */

const { z } = require('zod');

// ==================== Base Schemas ====================
// Re-implemented in JS for Node.js compatibility (mirrors shared/schemas/socketSchemas.ts)

const languageSchema = z.enum(['he', 'en', 'sv', 'ja', 'es', 'fr', 'de']);

const avatarSchema = z.object({
  emoji: z.string().max(10),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  profilePictureUrl: z.string().url().nullable().optional(),
}).optional();

const gameCodeSchema = z.string()
  .min(4, 'Game code must be at least 4 characters')
  .max(10, 'Game code must be at most 10 characters')
  .regex(/^[A-Za-z0-9]+$/, 'Game code must be alphanumeric');

const usernameSchema = z.string()
  .min(1, 'Username is required')
  .max(30, 'Username must be at most 30 characters')
  .regex(/^[a-zA-Z0-9_\-\u0590-\u05FF\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\s]+$/)
  .transform(s => s.trim());

const wordSchema = z.string()
  .min(1, 'Word is required')
  .max(50, 'Word must be at most 50 characters')
  .transform(s => s.trim());

const gridPositionSchema = z.object({
  row: z.number().int().min(0).max(10),
  col: z.number().int().min(0).max(10),
  letter: z.string().optional(),
});

const difficultySchema = z.enum(['EASY', 'MEDIUM', 'HARD']);

const botDifficultySchema = z.enum(['easy', 'medium', 'hard']);

const presenceStatusSchema = z.enum(['active', 'idle', 'afk']);

// ==================== Client → Server Event Schemas ====================

const createGameSchema = z.object({
  gameCode: gameCodeSchema,
  roomName: z.string().max(50).optional(),
  language: languageSchema.optional().default('en'),
  hostUsername: usernameSchema.optional(),
  playerId: z.string().max(64).optional().nullable(),
  avatar: avatarSchema,
  authUserId: z.string().uuid().optional().nullable(),
  guestTokenHash: z.string().max(128).optional().nullable(),
  isRanked: z.boolean().optional().default(false),
  profilePictureUrl: z.string().url().optional().nullable(),
});

const joinGameSchema = z.object({
  gameCode: gameCodeSchema,
  username: usernameSchema,
  playerId: z.string().max(64).optional().nullable(),
  avatar: avatarSchema,
  authUserId: z.string().uuid().optional().nullable(),
  guestTokenHash: z.string().max(128).optional().nullable(),
  profilePictureUrl: z.string().url().optional().nullable(),
});

const leaveRoomSchema = z.object({
  gameCode: gameCodeSchema,
  username: usernameSchema,
});

const startGameSchema = z.object({
  gameCode: gameCodeSchema.optional(),
  letterGrid: z.array(z.array(z.string())),
  timerSeconds: z.number().int().min(30).max(600).optional().default(180),
  language: languageSchema.optional(),
  difficulty: difficultySchema.optional().default('MEDIUM'),
  minWordLength: z.number().int().min(2).max(5).optional().default(3),
});

const startGameAckSchema = z.object({
  messageId: z.string().min(1),
});

const submitWordSchema = z.object({
  gameCode: gameCodeSchema.optional(),
  username: usernameSchema.optional(),
  word: wordSchema,
  path: z.array(gridPositionSchema).optional(),
  comboLevel: z.number().int().min(0).max(10).optional(),
});

const submitWordVoteSchema = z.object({
  gameCode: gameCodeSchema.optional(),
  word: wordSchema,
  voteType: z.enum(['valid', 'invalid']).optional(),
  isValid: z.boolean().optional(),
  language: languageSchema.optional(),
  submittedBy: usernameSchema.optional(),
  isBot: z.boolean().optional(),
});

const submitPeerValidationVoteSchema = z.object({
  gameCode: gameCodeSchema.optional(),
  word: wordSchema,
  isValid: z.boolean(),
});

const chatMessageSchema = z.object({
  gameCode: gameCodeSchema.optional(),
  username: usernameSchema.optional(),
  message: z.string().min(1).max(500),
});

const addBotSchema = z.object({
  gameCode: gameCodeSchema.optional(),
  difficulty: botDifficultySchema.optional().default('medium'),
});

const removeBotSchema = z.object({
  gameCode: gameCodeSchema.optional(),
  botId: z.string().optional(),
  botUsername: usernameSchema.optional(),
  username: usernameSchema.optional(),
});

const heartbeatSchema = z.object({
  gameCode: gameCodeSchema.optional(),
  username: usernameSchema.optional(),
  timestamp: z.number().optional(),
});

const presenceUpdateSchema = z.object({
  gameCode: gameCodeSchema.optional(),
  username: usernameSchema.optional(),
  status: presenceStatusSchema.optional(),
  isWindowFocused: z.boolean().optional(),
  lastActivityAt: z.number().optional(),
});

const windowFocusChangeSchema = z.object({
  gameCode: gameCodeSchema.optional(),
  isFocused: z.boolean(),
});

const kickPlayerSchema = z.object({
  gameCode: gameCodeSchema,
  username: usernameSchema,
});

const transferHostSchema = z.object({
  gameCode: gameCodeSchema,
  newHostUsername: usernameSchema,
});

const createTournamentSchema = z.object({
  gameCode: gameCodeSchema.optional(),
  name: z.string().min(1).max(100),
  totalRounds: z.number().int().min(2).max(10).default(3),
  settings: z.object({
    timerSeconds: z.number().int().min(30).max(600).optional(),
    difficulty: difficultySchema.optional(),
    minWordLength: z.number().int().min(2).max(5).optional(),
  }).optional(),
});

const getWordsForBoardSchema = z.object({
  language: languageSchema,
  boardSize: z.object({
    rows: z.number().int().min(3).max(10),
    cols: z.number().int().min(3).max(10),
  }).optional(),
});

const resetGameSchema = z.object({
  gameCode: gameCodeSchema.optional(),
});

const closeRoomSchema = z.object({
  gameCode: gameCodeSchema,
});

const reconnectSchema = z.object({
  gameCode: gameCodeSchema,
  username: usernameSchema,
  authUserId: z.string().uuid().optional().nullable(),
  guestTokenHash: z.string().max(128).optional().nullable(),
});

const updateGameSettingsSchema = z.object({
  gameCode: gameCodeSchema,
  settings: z.object({
    timerSeconds: z.number().int().min(30).max(600).optional(),
    difficulty: difficultySchema.optional(),
    minWordLength: z.number().int().min(2).max(5).optional(),
    language: languageSchema.optional(),
  }),
});

const broadcastShufflingGridSchema = z.object({
  gridState: z.unknown(),
});

// ==================== Schema Map ====================

const eventSchemas = {
  createGame: createGameSchema,
  join: joinGameSchema,
  leaveRoom: leaveRoomSchema,
  startGame: startGameSchema,
  startGameAck: startGameAckSchema,
  resetGame: resetGameSchema,
  closeRoom: closeRoomSchema,
  submitWord: submitWordSchema,
  submitWordVote: submitWordVoteSchema,
  submitPeerValidationVote: submitPeerValidationVoteSchema,
  sendChatMessage: chatMessageSchema,
  chatMessage: chatMessageSchema, // Alias
  addBot: addBotSchema,
  removeBot: removeBotSchema,
  heartbeat: heartbeatSchema,
  presenceUpdate: presenceUpdateSchema,
  windowFocusChange: windowFocusChangeSchema,
  kickPlayer: kickPlayerSchema,
  transferHost: transferHostSchema,
  createTournament: createTournamentSchema,
  getWordsForBoard: getWordsForBoardSchema,
  reconnect: reconnectSchema,
  updateGameSettings: updateGameSettingsSchema,
  broadcastShufflingGrid: broadcastShufflingGridSchema,
};

// ==================== Validation Helpers ====================

/**
 * Validate a socket event payload against a schema
 * @param {z.ZodSchema} schema - Zod schema to validate against
 * @param {unknown} data - Data to validate
 * @returns {{ success: boolean, data?: any, error?: string }}
 */
function validatePayload(schema, data) {
  try {
    const result = schema.safeParse(data);
    if (result.success) {
      return { success: true, data: result.data };
    }
    // Format Zod error message
    const errorMessages = result.error.errors
      .map(e => `${e.path.join('.')}: ${e.message}`)
      .join(', ');
    return { success: false, error: errorMessages };
  } catch (error) {
    return { success: false, error: error.message || 'Validation failed' };
  }
}

/**
 * Create a validated event handler wrapper
 * @param {z.ZodSchema} schema - Zod schema for validation
 * @param {Function} handler - Event handler function
 * @param {Socket} socket - Socket for error emission
 * @returns {Function} - Wrapped handler with validation
 */
function withValidation(schema, handler, socket) {
  return async (data) => {
    const result = validatePayload(schema, data);
    if (!result.success) {
      if (socket && typeof socket.emit === 'function') {
        socket.emit('error', {
          message: `Invalid payload: ${result.error}`,
          code: 'VALIDATION_ERROR'
        });
      }
      return;
    }
    return handler(result.data);
  };
}

/**
 * Get schema for an event name
 * @param {string} eventName - Name of the socket event
 * @returns {z.ZodSchema|null} - Schema or null if not found
 */
function getEventSchema(eventName) {
  return eventSchemas[eventName] || null;
}

// ==================== Module Exports ====================

module.exports = {
  // Event schemas
  createGameSchema,
  joinGameSchema,
  leaveRoomSchema,
  startGameSchema,
  startGameAckSchema,
  submitWordSchema,
  submitWordVoteSchema,
  submitPeerValidationVoteSchema,
  chatMessageSchema,
  addBotSchema,
  removeBotSchema,
  heartbeatSchema,
  presenceUpdateSchema,
  windowFocusChangeSchema,
  kickPlayerSchema,
  transferHostSchema,
  createTournamentSchema,
  getWordsForBoardSchema,
  resetGameSchema,
  closeRoomSchema,
  reconnectSchema,
  updateGameSettingsSchema,
  broadcastShufflingGridSchema,

  // Base schemas for reuse
  languageSchema,
  avatarSchema,
  gameCodeSchema,
  usernameSchema,
  wordSchema,
  gridPositionSchema,
  difficultySchema,
  botDifficultySchema,
  presenceStatusSchema,

  // Schema map
  eventSchemas,

  // Validation utilities
  validatePayload,
  withValidation,
  getEventSchema,
};
