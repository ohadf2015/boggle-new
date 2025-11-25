/**
 * Standardized Error Handling for Socket.IO
 * Provides consistent error messages across all socket handlers
 */

/**
 * Send a standardized error to a socket
 * @param {Socket} socket - The socket to emit the error to
 * @param {string} message - The error message
 * @param {string} code - Optional error code for client-side handling
 */
function emitError(socket, message, code = null) {
  const errorPayload = { message };
  if (code) {
    errorPayload.code = code;
  }
  socket.emit('error', errorPayload);
}

/**
 * Common error messages
 */
const ErrorMessages = {
  INVALID_GAME_CODE: 'Invalid game code',
  GAME_NOT_FOUND: 'Game not found',
  NOT_IN_GAME: 'Not in a game',
  USERNAME_REQUIRED: 'Game code and username are required',
  ROOM_FULL: (max) => `Room is full (maximum ${max} players)`,
  ONLY_HOST_CAN_START: 'Only host can start the game',
  ONLY_HOST_CAN_END: 'Only host can end the game',
  RATE_LIMIT_EXCEEDED: 'Rate limit exceeded. Please slow down.'
};

module.exports = {
  emitError,
  ErrorMessages
};
