/**
 * Error Message Mapping Utility
 * Maps backend error codes to user-friendly translation keys
 */

/**
 * Backend error codes (mirrors backend/utils/errorHandler.ts)
 */
export const ErrorCodes = {
  // Game errors
  GAME_NOT_FOUND: 'GAME_NOT_FOUND',
  GAME_ALREADY_EXISTS: 'GAME_ALREADY_EXISTS',
  GAME_NOT_IN_PROGRESS: 'GAME_NOT_IN_PROGRESS',
  GAME_ALREADY_STARTED: 'GAME_ALREADY_STARTED',
  GAME_FULL: 'GAME_FULL',
  GAME_INVALID_CODE: 'GAME_INVALID_CODE',
  GAME_CLOSED: 'GAME_CLOSED',

  // Player errors
  PLAYER_NOT_IN_GAME: 'PLAYER_NOT_IN_GAME',
  PLAYER_NOT_HOST: 'PLAYER_NOT_HOST',
  PLAYER_ALREADY_IN_GAME: 'PLAYER_ALREADY_IN_GAME',
  PLAYER_KICKED: 'PLAYER_KICKED',
  PLAYER_USERNAME_TAKEN: 'PLAYER_USERNAME_TAKEN',
  PLAYER_INVALID_USERNAME: 'PLAYER_INVALID_USERNAME',

  // Word submission errors
  WORD_INVALID: 'WORD_INVALID',
  WORD_TOO_SHORT: 'WORD_TOO_SHORT',
  WORD_NOT_ON_BOARD: 'WORD_NOT_ON_BOARD',
  WORD_ALREADY_FOUND: 'WORD_ALREADY_FOUND',
  WORD_SUBMISSION_FAILED: 'WORD_SUBMISSION_FAILED',

  // Validation errors
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  VALIDATION_INVALID_PAYLOAD: 'VALIDATION_INVALID_PAYLOAD',
  VALIDATION_MISSING_FIELD: 'VALIDATION_MISSING_FIELD',

  // Rate limiting errors
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  RATE_LIMIT_IP_BLOCKED: 'RATE_LIMIT_IP_BLOCKED',

  // Authentication errors
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  AUTH_INVALID_TOKEN: 'AUTH_INVALID_TOKEN',
  AUTH_EXPIRED: 'AUTH_EXPIRED',
  AUTH_FORBIDDEN: 'AUTH_FORBIDDEN',

  // Tournament errors
  TOURNAMENT_NOT_FOUND: 'TOURNAMENT_NOT_FOUND',
  TOURNAMENT_ALREADY_STARTED: 'TOURNAMENT_ALREADY_STARTED',
  TOURNAMENT_INVALID_STATE: 'TOURNAMENT_INVALID_STATE',

  // System errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  DATABASE_ERROR: 'DATABASE_ERROR',
  REDIS_ERROR: 'REDIS_ERROR',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

/**
 * Mapping of error codes to translation keys
 * Keys should exist in translations under 'errors.*'
 */
const ERROR_CODE_TO_TRANSLATION_KEY: Record<string, string> = {
  // Game errors
  [ErrorCodes.GAME_NOT_FOUND]: 'errors.gameNotFound',
  [ErrorCodes.GAME_ALREADY_EXISTS]: 'errors.gameCodeInUse',
  [ErrorCodes.GAME_NOT_IN_PROGRESS]: 'errors.gameNotInProgress',
  [ErrorCodes.GAME_ALREADY_STARTED]: 'errors.gameAlreadyStarted',
  [ErrorCodes.GAME_FULL]: 'errors.roomFull',
  [ErrorCodes.GAME_INVALID_CODE]: 'errors.invalidGameCode',
  [ErrorCodes.GAME_CLOSED]: 'errors.gameClosed',

  // Player errors
  [ErrorCodes.PLAYER_NOT_IN_GAME]: 'errors.notInGame',
  [ErrorCodes.PLAYER_NOT_HOST]: 'errors.hostOnly',
  [ErrorCodes.PLAYER_ALREADY_IN_GAME]: 'errors.alreadyInGame',
  [ErrorCodes.PLAYER_KICKED]: 'errors.kicked',
  [ErrorCodes.PLAYER_USERNAME_TAKEN]: 'errors.usernameTaken',
  [ErrorCodes.PLAYER_INVALID_USERNAME]: 'errors.invalidUsername',

  // Word submission errors
  [ErrorCodes.WORD_INVALID]: 'errors.invalidWord',
  [ErrorCodes.WORD_TOO_SHORT]: 'errors.wordTooShort',
  [ErrorCodes.WORD_NOT_ON_BOARD]: 'errors.wordNotOnBoard',
  [ErrorCodes.WORD_ALREADY_FOUND]: 'errors.wordAlreadyFound',
  [ErrorCodes.WORD_SUBMISSION_FAILED]: 'errors.submissionFailed',

  // Validation errors
  [ErrorCodes.VALIDATION_FAILED]: 'errors.validationFailed',
  [ErrorCodes.VALIDATION_INVALID_PAYLOAD]: 'errors.invalidRequest',
  [ErrorCodes.VALIDATION_MISSING_FIELD]: 'errors.missingField',

  // Rate limiting errors
  [ErrorCodes.RATE_LIMIT_EXCEEDED]: 'errors.rateLimited',
  [ErrorCodes.RATE_LIMIT_IP_BLOCKED]: 'errors.ipBlocked',

  // Authentication errors
  [ErrorCodes.AUTH_REQUIRED]: 'errors.authRequired',
  [ErrorCodes.AUTH_INVALID_TOKEN]: 'errors.invalidToken',
  [ErrorCodes.AUTH_EXPIRED]: 'errors.sessionExpired',
  [ErrorCodes.AUTH_FORBIDDEN]: 'errors.forbidden',

  // Tournament errors
  [ErrorCodes.TOURNAMENT_NOT_FOUND]: 'errors.tournamentNotFound',
  [ErrorCodes.TOURNAMENT_ALREADY_STARTED]: 'errors.tournamentStarted',
  [ErrorCodes.TOURNAMENT_INVALID_STATE]: 'errors.tournamentInvalidState',

  // System errors
  [ErrorCodes.INTERNAL_ERROR]: 'errors.internal',
  [ErrorCodes.SERVICE_UNAVAILABLE]: 'errors.serviceUnavailable',
  [ErrorCodes.DATABASE_ERROR]: 'errors.internal',
  [ErrorCodes.REDIS_ERROR]: 'errors.internal',
};

/**
 * Error data from socket/API
 */
interface ErrorData {
  code?: string;
  message?: string;
  details?: unknown;
  correlationId?: string;
}

/**
 * Get user-friendly error message from error code
 * @param error - Error data from backend
 * @param t - Translation function
 * @param fallbackKey - Fallback translation key if code is unknown
 * @returns Translated user-friendly message
 */
export function getErrorMessage(
  error: ErrorData | string | unknown,
  t: (key: string) => string,
  fallbackKey = 'errors.generic'
): string {
  // Handle string errors (legacy)
  if (typeof error === 'string') {
    return error;
  }

  // Handle null/undefined
  if (!error || typeof error !== 'object') {
    return t(fallbackKey);
  }

  const errorData = error as ErrorData;

  // Try to get translation for error code
  if (errorData.code) {
    const translationKey = ERROR_CODE_TO_TRANSLATION_KEY[errorData.code];
    if (translationKey) {
      const translated = t(translationKey);
      // Return translated message if found, otherwise fallback
      if (translated !== translationKey) {
        return translated;
      }
    }
  }

  // Fallback to provided message if no translation found
  if (errorData.message) {
    return errorData.message;
  }

  // Final fallback
  return t(fallbackKey);
}

/**
 * Check if error is recoverable (user can retry)
 */
export function isRecoverableError(code: string | undefined): boolean {
  if (!code) return true;

  const nonRecoverableErrors: readonly string[] = [
    ErrorCodes.PLAYER_KICKED,
    ErrorCodes.AUTH_FORBIDDEN,
    ErrorCodes.GAME_CLOSED,
  ];

  return !nonRecoverableErrors.includes(code);
}

/**
 * Check if error is a rate limit error
 */
export function isRateLimitError(code: string | undefined): boolean {
  return code === ErrorCodes.RATE_LIMIT_EXCEEDED || code === ErrorCodes.RATE_LIMIT_IP_BLOCKED;
}

/**
 * Check if error requires authentication
 */
export function isAuthError(code: string | undefined): boolean {
  return code === ErrorCodes.AUTH_REQUIRED ||
         code === ErrorCodes.AUTH_INVALID_TOKEN ||
         code === ErrorCodes.AUTH_EXPIRED;
}
