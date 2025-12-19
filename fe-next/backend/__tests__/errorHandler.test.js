/**
 * Error Handler Tests
 * Tests for centralized error handling system
 */

const {
  AppError,
  ErrorCodes,
  ErrorSeverity,
  ErrorRegistry,
  emitError,
  createError,
  isAppError,
  generateCorrelationId,
  wrapRouteHandler
} = require('../utils/errorHandler');

describe('ErrorCodes', () => {
  it('should define game error codes', () => {
    expect(ErrorCodes.GAME_NOT_FOUND).toBe('GAME_NOT_FOUND');
    expect(ErrorCodes.GAME_ALREADY_EXISTS).toBe('GAME_ALREADY_EXISTS');
    expect(ErrorCodes.GAME_FULL).toBe('GAME_FULL');
  });

  it('should define player error codes', () => {
    expect(ErrorCodes.PLAYER_NOT_HOST).toBe('PLAYER_NOT_HOST');
    expect(ErrorCodes.PLAYER_NOT_IN_GAME).toBe('PLAYER_NOT_IN_GAME');
  });

  it('should define validation error codes', () => {
    expect(ErrorCodes.VALIDATION_FAILED).toBe('VALIDATION_FAILED');
    expect(ErrorCodes.VALIDATION_INVALID_PAYLOAD).toBe('VALIDATION_INVALID_PAYLOAD');
  });

  it('should define rate limit error codes', () => {
    expect(ErrorCodes.RATE_LIMIT_EXCEEDED).toBe('RATE_LIMIT_EXCEEDED');
    expect(ErrorCodes.RATE_LIMIT_IP_BLOCKED).toBe('RATE_LIMIT_IP_BLOCKED');
  });
});

describe('ErrorRegistry', () => {
  it('should have entries for all error codes', () => {
    Object.values(ErrorCodes).forEach(code => {
      expect(ErrorRegistry[code]).toBeDefined();
      expect(ErrorRegistry[code].message).toBeDefined();
      expect(ErrorRegistry[code].severity).toBeDefined();
      expect(ErrorRegistry[code].httpStatus).toBeDefined();
    });
  });

  it('should have correct HTTP status codes', () => {
    expect(ErrorRegistry[ErrorCodes.GAME_NOT_FOUND].httpStatus).toBe(404);
    expect(ErrorRegistry[ErrorCodes.PLAYER_NOT_HOST].httpStatus).toBe(403);
    expect(ErrorRegistry[ErrorCodes.RATE_LIMIT_EXCEEDED].httpStatus).toBe(429);
    expect(ErrorRegistry[ErrorCodes.INTERNAL_ERROR].httpStatus).toBe(500);
  });

  it('should assign correct severity levels', () => {
    expect(ErrorRegistry[ErrorCodes.GAME_NOT_FOUND].severity).toBe(ErrorSeverity.LOW);
    expect(ErrorRegistry[ErrorCodes.RATE_LIMIT_EXCEEDED].severity).toBe(ErrorSeverity.MEDIUM);
    expect(ErrorRegistry[ErrorCodes.INTERNAL_ERROR].severity).toBe(ErrorSeverity.HIGH);
    expect(ErrorRegistry[ErrorCodes.DATABASE_ERROR].severity).toBe(ErrorSeverity.HIGH);
  });
});

describe('AppError', () => {
  it('should create error with default message from registry', () => {
    const error = new AppError(ErrorCodes.GAME_NOT_FOUND);

    expect(error.code).toBe(ErrorCodes.GAME_NOT_FOUND);
    expect(error.message).toBe('Game not found');
    expect(error.severity).toBe(ErrorSeverity.LOW);
    expect(error.httpStatus).toBe(404);
    expect(error.name).toBe('AppError');
  });

  it('should allow custom message override', () => {
    const error = new AppError(ErrorCodes.GAME_NOT_FOUND, {
      message: 'Game XYZ not found'
    });

    expect(error.message).toBe('Game XYZ not found');
    expect(error.code).toBe(ErrorCodes.GAME_NOT_FOUND);
  });

  it('should include details and correlation ID', () => {
    const error = new AppError(ErrorCodes.VALIDATION_FAILED, {
      details: { field: 'username', reason: 'too short' },
      correlationId: 'abc-123'
    });

    expect(error.details).toEqual({ field: 'username', reason: 'too short' });
    expect(error.correlationId).toBe('abc-123');
  });

  it('should convert to client-safe object', () => {
    const error = new AppError(ErrorCodes.GAME_NOT_FOUND, {
      details: { gameCode: 'XYZ' },
      correlationId: 'cid-123'
    });

    const clientError = error.toClientError();

    expect(clientError.code).toBe(ErrorCodes.GAME_NOT_FOUND);
    expect(clientError.message).toBe('Game not found');
    expect(clientError.details).toEqual({ gameCode: 'XYZ' });
    expect(clientError.correlationId).toBe('cid-123');
    // Should not include sensitive data
    expect(clientError.stack).toBeUndefined();
    expect(clientError.severity).toBeUndefined();
  });

  it('should convert to loggable object', () => {
    const error = new AppError(ErrorCodes.INTERNAL_ERROR, {
      details: { operation: 'save' }
    });

    const logObj = error.toLogObject();

    expect(logObj.code).toBe(ErrorCodes.INTERNAL_ERROR);
    expect(logObj.message).toBeDefined();
    expect(logObj.severity).toBe(ErrorSeverity.HIGH);
    expect(logObj.details).toEqual({ operation: 'save' });
    expect(logObj.timestamp).toBeDefined();
    expect(logObj.stack).toBeDefined();
  });

  it('should have stack trace', () => {
    const error = new AppError(ErrorCodes.INTERNAL_ERROR);
    expect(error.stack).toContain('AppError');
  });
});

