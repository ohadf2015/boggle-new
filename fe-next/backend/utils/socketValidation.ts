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

import { z, ZodSchema, ZodError } from 'zod';
import type { Socket } from 'socket.io';
import { ErrorCodes, AppError, emitError } from './errorHandler';
import logger from './logger';

// ==========================================
// Type Definitions
// ==========================================

interface ValidationResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  fields?: Record<string, string>;
}

interface CompiledSchemas {
  languageSchema?: ZodSchema;
  avatarSchema?: ZodSchema;
  gameCodeSchema?: ZodSchema;
  usernameSchema?: ZodSchema;
  wordSchema?: ZodSchema;
  gridPositionSchema?: ZodSchema;
  difficultySchema?: ZodSchema;
  botDifficultySchema?: ZodSchema;
  presenceStatusSchema?: ZodSchema;
  createGameSchema?: ZodSchema;
  joinGameSchema?: ZodSchema;
  leaveRoomSchema?: ZodSchema;
  startGameSchema?: ZodSchema;
  startGameAckSchema?: ZodSchema;
  submitWordSchema?: ZodSchema;
  submitWordVoteSchema?: ZodSchema;
  submitPeerValidationVoteSchema?: ZodSchema;
  chatMessageSchema?: ZodSchema;
  addBotSchema?: ZodSchema;
  removeBotSchema?: ZodSchema;
  heartbeatSchema?: ZodSchema;
  presenceUpdateSchema?: ZodSchema;
  windowFocusChangeSchema?: ZodSchema;
  kickPlayerSchema?: ZodSchema;
  transferHostSchema?: ZodSchema;
  createTournamentSchema?: ZodSchema;
  getWordsForBoardSchema?: ZodSchema;
  resetGameSchema?: ZodSchema;
  closeRoomSchema?: ZodSchema;
  reconnectSchema?: ZodSchema;
  updateGameSettingsSchema?: ZodSchema;
  broadcastShufflingGridSchema?: ZodSchema;
  generateScoreCardSchema?: ZodSchema;
  eventSchemas?: Record<string, ZodSchema>;
}

let compiledSchemas: CompiledSchemas | null = null;

// Try to load compiled schemas, fall back to inline if not available
try {
   
  compiledSchemas = require('../dist/backend/utils/schemas') as CompiledSchemas;
} catch {
  // Compiled schemas not available - this is expected during initial setup
  // or if build:schemas hasn't been run yet
  logger.debug('VALIDATION', 'Compiled schemas not found, using inline definitions');
}

// ==================== Inline Fallback Schemas ====================
// Used when compiled TypeScript schemas are not available

export const languageSchema = compiledSchemas?.languageSchema || z.enum(['he', 'en', 'sv', 'ja', 'es', 'fr', 'de']);

// Allowed domains for profile picture URLs (prevent SSRF attacks)
export const ALLOWED_IMAGE_DOMAINS: string[] = [
  'i.imgur.com',
  'cdn.discordapp.com',
  'lh3.googleusercontent.com',
  'avatars.githubusercontent.com',
  'cdn.cloudflare.com',
  'res.cloudinary.com',
  'storage.googleapis.com',
  'firebasestorage.googleapis.com',
];

