/**
 * Socket Schemas - CommonJS Bridge
 *
 * Single source of truth: imports from shared/schemas/socketSchemas.ts
 * This file is compiled to CommonJS for Node.js compatibility.
 *
 * Build: npm run build:schemas
 */

// Re-export all schemas from shared source of truth
export {
  // Base schemas
  LanguageSchema,
  AvatarSchema,
  GameCodeSchema,
  UsernameSchema,
  WordSchema,
  GridPositionSchema,
  DifficultySchema,
  BotDifficultySchema,
  PresenceStatusSchema,

  // Event schemas
  CreateGameSchema,
  JoinGameSchema,
  LeaveRoomSchema,
  StartGameSchema,
  StartGameAckSchema,
  SubmitWordSchema,
  SubmitWordVoteSchema,
  SubmitPeerValidationVoteSchema,
  ChatMessageSchema,
  AddBotSchema,
  RemoveBotSchema,
  HeartbeatSchema,
  PresenceUpdateSchema,
  WindowFocusChangeSchema,
  KickPlayerSchema,
  TransferHostSchema,
  CreateTournamentSchema,
  GetWordsForBoardSchema,
  ResetGameSchema,
  CloseRoomSchema,
  ReconnectSchema,
  UpdateGameSettingsSchema,
  BroadcastShufflingGridSchema,

  // Schema map and utilities
  ClientEventSchemas,
  validatePayload,
  validateSocketEvent,
  safeValidateSocketEvent,
  getEventSchema,

  // Types
  type ClientEventName,
  type Language,
  type Avatar,
  type GridPosition,
  type Difficulty,
  type BotDifficulty,
  type PresenceStatus,
  type CreateGameData,
  type JoinGameData,
  type LeaveRoomData,
  type StartGameData,
  type SubmitWordData,
  type ChatMessageData,
  type AddBotData,
  type RemoveBotData,
  type HeartbeatData,
  type PresenceUpdateData,
  type KickPlayerData,
  type TransferHostData,
  type CreateTournamentData,
  type ReconnectData,
} from '../../shared/schemas/socketSchemas';

import { z } from 'zod';
import {
  ClientEventSchemas,
  validatePayload as baseValidatePayload,
} from '../../shared/schemas/socketSchemas';

// Import error handler for backend-specific integration
// Using dynamic import to avoid circular dependency
let errorHandler: any = null;
let logger: any = null;

function getErrorHandler() {
  if (!errorHandler) {
    errorHandler = require('./errorHandler');
  }
  return errorHandler;
}

function getLogger() {
  if (!logger) {
    logger = require('./logger');
  }
  return logger;
}

// ==================== Backend-Specific Validation Helpers ====================

/**
 * Validate and emit error if validation fails (integrated with error handler)
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @param socket - Socket for error emission
 * @param eventName - Event name for logging
 * @returns Validation result
 */
export function validateWithError<T extends z.ZodSchema>(
  schema: T,
  data: unknown,
  socket: any,
  eventName: string = 'unknown'
): { success: true; data: z.infer<T> } | { success: false } {
  const result = baseValidatePayload(schema, data);

  if (!result.success) {
    // Type narrowing: result is { success: false; error: string }
    const errorResult = result as { success: false; error: string };
    getLogger().debug('VALIDATION', `Validation failed for ${eventName}`, {
      error: errorResult.error,
    });

    const { emitError, ErrorCodes } = getErrorHandler();
    emitError(socket, ErrorCodes.VALIDATION_INVALID_PAYLOAD, {
      message: `Invalid ${eventName} payload: ${errorResult.error}`,
    });

    return { success: false };
  }

  return { success: true, data: result.data };
}

/**
 * Create a validated event handler wrapper with error handling
 * @param schema - Zod schema for validation
 * @param handler - Event handler function (receives validated data)
 * @param socket - Socket for error emission
 * @param eventName - Event name for logging
 * @returns Wrapped handler with validation
 */
export function withValidation<T extends z.ZodSchema>(
  schema: T,
  handler: (data: z.infer<T>) => void | Promise<void>,
  socket: any,
  eventName: string = 'unknown'
): (data: unknown) => Promise<void> {
  return async (data: unknown) => {
    const result = validateWithError(schema, data, socket, eventName);
    if (!result.success) {
      return;
    }
    return handler(result.data);
  };
}

/**
 * Create a validation middleware for socket events
 * @param eventName - Name of the socket event
 * @returns Middleware function
 */
export function createValidationMiddleware(eventName: string) {
  const schema = (ClientEventSchemas as Record<string, z.ZodSchema>)[eventName];
  if (!schema) {
    getLogger().warn('VALIDATION', `No schema found for event: ${eventName}`);
    return (socket: any, data: unknown, handler: (data: unknown) => void) => handler(data);
  }

  return (socket: any, data: unknown, handler: (data: unknown) => void) => {
    const result = validateWithError(schema, data, socket, eventName);
    if (result.success) {
      return handler(result.data);
    }
  };
}

/**
 * Check if an event has a registered schema
 * @param eventName - Name of the socket event
 * @returns True if schema exists
 */
export function hasSchema(eventName: string): boolean {
  return eventName in ClientEventSchemas;
}

/**
 * Create a validation error (AppError)
 * @param message - Error message
 * @param fields - Field-level errors
 * @returns AppError instance
 */
export function createValidationError(message: string, fields?: Record<string, string>) {
  const { AppError, ErrorCodes } = getErrorHandler();
  return new AppError(ErrorCodes.VALIDATION_FAILED, {
    message,
    details: fields,
  });
}

// ==================== Legacy Compatibility Aliases ====================
// These match the old CommonJS export names for backwards compatibility

export const eventSchemas = ClientEventSchemas;

// Lowercase aliases for backwards compatibility with existing code
export {
  LanguageSchema as languageSchema,
  AvatarSchema as avatarSchema,
  GameCodeSchema as gameCodeSchema,
  UsernameSchema as usernameSchema,
  WordSchema as wordSchema,
  GridPositionSchema as gridPositionSchema,
  DifficultySchema as difficultySchema,
  BotDifficultySchema as botDifficultySchema,
  PresenceStatusSchema as presenceStatusSchema,
  CreateGameSchema as createGameSchema,
  JoinGameSchema as joinGameSchema,
  LeaveRoomSchema as leaveRoomSchema,
  StartGameSchema as startGameSchema,
  StartGameAckSchema as startGameAckSchema,
  SubmitWordSchema as submitWordSchema,
  SubmitWordVoteSchema as submitWordVoteSchema,
  SubmitPeerValidationVoteSchema as submitPeerValidationVoteSchema,
  ChatMessageSchema as chatMessageSchema,
  AddBotSchema as addBotSchema,
  RemoveBotSchema as removeBotSchema,
  HeartbeatSchema as heartbeatSchema,
  PresenceUpdateSchema as presenceUpdateSchema,
  WindowFocusChangeSchema as windowFocusChangeSchema,
  KickPlayerSchema as kickPlayerSchema,
  TransferHostSchema as transferHostSchema,
  CreateTournamentSchema as createTournamentSchema,
  GetWordsForBoardSchema as getWordsForBoardSchema,
  ResetGameSchema as resetGameSchema,
  CloseRoomSchema as closeRoomSchema,
  ReconnectSchema as reconnectSchema,
  UpdateGameSettingsSchema as updateGameSettingsSchema,
  BroadcastShufflingGridSchema as broadcastShufflingGridSchema,
} from '../../shared/schemas/socketSchemas';
