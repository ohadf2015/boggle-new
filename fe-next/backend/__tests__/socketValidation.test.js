/**
 * Socket Validation Tests
 * Tests for Zod schema validation
 */

const {
  validatePayload,
  validateWithError,
  getEventSchema,
  hasSchema,
  createValidationError,
  createGameSchema,
  joinGameSchema,
  submitWordSchema,
  languageSchema,
  gameCodeSchema,
  usernameSchema,
  eventSchemas
} = require('../utils/socketValidation');

describe('Base Schemas', () => {
  describe('languageSchema', () => {
    it('should accept valid languages', () => {
      const validLangs = ['he', 'en', 'sv', 'ja', 'es', 'fr', 'de'];
      validLangs.forEach(lang => {
        expect(languageSchema.safeParse(lang).success).toBe(true);
      });
    });

    it('should reject invalid languages', () => {
      expect(languageSchema.safeParse('invalid').success).toBe(false);
      expect(languageSchema.safeParse('').success).toBe(false);
      expect(languageSchema.safeParse(123).success).toBe(false);
    });
  });

  describe('gameCodeSchema', () => {
    it('should accept valid game codes', () => {
      expect(gameCodeSchema.safeParse('ABCD').success).toBe(true);
      expect(gameCodeSchema.safeParse('abcd').success).toBe(true);
      expect(gameCodeSchema.safeParse('Ab12').success).toBe(true);
      expect(gameCodeSchema.safeParse('ABCDEFGHIJ').success).toBe(true);
    });

    it('should reject too short codes', () => {
      const result = gameCodeSchema.safeParse('ABC');
      expect(result.success).toBe(false);
    });

    it('should reject too long codes', () => {
      const result = gameCodeSchema.safeParse('ABCDEFGHIJK');
      expect(result.success).toBe(false);
    });

    it('should reject non-alphanumeric codes', () => {
      expect(gameCodeSchema.safeParse('AB-CD').success).toBe(false);
      expect(gameCodeSchema.safeParse('AB CD').success).toBe(false);
      expect(gameCodeSchema.safeParse('AB_CD').success).toBe(false);
    });
  });

  describe('usernameSchema', () => {
    it('should accept valid usernames', () => {
      expect(usernameSchema.safeParse('Player1').success).toBe(true);
      expect(usernameSchema.safeParse('player_name').success).toBe(true);
      expect(usernameSchema.safeParse('player-name').success).toBe(true);
    });

    it('should accept Hebrew usernames', () => {
      expect(usernameSchema.safeParse('שחקן').success).toBe(true);
    });

    it('should accept Japanese usernames', () => {
      expect(usernameSchema.safeParse('プレイヤー').success).toBe(true);
    });

    it('should trim whitespace', () => {
      const result = usernameSchema.safeParse('  Player1  ');
      expect(result.success).toBe(true);
      expect(result.data).toBe('Player1');
    });

    it('should reject empty usernames', () => {
      expect(usernameSchema.safeParse('').success).toBe(false);
    });

    it('should reject too long usernames', () => {
      const longName = 'a'.repeat(31);
      expect(usernameSchema.safeParse(longName).success).toBe(false);
    });
  });
});

