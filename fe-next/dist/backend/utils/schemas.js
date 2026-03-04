"use strict";
/**
 * Socket Schemas - CommonJS Bridge
 *
 * Single source of truth: imports from shared/schemas/socketSchemas.ts
 * This file is compiled to CommonJS for Node.js compatibility.
 *
 * Build: npm run build:schemas
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.leaveRoomSchema = exports.joinGameSchema = exports.createGameSchema = exports.presenceStatusSchema = exports.botDifficultySchema = exports.difficultySchema = exports.gridPositionSchema = exports.wordSchema = exports.usernameSchema = exports.gameCodeSchema = exports.avatarSchema = exports.languageSchema = exports.eventSchemas = exports.getEventSchema = exports.safeValidateSocketEvent = exports.validateSocketEvent = exports.validatePayload = exports.ClientEventSchemas = exports.BroadcastShufflingGridSchema = exports.UpdateGameSettingsSchema = exports.ReconnectSchema = exports.CloseRoomSchema = exports.ResetGameSchema = exports.GetWordsForBoardSchema = exports.CreateTournamentSchema = exports.TransferHostSchema = exports.KickPlayerSchema = exports.WindowFocusChangeSchema = exports.PresenceUpdateSchema = exports.HeartbeatSchema = exports.RemoveBotSchema = exports.AddBotSchema = exports.ChatMessageSchema = exports.SubmitPeerValidationVoteSchema = exports.SubmitWordVoteSchema = exports.SubmitWordSchema = exports.StartGameAckSchema = exports.StartGameSchema = exports.LeaveRoomSchema = exports.JoinGameSchema = exports.CreateGameSchema = exports.PresenceStatusSchema = exports.BotDifficultySchema = exports.DifficultySchema = exports.GridPositionSchema = exports.WordSchema = exports.UsernameSchema = exports.GameCodeSchema = exports.AvatarSchema = exports.LanguageSchema = void 0;
exports.broadcastShufflingGridSchema = exports.updateGameSettingsSchema = exports.reconnectSchema = exports.closeRoomSchema = exports.resetGameSchema = exports.getWordsForBoardSchema = exports.createTournamentSchema = exports.transferHostSchema = exports.kickPlayerSchema = exports.windowFocusChangeSchema = exports.presenceUpdateSchema = exports.heartbeatSchema = exports.removeBotSchema = exports.addBotSchema = exports.chatMessageSchema = exports.submitPeerValidationVoteSchema = exports.submitWordVoteSchema = exports.submitWordSchema = exports.startGameAckSchema = exports.startGameSchema = void 0;
exports.validateWithError = validateWithError;
exports.withValidation = withValidation;
exports.createValidationMiddleware = createValidationMiddleware;
exports.hasSchema = hasSchema;
exports.createValidationError = createValidationError;
// Re-export all schemas from shared source of truth
var socketSchemas_1 = require("../../shared/schemas/socketSchemas");
// Base schemas
Object.defineProperty(exports, "LanguageSchema", { enumerable: true, get: function () { return socketSchemas_1.LanguageSchema; } });
Object.defineProperty(exports, "AvatarSchema", { enumerable: true, get: function () { return socketSchemas_1.AvatarSchema; } });
Object.defineProperty(exports, "GameCodeSchema", { enumerable: true, get: function () { return socketSchemas_1.GameCodeSchema; } });
Object.defineProperty(exports, "UsernameSchema", { enumerable: true, get: function () { return socketSchemas_1.UsernameSchema; } });
Object.defineProperty(exports, "WordSchema", { enumerable: true, get: function () { return socketSchemas_1.WordSchema; } });
Object.defineProperty(exports, "GridPositionSchema", { enumerable: true, get: function () { return socketSchemas_1.GridPositionSchema; } });
Object.defineProperty(exports, "DifficultySchema", { enumerable: true, get: function () { return socketSchemas_1.DifficultySchema; } });
Object.defineProperty(exports, "BotDifficultySchema", { enumerable: true, get: function () { return socketSchemas_1.BotDifficultySchema; } });
Object.defineProperty(exports, "PresenceStatusSchema", { enumerable: true, get: function () { return socketSchemas_1.PresenceStatusSchema; } });
// Event schemas
Object.defineProperty(exports, "CreateGameSchema", { enumerable: true, get: function () { return socketSchemas_1.CreateGameSchema; } });
Object.defineProperty(exports, "JoinGameSchema", { enumerable: true, get: function () { return socketSchemas_1.JoinGameSchema; } });
Object.defineProperty(exports, "LeaveRoomSchema", { enumerable: true, get: function () { return socketSchemas_1.LeaveRoomSchema; } });
Object.defineProperty(exports, "StartGameSchema", { enumerable: true, get: function () { return socketSchemas_1.StartGameSchema; } });
Object.defineProperty(exports, "StartGameAckSchema", { enumerable: true, get: function () { return socketSchemas_1.StartGameAckSchema; } });
Object.defineProperty(exports, "SubmitWordSchema", { enumerable: true, get: function () { return socketSchemas_1.SubmitWordSchema; } });
Object.defineProperty(exports, "SubmitWordVoteSchema", { enumerable: true, get: function () { return socketSchemas_1.SubmitWordVoteSchema; } });
Object.defineProperty(exports, "SubmitPeerValidationVoteSchema", { enumerable: true, get: function () { return socketSchemas_1.SubmitPeerValidationVoteSchema; } });
Object.defineProperty(exports, "ChatMessageSchema", { enumerable: true, get: function () { return socketSchemas_1.ChatMessageSchema; } });
Object.defineProperty(exports, "AddBotSchema", { enumerable: true, get: function () { return socketSchemas_1.AddBotSchema; } });
Object.defineProperty(exports, "RemoveBotSchema", { enumerable: true, get: function () { return socketSchemas_1.RemoveBotSchema; } });
Object.defineProperty(exports, "HeartbeatSchema", { enumerable: true, get: function () { return socketSchemas_1.HeartbeatSchema; } });
Object.defineProperty(exports, "PresenceUpdateSchema", { enumerable: true, get: function () { return socketSchemas_1.PresenceUpdateSchema; } });
Object.defineProperty(exports, "WindowFocusChangeSchema", { enumerable: true, get: function () { return socketSchemas_1.WindowFocusChangeSchema; } });
Object.defineProperty(exports, "KickPlayerSchema", { enumerable: true, get: function () { return socketSchemas_1.KickPlayerSchema; } });
Object.defineProperty(exports, "TransferHostSchema", { enumerable: true, get: function () { return socketSchemas_1.TransferHostSchema; } });
Object.defineProperty(exports, "CreateTournamentSchema", { enumerable: true, get: function () { return socketSchemas_1.CreateTournamentSchema; } });
Object.defineProperty(exports, "GetWordsForBoardSchema", { enumerable: true, get: function () { return socketSchemas_1.GetWordsForBoardSchema; } });
Object.defineProperty(exports, "ResetGameSchema", { enumerable: true, get: function () { return socketSchemas_1.ResetGameSchema; } });
Object.defineProperty(exports, "CloseRoomSchema", { enumerable: true, get: function () { return socketSchemas_1.CloseRoomSchema; } });
Object.defineProperty(exports, "ReconnectSchema", { enumerable: true, get: function () { return socketSchemas_1.ReconnectSchema; } });
Object.defineProperty(exports, "UpdateGameSettingsSchema", { enumerable: true, get: function () { return socketSchemas_1.UpdateGameSettingsSchema; } });
Object.defineProperty(exports, "BroadcastShufflingGridSchema", { enumerable: true, get: function () { return socketSchemas_1.BroadcastShufflingGridSchema; } });
// Schema map and utilities
Object.defineProperty(exports, "ClientEventSchemas", { enumerable: true, get: function () { return socketSchemas_1.ClientEventSchemas; } });
Object.defineProperty(exports, "validatePayload", { enumerable: true, get: function () { return socketSchemas_1.validatePayload; } });
Object.defineProperty(exports, "validateSocketEvent", { enumerable: true, get: function () { return socketSchemas_1.validateSocketEvent; } });
Object.defineProperty(exports, "safeValidateSocketEvent", { enumerable: true, get: function () { return socketSchemas_1.safeValidateSocketEvent; } });
Object.defineProperty(exports, "getEventSchema", { enumerable: true, get: function () { return socketSchemas_1.getEventSchema; } });
const socketSchemas_2 = require("../../shared/schemas/socketSchemas");
// Import error handler for backend-specific integration
// Using dynamic import to avoid circular dependency
let errorHandler = null;
let logger = null;
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
function validateWithError(schema, data, socket, eventName = 'unknown') {
    const result = (0, socketSchemas_2.validatePayload)(schema, data);
    if (!result.success) {
        // Type narrowing: result is { success: false; error: string }
        const errorResult = result;
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
 * @param eventName - Name of the socket event
 * @returns Middleware function
 */
