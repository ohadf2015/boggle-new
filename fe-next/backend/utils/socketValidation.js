/**
 * Socket Event Validation - Thin Wrapper
 *
 * This module re-exports validation utilities from the compiled TypeScript schemas.
 * The single source of truth is now shared/schemas/socketSchemas.ts
 *
 * Build the schemas: npm run build:schemas
 *
 * If the compiled output is missing, fall back to inline definitions.
 */

const { z } = require('zod');
const { ErrorCodes, AppError, emitError } = require('./errorHandler');
const logger = require('./logger');

let compiledSchemas = null;

// Try to load compiled schemas, fall back to inline if not available
try {
  compiledSchemas = require('../dist/backend/utils/schemas');
} catch (e) {
  // Compiled schemas not available - this is expected during initial setup
  // or if build:schemas hasn't been run yet
  logger.debug('VALIDATION', 'Compiled schemas not found, using inline definitions');
}

// ==================== Inline Fallback Schemas ====================
// Used when compiled TypeScript schemas are not available

const languageSchema = compiledSchemas?.languageSchema || z.enum(['he', 'en', 'sv', 'ja', 'es', 'fr', 'de']);

const avatarSchema = compiledSchemas?.avatarSchema || z.object({
  emoji: z.string().max(10),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  profilePictureUrl: z.string().url().nullable().optional(),
}).optional();

const gameCodeSchema = compiledSchemas?.gameCodeSchema || z.string()
  .min(4, 'Game code must be at least 4 characters')
  .max(10, 'Game code must be at most 10 characters')
  .regex(/^[A-Za-z0-9]+$/, 'Game code must be alphanumeric');

const usernameSchema = compiledSchemas?.usernameSchema || z.string()
  .min(1, 'Username is required')
  .max(30, 'Username must be at most 30 characters')
  .regex(/^[a-zA-Z0-9_\-\u0590-\u05FF\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\s]+$/)
  .transform(s => s.trim());

const wordSchema = compiledSchemas?.wordSchema || z.string()
  .min(1, 'Word is required')
  .max(50, 'Word must be at most 50 characters')
  .transform(s => s.trim());

const gridPositionSchema = compiledSchemas?.gridPositionSchema || z.object({
  row: z.number().int().min(0).max(10),
  col: z.number().int().min(0).max(10),
  letter: z.string().optional(),
});

const difficultySchema = compiledSchemas?.difficultySchema || z.enum(['EASY', 'MEDIUM', 'HARD']);
const botDifficultySchema = compiledSchemas?.botDifficultySchema || z.enum(['easy', 'medium', 'hard']);
const presenceStatusSchema = compiledSchemas?.presenceStatusSchema || z.enum(['active', 'idle', 'afk']);

