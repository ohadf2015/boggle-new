/**
 * Correlation ID Utility
 *
 * Provides request correlation for distributed tracing and debugging.
 * Each request gets a unique ID that follows it through the system.
 *
 * Usage:
 *   // In socket handler
 *   socket.on('submitWord', withCorrelation(socket, async (data, correlationId) => {
 *     logger.info('WORD', `[${correlationId}] Processing word`);
 *   }));
 *
 *   // Or manually
 *   const correlationId = generateCorrelationId();
 *   socket.data.correlationId = correlationId;
 */

const crypto = require('crypto');
const logger = require('./logger');

// ==========================================
// Correlation ID Generation
// ==========================================

/**
 * Generate a unique correlation ID
 * Format: req_{timestamp}_{randomHex}
 * @returns {string} Correlation ID
 */
function generateCorrelationId() {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(4).toString('hex');
  return `req_${timestamp}_${random}`;
}

/**
 * Generate a short correlation ID (for logging)
 * Format: {randomHex}
 * @returns {string} Short correlation ID
 */
function generateShortId() {
  return crypto.randomBytes(4).toString('hex');
}

// ==========================================
// Socket Handler Wrappers
// ==========================================

/**
 * Wrap a socket handler with correlation ID tracking and error handling
 * @param {Socket} socket - Socket.IO socket instance
 * @param {Function} handler - Async handler function (data, correlationId) => Promise<void>
 * @returns {Function} Wrapped handler
 */
function withCorrelation(socket, handler) {
  return async (data) => {
    const correlationId = generateCorrelationId();
    socket.data = socket.data || {};
    socket.data.correlationId = correlationId;

    const startTime = Date.now();

    try {
      await handler(data, correlationId);
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('SOCKET', `[${correlationId}] Handler error after ${duration}ms`, error);

      // Emit error to client with correlation ID for support reference
      socket.emit('error', {
        message: 'An error occurred processing your request',
        correlationId,
        // Only include details in development
        ...(process.env.NODE_ENV !== 'production' && { details: error.message }),
      });
    }
  };
}

/**
 * Wrap a socket handler with correlation ID but without try-catch
 * Use when you want to handle errors yourself
 * @param {Socket} socket - Socket.IO socket instance
 * @param {Function} handler - Handler function (data, correlationId) => void
 * @returns {Function} Wrapped handler
 */
function withCorrelationId(socket, handler) {
  return (data) => {
    const correlationId = generateCorrelationId();
    socket.data = socket.data || {};
    socket.data.correlationId = correlationId;
    return handler(data, correlationId);
  };
}

// ==========================================
// Correlation Context
// ==========================================

/**
 * Get correlation ID from socket
 * @param {Socket} socket - Socket.IO socket instance
 * @returns {string|null} Correlation ID or null
 */
function getCorrelationId(socket) {
  return socket?.data?.correlationId || null;
}

/**
 * Set correlation ID on socket
 * @param {Socket} socket - Socket.IO socket instance
 * @param {string} correlationId - Correlation ID to set
 */
function setCorrelationId(socket, correlationId) {
  socket.data = socket.data || {};
  socket.data.correlationId = correlationId;
}

/**
 * Create a child correlation ID (for sub-operations)
 * @param {string} parentId - Parent correlation ID
 * @returns {string} Child correlation ID
 */
function createChildCorrelationId(parentId) {
  const childSuffix = crypto.randomBytes(2).toString('hex');
  return `${parentId}:${childSuffix}`;
}

// ==========================================
// Logging Helpers
// ==========================================

/**
 * Create a logger wrapper that includes correlation ID
 * @param {string} correlationId - Correlation ID
 * @returns {Object} Logger with correlation ID prefix
 */
function createCorrelatedLogger(correlationId) {
  const prefix = `[${correlationId}]`;
  return {
    info: (category, message, ...args) => logger.info(category, `${prefix} ${message}`, ...args),
    warn: (category, message, ...args) => logger.warn(category, `${prefix} ${message}`, ...args),
    error: (category, message, ...args) => logger.error(category, `${prefix} ${message}`, ...args),
    debug: (category, message, ...args) => logger.debug(category, `${prefix} ${message}`, ...args),
  };
}

// ==========================================
// Exports
// ==========================================

module.exports = {
  generateCorrelationId,
  generateShortId,
  withCorrelation,
  withCorrelationId,
  getCorrelationId,
  setCorrelationId,
  createChildCorrelationId,
  createCorrelatedLogger,
};
