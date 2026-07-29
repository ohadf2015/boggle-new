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
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
  NAME_VALID_PATTERN,
  EMAIL_VALID_PATTERN,
  EMAIL_MAX_LENGTH,
  EMAIL_LOCAL_MAX_LENGTH,
  PASSWORD_STRENGTH_PATTERN,
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
 * @param optional - Whether the room name is optional (default: true)
 * @returns Validation result
 */
export const validateRoomName = (roomName: string, optional: boolean = true): ValidationResult => {
  // Allow empty room name if optional
  if (optional && (!roomName || !roomName.trim())) {
    return { isValid: true };
  }

  // If not optional, require a value
  if (!optional && (!roomName || !roomName.trim())) {
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

/**
 * Validates email input
 * @param email - The email to validate
 * @returns Validation result
 */
export const validateEmail = (email: string): ValidationResult => {
  if (!email || !email.trim()) {
    return { isValid: false, error: 'auth.inlineSignup.emailRequired' };
  }

  const trimmed = email.trim().toLowerCase();

  // RFC 5321: total max 254, local part max 64
  const atIndex = trimmed.indexOf('@');
  if (trimmed.length > EMAIL_MAX_LENGTH || (atIndex > 0 && atIndex > EMAIL_LOCAL_MAX_LENGTH)) {
    return { isValid: false, error: 'auth.inlineSignup.emailTooLong' };
  }

  if (!EMAIL_VALID_PATTERN.test(trimmed)) {
    return { isValid: false, error: 'auth.inlineSignup.invalidEmail' };
  }

  return { isValid: true };
};

/**
 * Validates password input for registration
 * @param password - The password to validate
 * @param requireStrength - Whether to require uppercase, lowercase, and number (default: false)
 * @returns Validation result
 */
export const validatePassword = (password: string, requireStrength: boolean = false): ValidationResult => {
  if (!password) {
    return { isValid: false, error: 'auth.inlineSignup.passwordRequired' };
  }

  if (password.length < PASSWORD_MIN_LENGTH) {
    return { isValid: false, error: 'auth.inlineSignup.passwordTooShort' };
  }

  if (password.length > PASSWORD_MAX_LENGTH) {
    return { isValid: false, error: 'auth.inlineSignup.passwordTooLong' };
  }

  if (requireStrength && !PASSWORD_STRENGTH_PATTERN.test(password)) {
    return { isValid: false, error: 'auth.inlineSignup.weakPassword' };
  }

  return { isValid: true };
};
