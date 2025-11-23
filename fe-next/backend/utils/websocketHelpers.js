// WebSocket utility functions for safe and efficient message sending

/**
 * Safely send a message to a WebSocket connection
 * @param {WebSocket} ws - WebSocket connection
 * @param {Object} message - Message object to send
 * @param {string} context - Context for logging (e.g., "host", "player")
 * @returns {boolean} - True if sent successfully, false otherwise
 */
function safeSend(ws, message, context = 'client') {
  if (!ws) {
    console.warn(`[WS] Cannot send to ${context}: WebSocket is null`);
    return false;
  }

  if (ws.readyState !== 1) { // 1 = OPEN
    console.warn(`[WS] Cannot send to ${context}: WebSocket not open (state: ${ws.readyState})`);
    return false;
  }

  try {
    const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
    ws.send(messageStr);
    return true;
  } catch (error) {
    console.error(`[WS] Error sending to ${context}:`, error.message);
    return false;
  }
}

/**
 * Broadcast a message to multiple WebSocket connections efficiently
 * @param {Map<string, WebSocket>|Object} connections - Map or object of username -> WebSocket
 * @param {Object} message - Message object to broadcast
 * @param {string} context - Context for logging
 * @returns {Object} - Statistics about the broadcast
 */
function broadcast(connections, message, context = 'broadcast') {
  const messageStr = JSON.stringify(message);
  let sentCount = 0;
  let failedCount = 0;
  let totalCount = 0;

  // Handle both Map and plain object
  const entries = connections instanceof Map
    ? Array.from(connections.entries())
    : Object.entries(connections);

  entries.forEach(([identifier, ws]) => {
    totalCount++;
    if (ws && ws.readyState === 1) { // 1 = OPEN
      try {
        ws.send(messageStr);
        sentCount++;
      } catch (error) {
        console.error(`[WS] Error in ${context} to ${identifier}:`, error.message);
        failedCount++;
      }
    }
  });

  // Log summary
  if (sentCount > 0) {
    console.log(`[${context}] ${message.action} sent to ${sentCount}/${totalCount} connections`);
  }
  if (failedCount > 0) {
    console.warn(`[${context}] Failed to send ${message.action} to ${failedCount} connections`);
  }

  return { sentCount, failedCount, totalCount };
}

/**
 * Filter connections to only include open ones
 * @param {Map<string, WebSocket>|Object} connections - Connections to filter
 * @returns {Array} - Array of [identifier, ws] for open connections
 */
function getOpenConnections(connections) {
  const entries = connections instanceof Map
    ? Array.from(connections.entries())
    : Object.entries(connections);

  return entries.filter(([_, ws]) => ws && ws.readyState === 1);
}

/**
 * Check if a WebSocket connection is open
 * @param {WebSocket} ws - WebSocket to check
 * @returns {boolean} - True if open, false otherwise
 */
function isConnectionOpen(ws) {
  return ws && ws.readyState === 1;
}

/**
 * Close a WebSocket connection gracefully
 * @param {WebSocket} ws - WebSocket to close
 * @param {number} code - Close code (default: 1000 = normal closure)
 * @param {string} reason - Close reason
 */
function closeConnection(ws, code = 1000, reason = 'Normal closure') {
  if (ws && ws.readyState <= 1) { // CONNECTING or OPEN
    try {
      ws.close(code, reason);
    } catch (error) {
      console.error('[WS] Error closing connection:', error.message);
    }
  }
}

module.exports = {
  safeSend,
  broadcast,
  getOpenConnections,
  isConnectionOpen,
  closeConnection
};