describe('Utility Functions', () => {
  describe('createError', () => {
    it('should create AppError from code', () => {
      const error = createError(ErrorCodes.GAME_FULL);
      expect(error).toBeInstanceOf(AppError);
      expect(error.code).toBe(ErrorCodes.GAME_FULL);
    });

    it('should accept options', () => {
      const error = createError(ErrorCodes.GAME_FULL, {
        message: 'Room is at capacity'
      });
      expect(error.message).toBe('Room is at capacity');
    });
  });

  describe('isAppError', () => {
    it('should return true for AppError', () => {
      const error = new AppError(ErrorCodes.GAME_NOT_FOUND);
      expect(isAppError(error)).toBe(true);
    });

    it('should return false for regular Error', () => {
      const error = new Error('Regular error');
      expect(isAppError(error)).toBe(false);
    });

    it('should return false for non-errors', () => {
      expect(isAppError(null)).toBe(false);
      expect(isAppError(undefined)).toBe(false);
      expect(isAppError('string')).toBe(false);
    });
  });

  describe('generateCorrelationId', () => {
    it('should generate unique IDs', () => {
      const ids = new Set();
      for (let i = 0; i < 100; i++) {
        ids.add(generateCorrelationId());
      }
      expect(ids.size).toBe(100);
    });

    it('should generate non-empty strings', () => {
      const id = generateCorrelationId();
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });
  });
});

describe('emitError', () => {
  let mockSocket;

  beforeEach(() => {
    mockSocket = {
      id: 'socket-123',
      emit: jest.fn()
    };
  });

  it('should emit error with known error code', () => {
    emitError(mockSocket, ErrorCodes.GAME_NOT_FOUND);

    expect(mockSocket.emit).toHaveBeenCalledWith('error', expect.objectContaining({
      code: ErrorCodes.GAME_NOT_FOUND,
      message: 'Game not found'
    }));
  });

  it('should emit error with custom message', () => {
    emitError(mockSocket, ErrorCodes.GAME_NOT_FOUND, {
      message: 'Game ABC not found'
    });

    expect(mockSocket.emit).toHaveBeenCalledWith('error', expect.objectContaining({
      code: ErrorCodes.GAME_NOT_FOUND,
      message: 'Game ABC not found'
    }));
  });

  it('should include details when provided', () => {
    emitError(mockSocket, ErrorCodes.VALIDATION_FAILED, {
      details: { field: 'username' }
    });

    expect(mockSocket.emit).toHaveBeenCalledWith('error', expect.objectContaining({
      details: { field: 'username' }
    }));
  });

  it('should include correlation ID when provided', () => {
    emitError(mockSocket, ErrorCodes.GAME_NOT_FOUND, {
      correlationId: 'cid-456'
    });

    expect(mockSocket.emit).toHaveBeenCalledWith('error', expect.objectContaining({
      correlationId: 'cid-456'
    }));
  });

  it('should handle legacy string messages', () => {
    emitError(mockSocket, 'Something went wrong');

    expect(mockSocket.emit).toHaveBeenCalledWith('error', expect.objectContaining({
      message: 'Something went wrong'
    }));
  });
});

describe('wrapRouteHandler', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    mockReq = {
      method: 'GET',
      path: '/test',
      headers: {}
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    mockNext = jest.fn();
  });

  it('should call handler and pass through on success', async () => {
    const handler = jest.fn().mockResolvedValue({ data: 'success' });
    const wrapped = wrapRouteHandler(handler);

    await wrapped(mockReq, mockRes, mockNext);

    expect(handler).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
    expect(mockReq.correlationId).toBeDefined();
  });

  it('should handle AppError and return appropriate status', async () => {
    const handler = jest.fn().mockRejectedValue(
      new AppError(ErrorCodes.GAME_NOT_FOUND)
    );
    const wrapped = wrapRouteHandler(handler);

    await wrapped(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      code: ErrorCodes.GAME_NOT_FOUND
    }));
  });

  it('should handle unknown errors with 500 status', async () => {
    const handler = jest.fn().mockRejectedValue(new Error('Unknown error'));
    const wrapped = wrapRouteHandler(handler);

    await wrapped(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      code: ErrorCodes.INTERNAL_ERROR,
      message: 'An unexpected error occurred'
    }));
  });

  it('should use correlation ID from header if provided', async () => {
    mockReq.headers['x-correlation-id'] = 'existing-cid';
    const handler = jest.fn().mockResolvedValue({});
    const wrapped = wrapRouteHandler(handler);

    await wrapped(mockReq, mockRes, mockNext);

    expect(mockReq.correlationId).toBe('existing-cid');
  });
});
