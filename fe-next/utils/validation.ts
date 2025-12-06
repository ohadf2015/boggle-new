/**
 * Validation utility functions for form inputs
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates username input
 * @param username - The username to validate
 * @returns Validation result
 */
export const validateUsername = (username: string): ValidationResult => {
  if (!username || !username.trim()) {
    return { isValid: false, error: 'validation.usernameRequired' };
  }

  const trimmed = username.trim();

  if (trimmed.length < 2) {
    return { isValid: false, error: 'validation.usernameTooShort' };
  }

  if (trimmed.length > 20) {
    return { isValid: false, error: 'validation.usernameTooLong' };
  }

  // Allow letters, numbers, spaces, and common special characters
  const validPattern = /^[a-zA-Z0-9\s\u0590-\u05FF\u3040-\u30FF\u4E00-\u9FFF\u00C0-\u024F._-]+$/;
  if (!validPattern.test(trimmed)) {
    return { isValid: false, error: 'validation.usernameInvalidChars' };
  }

  return { isValid: true };
};

/**
 * Validates room name input
 * @param roomName - The room name to validate
 * @returns Validation result
 */
export const validateRoomName = (roomName: string): ValidationResult => {
  if (!roomName || !roomName.trim()) {
    return { isValid: false, error: 'validation.roomNameRequired' };
  }

  const trimmed = roomName.trim();

  if (trimmed.length < 2) {
    return { isValid: false, error: 'validation.roomNameTooShort' };
  }

  if (trimmed.length > 30) {
    return { isValid: false, error: 'validation.roomNameTooLong' };
  }

  // Allow letters, numbers, spaces, and common special characters
  const validPattern = /^[a-zA-Z0-9\s\u0590-\u05FF\u3040-\u30FF\u4E00-\u9FFF\u00C0-\u024F._-]+$/;
  if (!validPattern.test(trimmed)) {
    return { isValid: false, error: 'validation.roomNameInvalidChars' };
  }

  return { isValid: true };
};

/**
 * Validates game code input
 * @param gameCode - The game code to validate
 * @returns Validation result
 */
export const validateGameCode = (gameCode: string): ValidationResult => {
  if (!gameCode || !gameCode.trim()) {
    return { isValid: false, error: 'validation.gameCodeRequired' };
  }

  const trimmed = gameCode.trim();

  // Must be 4-10 characters, alphanumeric only (matches backend validation)
  if (trimmed.length < 4 || trimmed.length > 10) {
    return { isValid: false, error: 'validation.gameCodeInvalid' };
  }

  if (!/^[A-Za-z0-9]+$/.test(trimmed)) {
    return { isValid: false, error: 'validation.gameCodeInvalid' };
  }

  return { isValid: true };
};

/**
 * Sanitizes input by removing dangerous characters and trimming
 * @param input - The input to sanitize
 * @param maxLength - Maximum allowed length
 * @returns Sanitized input
 */
export const sanitizeInput = (input: string, maxLength: number = 100): string => {
  if (!input) return '';

  // Remove any HTML tags and trim
  let sanitized = input.replace(/<[^>]*>/g, '').trim();

  // Truncate to max length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
};

/**
 * Validates word input during gameplay
 * @param word - The word to validate
 * @returns Validation result
 */
export const validateWord = (word: string): ValidationResult => {
  if (!word || !word.trim()) {
    return { isValid: false, error: 'validation.wordRequired' };
  }

  const trimmed = word.trim();

  if (trimmed.length < 2) {
    return { isValid: false, error: 'playerView.wordTooShort' };
  }

  if (trimmed.length > 20) {
    return { isValid: false, error: 'validation.wordTooLong' };
  }

  // Only allow letters (including Unicode for different languages)
  const validPattern = /^[\p{L}]+$/u;
  if (!validPattern.test(trimmed)) {
    return { isValid: false, error: 'validation.wordInvalidChars' };
  }

  return { isValid: true };
};