// Event schemas - use compiled or inline
const createGameSchema = compiledSchemas?.createGameSchema || z.object({
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

const joinGameSchema = compiledSchemas?.joinGameSchema || z.object({
  gameCode: gameCodeSchema,
  username: usernameSchema,
  playerId: z.string().max(64).optional().nullable(),
  avatar: avatarSchema,
  authUserId: z.string().uuid().optional().nullable(),
  guestTokenHash: z.string().max(128).optional().nullable(),
  profilePictureUrl: z.string().url().optional().nullable(),
});

const leaveRoomSchema = compiledSchemas?.leaveRoomSchema || z.object({
  gameCode: gameCodeSchema,
  username: usernameSchema,
});

const startGameSchema = compiledSchemas?.startGameSchema || z.object({
  gameCode: gameCodeSchema.optional(),
  letterGrid: z.array(z.array(z.string())),
  timerSeconds: z.number().int().min(30).max(600).optional().default(180),
  language: languageSchema.optional(),
  difficulty: difficultySchema.optional().default('MEDIUM'),
  minWordLength: z.number().int().min(2).max(5).optional().default(3),
});

const startGameAckSchema = compiledSchemas?.startGameAckSchema || z.object({
  messageId: z.string().min(1),
});

const submitWordSchema = compiledSchemas?.submitWordSchema || z.object({
  gameCode: gameCodeSchema.optional(),
  username: usernameSchema.optional(),
  word: wordSchema,
  path: z.array(gridPositionSchema).optional(),
  comboLevel: z.number().int().min(0).max(10).optional(),
});

const submitWordVoteSchema = compiledSchemas?.submitWordVoteSchema || z.object({
  gameCode: gameCodeSchema.optional(),
  word: wordSchema,
  voteType: z.enum(['valid', 'invalid']).optional(),
  isValid: z.boolean().optional(),
  language: languageSchema.optional(),
  submittedBy: usernameSchema.optional(),
  isBot: z.boolean().optional(),
});

const submitPeerValidationVoteSchema = compiledSchemas?.submitPeerValidationVoteSchema || z.object({
  gameCode: gameCodeSchema.optional(),
  word: wordSchema,
  isValid: z.boolean(),
});

const chatMessageSchema = compiledSchemas?.chatMessageSchema || z.object({
  gameCode: gameCodeSchema.optional(),
  username: usernameSchema.optional(),
  message: z.string().min(1).max(500),
});

const addBotSchema = compiledSchemas?.addBotSchema || z.object({
  gameCode: gameCodeSchema.optional(),
  difficulty: botDifficultySchema.optional().default('medium'),
});

const removeBotSchema = compiledSchemas?.removeBotSchema || z.object({
  gameCode: gameCodeSchema.optional(),
  botId: z.string().optional(),
  botUsername: usernameSchema.optional(),
  username: usernameSchema.optional(),
});

const heartbeatSchema = compiledSchemas?.heartbeatSchema || z.object({
  gameCode: gameCodeSchema.optional(),
  username: usernameSchema.optional(),
  timestamp: z.number().optional(),
});

const presenceUpdateSchema = compiledSchemas?.presenceUpdateSchema || z.object({
  gameCode: gameCodeSchema.optional(),
  username: usernameSchema.optional(),
  status: presenceStatusSchema.optional(),
  isWindowFocused: z.boolean().optional(),
  lastActivityAt: z.number().optional(),
});

const windowFocusChangeSchema = compiledSchemas?.windowFocusChangeSchema || z.object({
  gameCode: gameCodeSchema.optional(),
  isFocused: z.boolean(),
});

const kickPlayerSchema = compiledSchemas?.kickPlayerSchema || z.object({
  gameCode: gameCodeSchema,
  username: usernameSchema,
});

const transferHostSchema = compiledSchemas?.transferHostSchema || z.object({
  gameCode: gameCodeSchema,
  newHostUsername: usernameSchema,
});

const createTournamentSchema = compiledSchemas?.createTournamentSchema || z.object({
  gameCode: gameCodeSchema.optional(),
  name: z.string().min(1).max(100),
  totalRounds: z.number().int().min(2).max(10).default(3),
  settings: z.object({
    timerSeconds: z.number().int().min(30).max(600).optional(),
    difficulty: difficultySchema.optional(),
    minWordLength: z.number().int().min(2).max(5).optional(),
  }).optional(),
});

const getWordsForBoardSchema = compiledSchemas?.getWordsForBoardSchema || z.object({
  language: languageSchema,
  boardSize: z.object({
    rows: z.number().int().min(3).max(10),
    cols: z.number().int().min(3).max(10),
  }).optional(),
});

const resetGameSchema = compiledSchemas?.resetGameSchema || z.object({
  gameCode: gameCodeSchema.optional(),
});

const closeRoomSchema = compiledSchemas?.closeRoomSchema || z.object({
  gameCode: gameCodeSchema,
});

const reconnectSchema = compiledSchemas?.reconnectSchema || z.object({
  gameCode: gameCodeSchema,
  username: usernameSchema,
  authUserId: z.string().uuid().optional().nullable(),
  guestTokenHash: z.string().max(128).optional().nullable(),
});

const updateGameSettingsSchema = compiledSchemas?.updateGameSettingsSchema || z.object({
  gameCode: gameCodeSchema,
  settings: z.object({
    timerSeconds: z.number().int().min(30).max(600).optional(),
    difficulty: difficultySchema.optional(),
    minWordLength: z.number().int().min(2).max(5).optional(),
    language: languageSchema.optional(),
  }),
});

const broadcastShufflingGridSchema = compiledSchemas?.broadcastShufflingGridSchema || z.object({
  gridState: z.unknown(),
});

// ==================== Schema Map ====================

const eventSchemas = compiledSchemas?.eventSchemas || {
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
  chatMessage: chatMessageSchema,
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
 */
function validatePayload(schema, data) {
  if (compiledSchemas?.validatePayload) {
    return compiledSchemas.validatePayload(schema, data);
  }

  try {
    const result = schema.safeParse(data);
    if (result.success) {
      return { success: true, data: result.data };
    }

    const fields = {};
    const errorMessages = (result.error.errors || result.error.issues || []).map(e => {
      const path = e.path.join('.');
      fields[path] = e.message;
      return `${path}: ${e.message}`;
    });

    return {
      success: false,
      error: errorMessages.join(', '),
      fields
    };
  } catch (error) {
    return { success: false, error: error.message || 'Validation failed' };
  }
}

/**
 * Validate and emit error if validation fails
 */
function validateWithError(schema, data, socket, eventName = 'unknown') {
  const result = validatePayload(schema, data);

  if (!result.success) {
    logger.debug('VALIDATION', `Validation failed for ${eventName}`, {
      error: result.error,
      fields: result.fields
    });

    emitError(socket, ErrorCodes.VALIDATION_INVALID_PAYLOAD, {
      message: `Invalid ${eventName} payload: ${result.error}`,
      details: result.fields
    });

    return { success: false };
  }

  return { success: true, data: result.data };
}

/**
 * Create a validated event handler wrapper
 */
function withValidation(schema, handler, socket, eventName = 'unknown') {
  return async (data) => {
    const result = validateWithError(schema, data, socket, eventName);
    if (!result.success) {
      return;
    }
    return handler(result.data);
  };
}

/**
 * Create a validation middleware for socket events
 */
function createValidationMiddleware(eventName) {
  const schema = eventSchemas[eventName];
  if (!schema) {
    logger.warn('VALIDATION', `No schema found for event: ${eventName}`);
    return (socket, data, handler) => handler(data);
  }

  return (socket, data, handler) => {
    const result = validateWithError(schema, data, socket, eventName);
    if (result.success) {
      return handler(result.data);
    }
  };
}

/**
 * Get schema for an event name
 */
function getEventSchema(eventName) {
  return eventSchemas[eventName] || null;
}

/**
 * Check if an event has a registered schema
 */
function hasSchema(eventName) {
  return eventName in eventSchemas;
}

/**
 * Create a validation error
 */
function createValidationError(message, fields) {
  return new AppError(ErrorCodes.VALIDATION_FAILED, {
    message,
    details: fields
  });
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

  // Base schemas
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
  validateWithError,
  withValidation,
  createValidationMiddleware,
  getEventSchema,
  hasSchema,
  createValidationError,
};
