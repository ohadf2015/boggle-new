/**
 * Socket Event Validator
 * Runtime validation for socket events using Zod-like validation
 * This is a CommonJS implementation for the Node.js backend
 */

const logger = require('./logger');

// ==================== Validation Schemas ====================

/**
 * Common validation patterns
 */
const patterns = {
  gameCode: /^[A-Z0-9]{4}$/,
  username: /^[a-zA-Z0-9_\-\u0590-\u05FF\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]{1,20}$/,
  hexColor: /^#[0-9A-Fa-f]{6}$/,
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
};

const validLanguages = ['he', 'en', 'sv', 'ja', 'es', 'fr', 'de'];
const validDifficulties = ['easy', 'medium', 'hard', 'EASY', 'MEDIUM', 'HARD'];

/**
 * Validate a single field with type and constraints
 */
function validateField(value, rules, fieldName) {
  const errors = [];

  // Check required
  if (rules.required && (value === undefined || value === null)) {
    errors.push(`${fieldName} is required`);
    return errors;
  }

  // Skip validation if optional and not provided
  if (!rules.required && (value === undefined || value === null)) {
    return errors;
  }

  // Type validation
  if (rules.type === 'string') {
    if (typeof value !== 'string') {
      errors.push(`${fieldName} must be a string`);
      return errors;
    }
    if (rules.min !== undefined && value.length < rules.min) {
      errors.push(`${fieldName} must be at least ${rules.min} characters`);
    }
    if (rules.max !== undefined && value.length > rules.max) {
      errors.push(`${fieldName} must be at most ${rules.max} characters`);
    }
    if (rules.pattern && !rules.pattern.test(value)) {
      errors.push(`${fieldName} has invalid format`);
    }
    if (rules.enum && !rules.enum.includes(value)) {
      errors.push(`${fieldName} must be one of: ${rules.enum.join(', ')}`);
    }
  }

  if (rules.type === 'number') {
    if (typeof value !== 'number' || isNaN(value)) {
      errors.push(`${fieldName} must be a number`);
      return errors;
    }
    if (rules.min !== undefined && value < rules.min) {
      errors.push(`${fieldName} must be at least ${rules.min}`);
    }
    if (rules.max !== undefined && value > rules.max) {
      errors.push(`${fieldName} must be at most ${rules.max}`);
    }
    if (rules.integer && !Number.isInteger(value)) {
      errors.push(`${fieldName} must be an integer`);
    }
  }

  if (rules.type === 'boolean') {
    if (typeof value !== 'boolean') {
      errors.push(`${fieldName} must be a boolean`);
    }
  }

  if (rules.type === 'array') {
    if (!Array.isArray(value)) {
      errors.push(`${fieldName} must be an array`);
      return errors;
    }
    if (rules.min !== undefined && value.length < rules.min) {
      errors.push(`${fieldName} must have at least ${rules.min} items`);
    }
    if (rules.max !== undefined && value.length > rules.max) {
      errors.push(`${fieldName} must have at most ${rules.max} items`);
    }
  }

  if (rules.type === 'object') {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      errors.push(`${fieldName} must be an object`);
    }
  }

  return errors;
}

// ==================== Event Schemas ====================

