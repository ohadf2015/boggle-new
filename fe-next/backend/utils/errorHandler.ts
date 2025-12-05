/**
 * Standardized Error Handling for Socket.IO
 * Provides consistent error messages across all socket handlers
 */

import type { Socket } from 'socket.io';

export interface ErrorPayload {
  message: string;
  code?: string;
}

export type ErrorCode =
  | 'INVALID_GAME_CODE'
  | 'GAME_NOT_FOUND'
  | 'NOT_IN_GAME'
  | 'USERNAME_REQUIRED'
  | 'ROOM_FULL'
  | 'ONLY_HOST_CAN_START'
  | 'ONLY_HOST_CAN_END'
  | 'RATE_LIMIT_EXCEEDED'
  | 'INVALID_WORD_SUBMISSION'
  | 'INVALID_MESSAGE'
  | 'GAME_NOT_IN_PROGRESS';

/**
 * Send a standardized error to a socket
 * @param socket - The socket to emit the error to
 * @param message - The error message
 * @param code - Optional error code for client-side handling
 */
export function emitError(socket: Socket, message: string, code?: string | null): void {
  const errorPayload: ErrorPayload = { message };
  if (code) {
    errorPayload.code = code;
  }
  socket.emit('error', errorPayload);
}

/**
 * Common error messages
 */
export const ErrorMessages = {
  INVALID_GAME_CODE: 'Invalid game code',
  GAME_NOT_FOUND: 'Game not found',
  NOT_IN_GAME: 'Not in a game',
  USERNAME_REQUIRED: 'Game code and username are required',
  ROOM_FULL: (max: number): string => `Room is full (maximum ${max} players)`,
  ONLY_HOST_CAN_START: 'Only host can start the game',
  ONLY_HOST_CAN_END: 'Only host can end the game',
  RATE_LIMIT_EXCEEDED: 'Rate limit exceeded. Please slow down.',
  INVALID_WORD_SUBMISSION: 'Invalid word submission - missing required fields',
  INVALID_MESSAGE: 'Invalid message',
  GAME_NOT_IN_PROGRESS: 'Game is not in progress'
} as const;

// CommonJS compatibility
module.exports = {
  emitError,
  ErrorMessages
};
