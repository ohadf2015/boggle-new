/**
 * Socket.IO Helper Functions
 * Utility functions for Socket.IO communication patterns
 */

/**
 * Safely emit an event to a socket
 * @param {Socket} socket - Socket.IO socket instance
 * @param {string} event - Event name
 * @param {object} data - Data to send
 * @returns {boolean} - Whether emit was successful
 */
function safeEmit(socket, event, data) {
  try {
    if (socket && socket.connected) {
      socket.emit(event, data);
      return true;
    }
    return false;
  } catch (error) {
    console.error('[SOCKET] Error emitting to socket:', error.message);
    return false;
  }
}

/**
 * Broadcast to all sockets in a room
 * @param {Server} io - Socket.IO server instance
 * @param {string} room - Room name/ID
 * @param {string} event - Event name
 * @param {object} data - Data to broadcast
 */
function broadcastToRoom(io, room, event, data) {
  try {
    io.to(room).emit(event, data);
  } catch (error) {
    console.error('[SOCKET] Error broadcasting to room:', error.message);
  }
}

/**
 * Broadcast to all sockets in a room except the sender
 * @param {Socket} socket - Sender's socket
 * @param {string} room - Room name/ID
 * @param {string} event - Event name
 * @param {object} data - Data to broadcast
 */
function broadcastToRoomExceptSender(socket, room, event, data) {
  try {
    socket.to(room).emit(event, data);
  } catch (error) {
    console.error('[SOCKET] Error broadcasting to room except sender:', error.message);
  }
}

/**
 * Get all sockets in a room
 * @param {Server} io - Socket.IO server instance
 * @param {string} room - Room name/ID
 * @returns {Promise<Set<string>>} - Set of socket IDs in the room
 */
async function getSocketsInRoom(io, room) {
  try {
    return await io.in(room).allSockets();
  } catch (error) {
    console.error('[SOCKET] Error getting sockets in room:', error.message);
    return new Set();
  }
}

/**
 * Get count of sockets in a room
 * @param {Server} io - Socket.IO server instance
 * @param {string} room - Room name/ID
 * @returns {Promise<number>} - Number of sockets in the room
 */
async function getRoomSize(io, room) {
  const sockets = await getSocketsInRoom(io, room);
  return sockets.size;
}

/**
 * Check if a socket is in a specific room
 * @param {Socket} socket - Socket.IO socket instance
 * @param {string} room - Room name/ID
 * @returns {boolean} - Whether socket is in room
 */
function isInRoom(socket, room) {
  return socket.rooms.has(room);
}

/**
 * Join a socket to a room
 * @param {Socket} socket - Socket.IO socket instance
 * @param {string} room - Room name/ID
 */
function joinRoom(socket, room) {
  socket.join(room);
}

/**
 * Leave a room
 * @param {Socket} socket - Socket.IO socket instance
 * @param {string} room - Room name/ID
 */
function leaveRoom(socket, room) {
  socket.leave(room);
}

/**
 * Leave all game rooms (rooms starting with "game:")
 * @param {Socket} socket - Socket.IO socket instance
 */
function leaveAllGameRooms(socket) {
  for (const room of socket.rooms) {
    if (room.startsWith('game:')) {
      socket.leave(room);
    }
  }
}

/**
 * Get the game room name from a game code
 * @param {string} gameCode - The game code
 * @returns {string} - The room name
 */
function getGameRoom(gameCode) {
  return `game:${gameCode}`;
}

/**
 * Emit to all connected sockets
 * @param {Server} io - Socket.IO server instance
 * @param {string} event - Event name
 * @param {object} data - Data to broadcast
 */
function broadcastToAll(io, event, data) {
  try {
    io.emit(event, data);
  } catch (error) {
    console.error('[SOCKET] Error broadcasting to all:', error.message);
  }
}

/**
 * Get a socket by its ID
 * @param {Server} io - Socket.IO server instance
 * @param {string} socketId - Socket ID
 * @returns {Socket|null} - The socket instance or null
 */
function getSocketById(io, socketId) {
  return io.sockets.sockets.get(socketId) || null;
}

/**
 * Disconnect a socket gracefully
 * @param {Socket} socket - Socket.IO socket instance
 * @param {boolean} close - Whether to close the underlying connection
 */
function disconnectSocket(socket, close = false) {
  try {
    if (socket && socket.connected) {
      socket.disconnect(close);
    }
  } catch (error) {
    console.error('[SOCKET] Error disconnecting socket:', error.message);
  }
}

module.exports = {
  safeEmit,
  broadcastToRoom,
  broadcastToRoomExceptSender,
  getSocketsInRoom,
  getRoomSize,
  isInRoom,
  joinRoom,
  leaveRoom,
  leaveAllGameRooms,
  getGameRoom,
  broadcastToAll,
  getSocketById,
  disconnectSocket
};