describe('Event Schemas', () => {
  describe('createGameSchema', () => {
    it('should validate complete create game payload', () => {
      const payload = {
        gameCode: 'ABCD',
        roomName: 'Test Room',
        language: 'en',
        hostUsername: 'Host',
        avatar: {
          emoji: '😀',
          color: '#FF0000'
        }
      };

      const result = createGameSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('should apply defaults', () => {
      const payload = {
        gameCode: 'ABCD'
      };

      const result = createGameSchema.safeParse(payload);
      expect(result.success).toBe(true);
      expect(result.data.language).toBe('en');
      expect(result.data.isRanked).toBe(false);
    });

    it('should reject missing gameCode', () => {
      const payload = {
        roomName: 'Test Room'
      };

      const result = createGameSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });

  describe('joinGameSchema', () => {
    it('should validate join payload', () => {
      const payload = {
        gameCode: 'ABCD',
        username: 'Player1'
      };

      const result = joinGameSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('should reject missing username', () => {
      const payload = {
        gameCode: 'ABCD'
      };

      const result = joinGameSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });

  describe('submitWordSchema', () => {
    it('should validate word submission', () => {
      const payload = {
        word: 'hello',
        path: [
          { row: 0, col: 0 },
          { row: 0, col: 1 },
          { row: 1, col: 1 },
          { row: 1, col: 2 },
          { row: 2, col: 2 }
        ]
      };

      const result = submitWordSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('should accept word without path', () => {
      const payload = {
        word: 'hello'
      };

      const result = submitWordSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('should trim word', () => {
      const payload = {
        word: '  hello  '
      };

      const result = submitWordSchema.safeParse(payload);
      expect(result.success).toBe(true);
      expect(result.data.word).toBe('hello');
    });
  });
});

describe('validatePayload', () => {
  it('should return success with valid data', () => {
    const result = validatePayload(joinGameSchema, {
      gameCode: 'ABCD',
      username: 'Player1'
    });

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data.gameCode).toBe('ABCD');
  });

  it('should return error with invalid data', () => {
    const result = validatePayload(joinGameSchema, {
      gameCode: 'AB', // too short
      username: 'Player1'
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.fields).toBeDefined();
    expect(result.fields.gameCode).toBeDefined();
  });

  it('should handle multiple validation errors', () => {
    const result = validatePayload(joinGameSchema, {
      gameCode: 'AB', // too short
      username: ''    // empty
    });

    expect(result.success).toBe(false);
    expect(Object.keys(result.fields).length).toBeGreaterThan(1);
  });

  it('should handle unexpected errors gracefully', () => {
    const result = validatePayload(null, {});
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe('validateWithError', () => {
  let mockSocket;

  beforeEach(() => {
    mockSocket = {
      id: 'socket-123',
      emit: jest.fn()
    };
  });

  it('should return success and data on valid input', () => {
    const result = validateWithError(joinGameSchema, {
      gameCode: 'ABCD',
      username: 'Player1'
    }, mockSocket, 'join');

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(mockSocket.emit).not.toHaveBeenCalled();
  });

  it('should emit error on invalid input', () => {
    const result = validateWithError(joinGameSchema, {
      gameCode: 'AB',
      username: 'Player1'
    }, mockSocket, 'join');

    expect(result.success).toBe(false);
    expect(mockSocket.emit).toHaveBeenCalledWith('error', expect.objectContaining({
      code: 'VALIDATION_INVALID_PAYLOAD'
    }));
  });
});

describe('getEventSchema', () => {
  it('should return schema for known events', () => {
    expect(getEventSchema('createGame')).toBe(createGameSchema);
    expect(getEventSchema('join')).toBe(joinGameSchema);
    expect(getEventSchema('submitWord')).toBe(submitWordSchema);
  });

  it('should return null for unknown events', () => {
    expect(getEventSchema('unknownEvent')).toBeNull();
  });
});

describe('hasSchema', () => {
  it('should return true for events with schemas', () => {
    expect(hasSchema('createGame')).toBe(true);
    expect(hasSchema('join')).toBe(true);
  });

  it('should return false for events without schemas', () => {
    expect(hasSchema('unknownEvent')).toBe(false);
  });
});

describe('createValidationError', () => {
  it('should create AppError with validation code', () => {
    const error = createValidationError('Invalid data', { field: 'reason' });

    expect(error.code).toBe('VALIDATION_FAILED');
    expect(error.message).toBe('Invalid data');
    expect(error.details).toEqual({ field: 'reason' });
  });
});

describe('eventSchemas', () => {
  it('should have schemas for all major events', () => {
    const expectedEvents = [
      'createGame', 'join', 'leaveRoom', 'startGame',
      'submitWord', 'sendChatMessage', 'addBot', 'removeBot',
      'heartbeat', 'presenceUpdate', 'kickPlayer', 'transferHost',
      'reconnect', 'resetGame', 'closeRoom'
    ];

    expectedEvents.forEach(event => {
      expect(eventSchemas[event]).toBeDefined();
    });
  });
});
