/**
 * Validation utility functions for form inputs
 */

import {
  USERNAME_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
  ROOM_NAME_MIN_LENGTH,
  ROOM_NAME_MAX_LENGTH,
  GAME_CODE_MIN_LENGTH,
  GAME_CODE_MAX_LENGTH,
  WORD_MIN_LENGTH,
  WORD_MAX_LENGTH,
  NAME_VALID_PATTERN,
} from './consts';

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

  if (trimmed.length < USERNAME_MIN_LENGTH) {
    return { isValid: false, error: 'validation.usernameTooShort' };
  }

  if (trimmed.length > USERNAME_MAX_LENGTH) {
    return { isValid: false, error: 'validation.usernameTooLong' };
  }

  if (!NAME_VALID_PATTERN.test(trimmed)) {
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

  if (trimmed.length < ROOM_NAME_MIN_LENGTH) {
    return { isValid: false, error: 'validation.roomNameTooShort' };
  }

  if (trimmed.length > ROOM_NAME_MAX_LENGTH) {
    return { isValid: false, error: 'validation.roomNameTooLong' };
  }

  if (!NAME_VALID_PATTERN.test(trimmed)) {
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

  // Must be 6-10 characters, alphanumeric only (matches backend validation)
  if (trimmed.length < GAME_CODE_MIN_LENGTH || trimmed.length > GAME_CODE_MAX_LENGTH) {
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

  if (trimmed.length < WORD_MIN_LENGTH) {
    return { isValid: false, error: 'playerView.wordTooShort' };
  }

  if (trimmed.length > WORD_MAX_LENGTH) {
    return { isValid: false, error: 'validation.wordTooLong' };
  }

  // Only allow letters (including Unicode for different languages)
  const validPattern = /^[\p{L}]+$/u;
  if (!validPattern.test(trimmed)) {
    return { isValid: false, error: 'validation.wordInvalidChars' };
  }

  return { isValid: true };
};