export const avatarSchema = compiledSchemas?.avatarSchema || z.object({
  emoji: z.string()
    .min(1)
    .max(10)
    // Prevent emoji bombs and zero-width joiners
    .refine((val) => {
      // Count actual characters (not just bytes)
      const chars = Array.from(val);
      // Max 4 actual characters (emoji with modifiers can be multiple code points)
      if (chars.length > 4) return false;
      // Check for excessive zero-width joiners
      const zwjCount = (val.match(/\u200D/g) || []).length;
      return zwjCount <= 3;
    }, 'Invalid emoji format'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  avatarImage: z.string()
    .max(100)
    .regex(/^[a-z0-9_\-\/]+$/i, 'Avatar image must contain only alphanumeric characters, hyphens, underscores, and slashes')
    .optional()
    .nullable(),
  profilePictureUrl: z.string()
    .url()
    .nullable()
    .optional()
    .refine((url) => {
      if (!url) return true; // null/undefined is allowed
      try {
        const parsed = new URL(url);
        // Only allow HTTPS (prevent data:, javascript:, file: schemes)
        if (parsed.protocol !== 'https:') return false;
        // Check against whitelist
        return ALLOWED_IMAGE_DOMAINS.some(domain => parsed.hostname === domain || parsed.hostname.endsWith('.' + domain));
      } catch {
        return false;
      }
    }, 'Profile picture URL must be from an allowed domain (HTTPS only)'),
}).optional();

export const gameCodeSchema = compiledSchemas?.gameCodeSchema || z.string()
  .min(6, 'Game code must be at least 6 characters')
  .max(10, 'Game code must be at most 10 characters')
  .regex(/^[A-Za-z0-9]+$/, 'Game code must be alphanumeric')
  .transform(s => s.toUpperCase()); // Normalize to uppercase for consistency

export const usernameSchema = compiledSchemas?.usernameSchema || z.string()
  .min(1, 'Username is required')
  .max(30, 'Username must be at most 30 characters')
  // Allow spaces for multi-word names (e.g., "Sneaky Pickle", "מלפפון חמקמק")
  // Matches frontend NAME_VALID_PATTERN for consistency
  .regex(/^[a-zA-Z0-9\s_\-\u0590-\u05FF\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]+$/, 'Username can only contain letters, numbers, spaces, underscores, and hyphens')
  .transform(s => s.trim())
  // Additional safety: prevent control characters and zero-width characters
  .refine((val) => !/[\u0000-\u001F\u007F-\u009F\u200B-\u200D\uFEFF]/.test(val), 'Username contains invalid characters');

export const wordSchema = compiledSchemas?.wordSchema || z.string()
  .min(1, 'Word is required')
  .max(50, 'Word must be at most 50 characters')
  .transform(s => s.trim());

export const gridPositionSchema = compiledSchemas?.gridPositionSchema || z.object({
  row: z.number().int().min(0).max(10),
  col: z.number().int().min(0).max(10),
  letter: z.string().optional(),
});

export const difficultySchema = compiledSchemas?.difficultySchema || z.enum(['EASY', 'MEDIUM', 'HARD']);
export const botDifficultySchema = compiledSchemas?.botDifficultySchema || z.enum(['easy', 'medium', 'hard']);
export const presenceStatusSchema = compiledSchemas?.presenceStatusSchema || z.enum(['active', 'idle', 'afk']);

// Room name schema - similar restrictions as username to prevent XSS
// Allow spaces for multi-word room names (e.g., "Fun Room", "Disco Potato Room")
export const roomNameSchema = z.string()
  .max(50, 'Room name must be at most 50 characters')
  .regex(/^[a-zA-Z0-9\s_\-\u0590-\u05FF\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]+$/, 'Room name can only contain letters, numbers, spaces, underscores, and hyphens')
  .transform(s => s.trim())
  .refine((val) => !/[\u0000-\u001F\u007F-\u009F\u200B-\u200D\uFEFF]/.test(val), 'Room name contains invalid characters')
  .optional();

// Player ID schema - validate UUID v4 format
export const playerIdSchema = z.string()
  .regex(/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i, 'Player ID must be a valid UUID v4')
  .optional()
  .nullable();

// Guest token hash schema - validate SHA-256 hex format (64 characters)
export const guestTokenHashSchema = z.string()
  .regex(/^[a-f0-9]{64}$/i, 'Guest token hash must be a valid SHA-256 hash')
  .optional()
  .nullable();

// Event schemas - use compiled or inline
export const createGameSchema = compiledSchemas?.createGameSchema || z.object({
  gameCode: gameCodeSchema,
  roomName: roomNameSchema,
  language: languageSchema.optional().default('en'),
  hostUsername: usernameSchema.optional(),
  playerId: playerIdSchema,
  avatar: avatarSchema,
  authUserId: z.string().uuid().optional().nullable(),
  guestTokenHash: guestTokenHashSchema,
  isRanked: z.boolean().optional().default(false),
  profilePictureUrl: z.string()
    .url()
    .optional()
    .nullable()
    .refine((url) => {
      if (!url) return true;
      try {
        const parsed = new URL(url);
        if (parsed.protocol !== 'https:') return false;
        return ALLOWED_IMAGE_DOMAINS.some(domain => parsed.hostname === domain || parsed.hostname.endsWith('.' + domain));
      } catch {
        return false;
      }
    }, 'Profile picture URL must be from an allowed domain (HTTPS only)'),
});

export const joinGameSchema = compiledSchemas?.joinGameSchema || z.object({
  gameCode: gameCodeSchema,
  username: usernameSchema,
  playerId: playerIdSchema,
  avatar: avatarSchema,
  authUserId: z.string().uuid().optional().nullable(),
  guestTokenHash: guestTokenHashSchema,
  profilePictureUrl: z.string()
    .url()
    .optional()
    .nullable()
    .refine((url) => {
      if (!url) return true;
      try {
        const parsed = new URL(url);
        if (parsed.protocol !== 'https:') return false;
        return ALLOWED_IMAGE_DOMAINS.some(domain => parsed.hostname === domain || parsed.hostname.endsWith('.' + domain));
      } catch {
        return false;
      }
    }, 'Profile picture URL must be from an allowed domain (HTTPS only)'),
});

export const leaveRoomSchema = compiledSchemas?.leaveRoomSchema || z.object({
  gameCode: gameCodeSchema,
  username: usernameSchema,
});

export const startGameSchema = compiledSchemas?.startGameSchema || z.object({
  gameCode: gameCodeSchema.optional(),
  letterGrid: z.array(z.array(z.string())),
  timerSeconds: z.number().int().min(30).max(600).optional().default(180),
  language: languageSchema.optional(),
  difficulty: difficultySchema.optional().default('MEDIUM'),
  minWordLength: z.number().int().min(2).max(5).optional().default(3),
});

export const startGameAckSchema = compiledSchemas?.startGameAckSchema || z.object({
  messageId: z.string().min(1),
});

export const submitWordSchema = compiledSchemas?.submitWordSchema || z.object({
  gameCode: gameCodeSchema.optional(),
  username: usernameSchema.optional(),
  word: wordSchema,
  path: z.array(gridPositionSchema).optional(),
  comboLevel: z.number().int().min(0).max(10).optional(),
  fireRoundActive: z.boolean().optional().default(false),
});

export const submitWordVoteSchema = compiledSchemas?.submitWordVoteSchema || z.object({
  gameCode: gameCodeSchema.optional(),
  word: wordSchema,
  voteType: z.enum(['like', 'dislike']).optional(),
  isValid: z.boolean().optional(),
  language: languageSchema.optional(),
  submittedBy: usernameSchema.optional(),
  isBot: z.boolean().optional(),
});

export const submitPeerValidationVoteSchema = compiledSchemas?.submitPeerValidationVoteSchema || z.object({
  gameCode: gameCodeSchema.optional(),
  word: wordSchema,
  isValid: z.boolean(),
});

export const chatMessageSchema = compiledSchemas?.chatMessageSchema || z.object({
  gameCode: gameCodeSchema.optional(),
  username: usernameSchema.optional(),
  message: z.string().min(1).max(500),
});

export const addBotSchema = compiledSchemas?.addBotSchema || z.object({
  gameCode: gameCodeSchema.optional(),
  difficulty: botDifficultySchema.optional().default('medium'),
});

export const removeBotSchema = compiledSchemas?.removeBotSchema || z.object({
  gameCode: gameCodeSchema.optional(),
  botId: z.string().optional(),
  botUsername: usernameSchema.optional(),
  username: usernameSchema.optional(),
});

export const heartbeatSchema = compiledSchemas?.heartbeatSchema || z.object({
  gameCode: gameCodeSchema.optional(),
  username: usernameSchema.optional(),
  timestamp: z.number().optional(),
});

export const presenceUpdateSchema = compiledSchemas?.presenceUpdateSchema || z.object({
  gameCode: gameCodeSchema.optional(),
  username: usernameSchema.optional(),
  status: presenceStatusSchema.optional(),
  isWindowFocused: z.boolean().optional(),
  lastActivityAt: z.number().optional(),
});

export const windowFocusChangeSchema = compiledSchemas?.windowFocusChangeSchema || z.object({
  gameCode: gameCodeSchema.optional(),
  isFocused: z.boolean(),
});

export const kickPlayerSchema = compiledSchemas?.kickPlayerSchema || z.object({
  gameCode: gameCodeSchema,
  username: usernameSchema,
});

export const transferHostSchema = compiledSchemas?.transferHostSchema || z.object({
  gameCode: gameCodeSchema,
  newHostUsername: usernameSchema,
});

export const createTournamentSchema = compiledSchemas?.createTournamentSchema || z.object({
  gameCode: gameCodeSchema.optional(),
  name: z.string().min(1).max(100),
  totalRounds: z.number().int().min(2).max(10).default(3),
  settings: z.object({
    timerSeconds: z.number().int().min(30).max(600).optional(),
    difficulty: difficultySchema.optional(),
    minWordLength: z.number().int().min(2).max(5).optional(),
  }).optional(),
});

export const getWordsForBoardSchema = compiledSchemas?.getWordsForBoardSchema || z.object({
  language: languageSchema,
  boardSize: z.object({
    rows: z.number().int().min(3).max(10),
    cols: z.number().int().min(3).max(10),
  }).optional(),
});

export const resetGameSchema = compiledSchemas?.resetGameSchema || z.object({
  gameCode: gameCodeSchema.optional(),
});

export const closeRoomSchema = compiledSchemas?.closeRoomSchema || z.object({
  gameCode: gameCodeSchema,
});

export const reconnectSchema = compiledSchemas?.reconnectSchema || z.object({
  gameCode: gameCodeSchema,
  username: usernameSchema,
  authUserId: z.string().uuid().optional().nullable(),
  guestTokenHash: guestTokenHashSchema,
});

export const updateGameSettingsSchema = compiledSchemas?.updateGameSettingsSchema || z.object({
  gameCode: gameCodeSchema,
  settings: z.object({
    timerSeconds: z.number().int().min(30).max(600).optional(),
    difficulty: difficultySchema.optional(),
    minWordLength: z.number().int().min(2).max(5).optional(),
    language: languageSchema.optional(),
  }),
});

export const broadcastShufflingGridSchema = compiledSchemas?.broadcastShufflingGridSchema || z.object({
  gridState: z.unknown(),
});

export const generateScoreCardSchema = compiledSchemas?.generateScoreCardSchema || z.object({
  gameCode: gameCodeSchema.optional(),
  username: usernameSchema.optional(),
});

// ==================== Schema Map ====================

export const eventSchemas: Record<string, ZodSchema> = compiledSchemas?.eventSchemas || {
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
  'scorecard:generate': generateScoreCardSchema,
};

// ==================== Validation Helpers ====================

/**
 * Validate a socket event payload against a schema
 */
export function validatePayload<T>(schema: ZodSchema<T>, data: unknown): ValidationResult<T> {
  // Handle null/undefined schema gracefully
  if (!schema) {
    return { success: false, error: 'Invalid schema provided', fields: {} };
  }

  // Use inline validation (more reliable than compiled for field extraction)
  try {
    const result = schema.safeParse(data);
    if (result.success) {
      return { success: true, data: result.data };
    }

    const fields: Record<string, string> = {};
    const zodError = result.error as ZodError;
    const errorMessages = zodError.issues.map((e) => {
      const pathStr = e.path.map(String).join('.') || 'value';
      fields[pathStr] = e.message;
      return `${pathStr}: ${e.message}`;
    });

    return {
      success: false,
      error: errorMessages.join(', '),
      fields
    };
  } catch (error) {
    return { success: false, error: (error as Error).message || 'Validation failed', fields: {} };
  }
}

/**
 * Validate and emit error if validation fails
 */
export function validateWithError<T>(schema: ZodSchema<T>, data: unknown, socket: Socket, eventName: string = 'unknown'): ValidationResult<T> {
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

type EventHandler<T> = (data: T) => Promise<void> | void;

/**
 * Create a validated event handler wrapper
 */
export function withValidation<T>(schema: ZodSchema<T>, handler: EventHandler<T>, socket: Socket, eventName: string = 'unknown'): (data: unknown) => Promise<void> {
  return async (data: unknown) => {
    const result = validateWithError(schema, data, socket, eventName);
    if (!result.success || !result.data) {
      return;
    }
    await handler(result.data);
  };
}

type ValidationMiddlewareHandler<T> = (data: T) => Promise<void> | void;

/**
 * Create a validation middleware for socket events
 */
export function createValidationMiddleware(eventName: string): <T>(socket: Socket, data: unknown, handler: ValidationMiddlewareHandler<T>) => void {
  const schema = eventSchemas[eventName];
  if (!schema) {
    logger.warn('VALIDATION', `No schema found for event: ${eventName}`);
    return <T>(_socket: Socket, data: unknown, handler: ValidationMiddlewareHandler<T>) => handler(data as T);
  }

  return <T>(socket: Socket, data: unknown, handler: ValidationMiddlewareHandler<T>) => {
    const result = validateWithError(schema, data, socket, eventName);
    if (result.success && result.data) {
      handler(result.data as T);
    }
  };
}

/**
 * Get schema for an event name
 */
export function getEventSchema(eventName: string): ZodSchema | null {
  return eventSchemas[eventName] || null;
}

/**
 * Check if an event has a registered schema
 */
export function hasSchema(eventName: string): boolean {
  return eventName in eventSchemas;
}

/**
 * Create a validation error
 */
export function createValidationError(message: string, fields?: Record<string, string>): AppError {
  return new AppError(ErrorCodes.VALIDATION_FAILED, {
    message,
    details: fields
  });
}
