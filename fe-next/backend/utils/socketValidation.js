/**
 * Socket Event Validation Schemas
 * Uses Zod for runtime validation of socket event payloads
 */

const { z } = require('zod');

// ==================== Base Schemas ====================

const languageSchema = z.enum(['en', 'he', 'sv', 'ja']);

const avatarSchema = z.object({
  emoji: z.string().max(10),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/)
}).optional();

const gameCodeSchema = z.string()
  .min(4, 'Game code must be at least 4 characters')
  .max(10, 'Game code must be at most 10 characters')
  .regex(/^[A-Za-z0-9]+$/, 'Game code must be alphanumeric');

const usernameSchema = z.string()
  .min(1, 'Username is required')
  .max(30, 'Username must be at most 30 characters')
  .trim();

const wordSchema = z.string()
  .min(1, 'Word is required')
  .max(50, 'Word must be at most 50 characters')
  .trim();

// ==================== Client → Server Event Schemas ====================

/**
 * createGame event payload
 */
const createGameSchema = z.object({
  gameCode: gameCodeSchema,
  roomName: z.string().max(50).optional(),
  language: languageSchema.optional(),
  hostUsername: usernameSchema.optional(),
  playerId: z.string().uuid().optional().nullable(),
  avatar: avatarSchema,
  authUserId: z.string().uuid().optional().nullable(),
  guestTokenHash: z.string().max(128).optional().nullable(),
  isRanked: z.boolean().optional(),
  profilePictureUrl: z.string().url().optional().nullable()
});

/**
 * join event payload
 */
const joinGameSchema = z.object({
  gameCode: gameCodeSchema,
  username: usernameSchema,
  playerId: z.string().uuid().optional().nullable(),
  avatar: avatarSchema,
  authUserId: z.string().uuid().optional().nullable(),
  guestTokenHash: z.string().max(128).optional().nullable(),
  profilePictureUrl: z.string().url().optional().nullable()
});

/**
 * startGame event payload
 */
const startGameSchema = z.object({
  letterGrid: z.array(z.array(z.string().length(1))),
  timerSeconds: z.number().int().min(30).max(600),
  language: languageSchema.optional(),
  minWordLength: z.number().int().min(2).max(5).optional()
});

/**
 * submitWord event payload
 */
const submitWordSchema = z.object({
  word: wordSchema,
  comboLevel: z.number().int().min(0).max(10).optional()
});

/**
 * submitWordVote event payload
 */
const submitWordVoteSchema = z.object({
  word: wordSchema,
  voteType: z.enum(['valid', 'invalid']),
  gameCode: gameCodeSchema.optional(),
  submittedBy: usernameSchema.optional(),
  isBot: z.boolean().optional()
});

/**
 * submitPeerValidationVote event payload
 */
const submitPeerValidationVoteSchema = z.object({
  word: wordSchema,
  isValid: z.boolean(),
  gameCode: gameCodeSchema.optional()
});

/**
 * chatMessage event payload
 */
const chatMessageSchema = z.object({
  message: z.string().min(1).max(500),
  gameCode: gameCodeSchema.optional()
});

/**
 * addBot event payload
 */
const addBotSchema = z.object({
  difficulty: z.enum(['easy', 'medium', 'hard']).optional()
});

/**
 * removeBot event payload
 */
const removeBotSchema = z.object({
  botId: z.string().optional(),
  username: usernameSchema.optional()
});

/**
 * leaveRoom event payload
 */
const leaveRoomSchema = z.object({
  gameCode: gameCodeSchema,
  username: usernameSchema
});

/**
 * createTournament event payload
 */
const createTournamentSchema = z.object({
  name: z.string().min(1).max(100),
  totalRounds: z.number().int().min(2).max(10)
});

/**
 * getWordsForBoard event payload
 */
const getWordsForBoardSchema = z.object({
  language: languageSchema,
  boardSize: z.object({
    rows: z.number().int().min(3).max(6),
    cols: z.number().int().min(3).max(6)
  }).optional()
});

/**
 * presenceUpdate event payload
 */
const presenceUpdateSchema = z.object({
  status: z.enum(['active', 'idle', 'afk'])
});

/**
 * startGameAck event payload
 */
const startGameAckSchema = z.object({
  messageId: z.string().min(1)
});

/**
 * broadcastShufflingGrid event payload
 */
const broadcastShufflingGridSchema = z.object({
  gridState: z.unknown() // Flexible grid state object
});

// ==================== Validation Helper ====================

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
      // Emit validation error to client
      if (socket && typeof socket.emit === 'function') {
        socket.emit('error', {
          message: `Invalid payload: ${result.error}`,
          code: 'VALIDATION_ERROR'
        });
      }
      return;
    }
    // Call the handler with validated data
    return handler(result.data);
  };
}

// ==================== Schema Map ====================

/**
 * Map of event names to their validation schemas
 * Used for automatic validation in handler registration
 */
const eventSchemas = {
  createGame: createGameSchema,
  join: joinGameSchema,
  startGame: startGameSchema,
  startGameAck: startGameAckSchema,
  submitWord: submitWordSchema,
  submitWordVote: submitWordVoteSchema,
  submitPeerValidationVote: submitPeerValidationVoteSchema,
  chatMessage: chatMessageSchema,
  addBot: addBotSchema,
  removeBot: removeBotSchema,
  leaveRoom: leaveRoomSchema,
  createTournament: createTournamentSchema,
  getWordsForBoard: getWordsForBoardSchema,
  presenceUpdate: presenceUpdateSchema,
  broadcastShufflingGrid: broadcastShufflingGridSchema
};

/**
 * Get schema for an event name
 * @param {string} eventName - Name of the socket event
 * @returns {z.ZodSchema|null} - Schema or null if not found
 */
function getEventSchema(eventName) {
  return eventSchemas[eventName] || null;
}

module.exports = {
  // Individual schemas
  createGameSchema,
  joinGameSchema,
  startGameSchema,
  startGameAckSchema,
  submitWordSchema,
  submitWordVoteSchema,
  submitPeerValidationVoteSchema,
  chatMessageSchema,
  addBotSchema,
  removeBotSchema,
  leaveRoomSchema,
  createTournamentSchema,
  getWordsForBoardSchema,
  presenceUpdateSchema,
  broadcastShufflingGridSchema,

  // Base schemas for reuse
  languageSchema,
  avatarSchema,
  gameCodeSchema,
  usernameSchema,
  wordSchema,

  // Validation utilities
  validatePayload,
  withValidation,
  getEventSchema,
  eventSchemas
};