function createValidationMiddleware(eventName) {
    const schema = socketSchemas_2.ClientEventSchemas[eventName];
    if (!schema) {
        getLogger().warn('VALIDATION', `No schema found for event: ${eventName}`);
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
 * Check if an event has a registered schema
 * @param eventName - Name of the socket event
 * @returns True if schema exists
 */
function hasSchema(eventName) {
    return eventName in socketSchemas_2.ClientEventSchemas;
}
/**
 * Create a validation error (AppError)
 * @param message - Error message
 * @param fields - Field-level errors
 * @returns AppError instance
 */
function createValidationError(message, fields) {
    const { AppError, ErrorCodes } = getErrorHandler();
    return new AppError(ErrorCodes.VALIDATION_FAILED, {
        message,
        details: fields,
    });
}
// ==================== Legacy Compatibility Aliases ====================
// These match the old CommonJS export names for backwards compatibility
exports.eventSchemas = socketSchemas_2.ClientEventSchemas;
// Lowercase aliases for backwards compatibility with existing code
var socketSchemas_3 = require("../../shared/schemas/socketSchemas");
Object.defineProperty(exports, "languageSchema", { enumerable: true, get: function () { return socketSchemas_3.LanguageSchema; } });
Object.defineProperty(exports, "avatarSchema", { enumerable: true, get: function () { return socketSchemas_3.AvatarSchema; } });
Object.defineProperty(exports, "gameCodeSchema", { enumerable: true, get: function () { return socketSchemas_3.GameCodeSchema; } });
Object.defineProperty(exports, "usernameSchema", { enumerable: true, get: function () { return socketSchemas_3.UsernameSchema; } });
Object.defineProperty(exports, "wordSchema", { enumerable: true, get: function () { return socketSchemas_3.WordSchema; } });
Object.defineProperty(exports, "gridPositionSchema", { enumerable: true, get: function () { return socketSchemas_3.GridPositionSchema; } });
Object.defineProperty(exports, "difficultySchema", { enumerable: true, get: function () { return socketSchemas_3.DifficultySchema; } });
Object.defineProperty(exports, "botDifficultySchema", { enumerable: true, get: function () { return socketSchemas_3.BotDifficultySchema; } });
Object.defineProperty(exports, "presenceStatusSchema", { enumerable: true, get: function () { return socketSchemas_3.PresenceStatusSchema; } });
Object.defineProperty(exports, "createGameSchema", { enumerable: true, get: function () { return socketSchemas_3.CreateGameSchema; } });
Object.defineProperty(exports, "joinGameSchema", { enumerable: true, get: function () { return socketSchemas_3.JoinGameSchema; } });
Object.defineProperty(exports, "leaveRoomSchema", { enumerable: true, get: function () { return socketSchemas_3.LeaveRoomSchema; } });
Object.defineProperty(exports, "startGameSchema", { enumerable: true, get: function () { return socketSchemas_3.StartGameSchema; } });
Object.defineProperty(exports, "startGameAckSchema", { enumerable: true, get: function () { return socketSchemas_3.StartGameAckSchema; } });
Object.defineProperty(exports, "submitWordSchema", { enumerable: true, get: function () { return socketSchemas_3.SubmitWordSchema; } });
Object.defineProperty(exports, "submitWordVoteSchema", { enumerable: true, get: function () { return socketSchemas_3.SubmitWordVoteSchema; } });
Object.defineProperty(exports, "submitPeerValidationVoteSchema", { enumerable: true, get: function () { return socketSchemas_3.SubmitPeerValidationVoteSchema; } });
Object.defineProperty(exports, "chatMessageSchema", { enumerable: true, get: function () { return socketSchemas_3.ChatMessageSchema; } });
Object.defineProperty(exports, "addBotSchema", { enumerable: true, get: function () { return socketSchemas_3.AddBotSchema; } });
Object.defineProperty(exports, "removeBotSchema", { enumerable: true, get: function () { return socketSchemas_3.RemoveBotSchema; } });
Object.defineProperty(exports, "heartbeatSchema", { enumerable: true, get: function () { return socketSchemas_3.HeartbeatSchema; } });
Object.defineProperty(exports, "presenceUpdateSchema", { enumerable: true, get: function () { return socketSchemas_3.PresenceUpdateSchema; } });
Object.defineProperty(exports, "windowFocusChangeSchema", { enumerable: true, get: function () { return socketSchemas_3.WindowFocusChangeSchema; } });
Object.defineProperty(exports, "kickPlayerSchema", { enumerable: true, get: function () { return socketSchemas_3.KickPlayerSchema; } });
Object.defineProperty(exports, "transferHostSchema", { enumerable: true, get: function () { return socketSchemas_3.TransferHostSchema; } });
Object.defineProperty(exports, "createTournamentSchema", { enumerable: true, get: function () { return socketSchemas_3.CreateTournamentSchema; } });
Object.defineProperty(exports, "getWordsForBoardSchema", { enumerable: true, get: function () { return socketSchemas_3.GetWordsForBoardSchema; } });
Object.defineProperty(exports, "resetGameSchema", { enumerable: true, get: function () { return socketSchemas_3.ResetGameSchema; } });
Object.defineProperty(exports, "closeRoomSchema", { enumerable: true, get: function () { return socketSchemas_3.CloseRoomSchema; } });
Object.defineProperty(exports, "reconnectSchema", { enumerable: true, get: function () { return socketSchemas_3.ReconnectSchema; } });
Object.defineProperty(exports, "updateGameSettingsSchema", { enumerable: true, get: function () { return socketSchemas_3.UpdateGameSettingsSchema; } });
Object.defineProperty(exports, "broadcastShufflingGridSchema", { enumerable: true, get: function () { return socketSchemas_3.BroadcastShufflingGridSchema; } });
