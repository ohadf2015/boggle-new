/**
 * Socket Event Validation - Thin Wrapper
 *
 * Single source of truth: shared/schemas/socketSchemas.ts
 * Compiled to CommonJS via `npm run build:schemas` → backend/dist/backend/utils/schemas.js
 *
 * Fail-fast on missing compiled output: no inline fallback, no silent drift.
 */

import { ZodSchema, ZodError } from 'zod';
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
  languageSchema: ZodSchema;
  avatarSchema: ZodSchema;
  gameCodeSchema: ZodSchema;
  usernameSchema: ZodSchema;
  wordSchema: ZodSchema;
  gridPositionSchema: ZodSchema;
  difficultySchema: ZodSchema;
  botDifficultySchema: ZodSchema;
  presenceStatusSchema: ZodSchema;
  roomNameSchema: ZodSchema;
  playerIdSchema: ZodSchema;
  guestTokenHashSchema: ZodSchema;
  createGameSchema: ZodSchema;
  joinGameSchema: ZodSchema;
  leaveRoomSchema: ZodSchema;
  startGameSchema: ZodSchema;
  startGameAckSchema: ZodSchema;
  submitWordSchema: ZodSchema;
  submitWordVoteSchema: ZodSchema;
  submitPeerValidationVoteSchema: ZodSchema;
  chatMessageSchema: ZodSchema;
  addBotSchema: ZodSchema;
  removeBotSchema: ZodSchema;
  heartbeatSchema: ZodSchema;
  presenceUpdateSchema: ZodSchema;
  windowFocusChangeSchema: ZodSchema;
  kickPlayerSchema: ZodSchema;
  transferHostSchema: ZodSchema;
  createTournamentSchema: ZodSchema;
  getWordsForBoardSchema: ZodSchema;
  resetGameSchema: ZodSchema;
  closeRoomSchema: ZodSchema;
  reconnectSchema: ZodSchema;
  updateGameSettingsSchema: ZodSchema;
  broadcastShufflingGridSchema: ZodSchema;
  generateScoreCardSchema: ZodSchema;
  eventSchemas: Record<string, ZodSchema>;
  ALLOWED_IMAGE_DOMAINS?: string[];
}

// Fail-fast: compiled bridge required. Run `npm run build:schemas` if missing.
 
const compiledModule: Partial<CompiledSchemas> = require('../dist/backend/utils/schemas');
const compiled = compiledModule;

function required<K extends keyof CompiledSchemas>(key: K): CompiledSchemas[K] {
  const value = compiled[key];
  if (!value) {
    throw new Error(`socketValidation: compiled schema '${String(key)}' missing — run 'npm run build:schemas'`);
  }
  return value as CompiledSchemas[K];
}

// Re-export schemas (single source: shared/schemas/socketSchemas.ts)
export const languageSchema = required('languageSchema');
export const avatarSchema = required('avatarSchema');
export const gameCodeSchema = required('gameCodeSchema');
export const usernameSchema = required('usernameSchema');
export const wordSchema = required('wordSchema');
export const gridPositionSchema = required('gridPositionSchema');
export const difficultySchema = required('difficultySchema');
export const botDifficultySchema = required('botDifficultySchema');
export const presenceStatusSchema = required('presenceStatusSchema');
export const roomNameSchema = required('roomNameSchema');
export const playerIdSchema = required('playerIdSchema');
export const guestTokenHashSchema = required('guestTokenHashSchema');
export const createGameSchema = required('createGameSchema');
export const joinGameSchema = required('joinGameSchema');
export const leaveRoomSchema = required('leaveRoomSchema');
export const startGameSchema = required('startGameSchema');
export const startGameAckSchema = required('startGameAckSchema');
export const submitWordSchema = required('submitWordSchema');
export const submitWordVoteSchema = required('submitWordVoteSchema');
export const submitPeerValidationVoteSchema = required('submitPeerValidationVoteSchema');
export const chatMessageSchema = required('chatMessageSchema');
export const addBotSchema = required('addBotSchema');
export const removeBotSchema = required('removeBotSchema');
export const heartbeatSchema = required('heartbeatSchema');
export const presenceUpdateSchema = required('presenceUpdateSchema');
export const windowFocusChangeSchema = required('windowFocusChangeSchema');
export const kickPlayerSchema = required('kickPlayerSchema');
export const transferHostSchema = required('transferHostSchema');
export const createTournamentSchema = required('createTournamentSchema');
export const getWordsForBoardSchema = required('getWordsForBoardSchema');
export const resetGameSchema = required('resetGameSchema');
export const closeRoomSchema = required('closeRoomSchema');
export const reconnectSchema = required('reconnectSchema');
export const updateGameSettingsSchema = required('updateGameSettingsSchema');
export const broadcastShufflingGridSchema = required('broadcastShufflingGridSchema');
export const generateScoreCardSchema = required('generateScoreCardSchema');
export const eventSchemas = required('eventSchemas');

// SECURITY: Allowed domains for profile picture URLs (prevent SSRF attacks).
// Re-exported from shared schema module if available, otherwise computed locally.
export const ALLOWED_IMAGE_DOMAINS: string[] = compiled.ALLOWED_IMAGE_DOMAINS || (() => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseDomains: string[] = [];
  try {
    if (supabaseUrl) {
      const url = new URL(supabaseUrl);
      supabaseDomains.push(url.hostname);
    }
  } catch {
    // ignore
  }
  return [
    'i.imgur.com',
    'cdn.discordapp.com',
    'lh3.googleusercontent.com',
    'avatars.githubusercontent.com',
    'cdn.cloudflare.com',
    'res.cloudinary.com',
    'storage.googleapis.com',
    'firebasestorage.googleapis.com',
    ...supabaseDomains,
  ].filter(Boolean);
})();

// ==================== Validation Helpers ====================

/**
 * Validate a socket event payload against a schema
 */
export function validatePayload<T>(schema: ZodSchema<T>, data: unknown): ValidationResult<T> {
  if (!schema) {
    return { success: false, error: 'Invalid schema provided', fields: {} };
  }

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