const schemas = {
  createGame: {
    gameCode: { type: 'string', required: true, pattern: patterns.gameCode },
    roomName: { type: 'string', required: false, max: 50 },
    language: { type: 'string', required: false, enum: validLanguages },
    hostUsername: { type: 'string', required: true, pattern: patterns.username },
    playerId: { type: 'string', required: false, max: 64 },
    authUserId: { type: 'string', required: false, pattern: patterns.uuid },
    guestTokenHash: { type: 'string', required: false, max: 128 },
    isRanked: { type: 'boolean', required: false },
  },

  join: {
    gameCode: { type: 'string', required: true, pattern: patterns.gameCode },
    username: { type: 'string', required: true, pattern: patterns.username },
    playerId: { type: 'string', required: false, max: 64 },
    authUserId: { type: 'string', required: false, pattern: patterns.uuid },
    guestTokenHash: { type: 'string', required: false, max: 128 },
  },

  leaveRoom: {
    gameCode: { type: 'string', required: true, pattern: patterns.gameCode },
    username: { type: 'string', required: true, pattern: patterns.username },
  },

  submitWord: {
    gameCode: { type: 'string', required: true, pattern: patterns.gameCode },
    username: { type: 'string', required: true, pattern: patterns.username },
    word: { type: 'string', required: true, min: 1, max: 50 },
    path: { type: 'array', required: false },
  },

  submitWordVote: {
    gameCode: { type: 'string', required: true, pattern: patterns.gameCode },
    word: { type: 'string', required: true, min: 1, max: 50 },
    isValid: { type: 'boolean', required: true },
    language: { type: 'string', required: true, enum: validLanguages },
  },

  sendChatMessage: {
    gameCode: { type: 'string', required: true, pattern: patterns.gameCode },
    username: { type: 'string', required: true, pattern: patterns.username },
    message: { type: 'string', required: true, min: 1, max: 500 },
  },

  addBot: {
    gameCode: { type: 'string', required: true, pattern: patterns.gameCode },
    difficulty: { type: 'string', required: false, enum: ['easy', 'medium', 'hard'] },
  },

  removeBot: {
    gameCode: { type: 'string', required: true, pattern: patterns.gameCode },
    botUsername: { type: 'string', required: true, pattern: patterns.username },
  },

  startGame: {
    gameCode: { type: 'string', required: true, pattern: patterns.gameCode },
    letterGrid: { type: 'array', required: true },
    timerSeconds: { type: 'number', required: false, min: 30, max: 600, integer: true },
    difficulty: { type: 'string', required: false, enum: ['EASY', 'MEDIUM', 'HARD'] },
    minWordLength: { type: 'number', required: false, min: 2, max: 5, integer: true },
  },

  startGameAck: {
    messageId: { type: 'string', required: true },
  },

  heartbeat: {
    gameCode: { type: 'string', required: false, pattern: patterns.gameCode },
    username: { type: 'string', required: false, pattern: patterns.username },
    timestamp: { type: 'number', required: false },
  },

  presenceUpdate: {
    gameCode: { type: 'string', required: true, pattern: patterns.gameCode },
    username: { type: 'string', required: true, pattern: patterns.username },
    isWindowFocused: { type: 'boolean', required: true },
    lastActivityAt: { type: 'number', required: false },
  },

  windowFocusChange: {
    gameCode: { type: 'string', required: true, pattern: patterns.gameCode },
    username: { type: 'string', required: true, pattern: patterns.username },
    isFocused: { type: 'boolean', required: true },
  },

  kickPlayer: {
    gameCode: { type: 'string', required: true, pattern: patterns.gameCode },
    username: { type: 'string', required: true, pattern: patterns.username },
  },

  transferHost: {
    gameCode: { type: 'string', required: true, pattern: patterns.gameCode },
    newHostUsername: { type: 'string', required: true, pattern: patterns.username },
  },

  createTournament: {
    gameCode: { type: 'string', required: true, pattern: patterns.gameCode },
    name: { type: 'string', required: true, min: 1, max: 50 },
    totalRounds: { type: 'number', required: false, min: 1, max: 10, integer: true },
  },

  getWordsForBoard: {
    language: { type: 'string', required: true, enum: validLanguages },
  },

  resetGame: {
    gameCode: { type: 'string', required: true, pattern: patterns.gameCode },
  },

  closeRoom: {
    gameCode: { type: 'string', required: true, pattern: patterns.gameCode },
  },

  getActiveRooms: {},

  reconnect: {
    gameCode: { type: 'string', required: true, pattern: patterns.gameCode },
    username: { type: 'string', required: true, pattern: patterns.username },
    authUserId: { type: 'string', required: false, pattern: patterns.uuid },
    guestTokenHash: { type: 'string', required: false, max: 128 },
  },

  updateGameSettings: {
    gameCode: { type: 'string', required: true, pattern: patterns.gameCode },
    settings: { type: 'object', required: true },
  },

  submitPeerValidationVote: {
    gameCode: { type: 'string', required: true, pattern: patterns.gameCode },
    isValid: { type: 'boolean', required: true },
  },

  validateWords: {
    gameCode: { type: 'string', required: true, pattern: patterns.gameCode },
  },
};

// ==================== Validation Functions ====================

/**
 * Validate socket event data
 * @param {string} eventName - The socket event name
 * @param {object} data - The event data
 * @returns {{ valid: boolean, errors: string[], sanitized: object }}
 */
function validateSocketEvent(eventName, data) {
  const schema = schemas[eventName];

  // If no schema exists, allow but log warning
  if (!schema) {
    logger.debug('SOCKET_VALIDATOR', `No schema for event: ${eventName}`);
    return { valid: true, errors: [], sanitized: data };
  }

  // Ensure data is an object
  if (typeof data !== 'object' || data === null) {
    return {
      valid: false,
      errors: ['Event data must be an object'],
      sanitized: {},
    };
  }

  const errors = [];
  const sanitized = {};

  // Validate each field in the schema
  for (const [fieldName, rules] of Object.entries(schema)) {
    const fieldErrors = validateField(data[fieldName], rules, fieldName);
    errors.push(...fieldErrors);

    // Only include fields that exist in the schema (sanitize extra fields)
    if (data[fieldName] !== undefined) {
      sanitized[fieldName] = data[fieldName];
    } else if (rules.default !== undefined) {
      sanitized[fieldName] = rules.default;
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitized,
  };
}

/**
 * Create a validation middleware for socket handlers
 * @param {string} eventName - The event to validate
 * @returns {function} - Middleware function that validates and sanitizes data
 */
function createValidator(eventName) {
  return function validate(data) {
    const result = validateSocketEvent(eventName, data);

    if (!result.valid) {
      logger.warn('SOCKET_VALIDATOR', `Validation failed for ${eventName}`, {
        errors: result.errors,
        receivedData: typeof data === 'object' ? Object.keys(data || {}) : typeof data,
      });
    }

    return result;
  };
}

/**
 * Wraps a socket handler with validation
 * @param {string} eventName - The event name
 * @param {function} handler - The handler function (socket, data, io) => void
 * @returns {function} - Wrapped handler with validation
 */
function withValidation(eventName, handler) {
  return function validatedHandler(data, socket, io) {
    const result = validateSocketEvent(eventName, data);

    if (!result.valid) {
      logger.warn('SOCKET_VALIDATOR', `Rejecting invalid ${eventName}`, {
        errors: result.errors,
      });

      // Emit error back to client
      socket.emit('error', {
        message: 'Invalid request data',
        code: 'VALIDATION_ERROR',
        errors: result.errors,
      });

      return;
    }

    // Call the original handler with sanitized data
    return handler(result.sanitized, socket, io);
  };
}

module.exports = {
  validateSocketEvent,
  createValidator,
  withValidation,
  schemas,
  patterns,
};
