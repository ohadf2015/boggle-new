/**
 * Validation Utility Tests
 *
 * Tests for the validation functions used across the application
 */

import {
  validateUsername,
  validateRoomName,
  validateGameCode,
  validateWord,
  sanitizeInput,
  validateEmail,
  validatePassword,
} from '../validation';

describe('validateUsername', () => {
  describe('valid usernames', () => {
    it('accepts alphanumeric usernames', () => {
      expect(validateUsername('Player1')).toEqual({ isValid: true });
      expect(validateUsername('JohnDoe')).toEqual({ isValid: true });
      expect(validateUsername('user123')).toEqual({ isValid: true });
    });

    it('accepts usernames with spaces', () => {
      expect(validateUsername('John Doe')).toEqual({ isValid: true });
    });

    it('accepts usernames with underscores and hyphens', () => {
      expect(validateUsername('user_name')).toEqual({ isValid: true });
      expect(validateUsername('user-name')).toEqual({ isValid: true });
    });

    it('accepts Hebrew characters', () => {
      expect(validateUsername('שחקן')).toEqual({ isValid: true });
    });

    it('accepts Japanese characters', () => {
      expect(validateUsername('プレイヤー')).toEqual({ isValid: true });
    });

    it('accepts minimum length (2 characters)', () => {
      expect(validateUsername('AB')).toEqual({ isValid: true });
    });

    it('accepts maximum length (20 characters)', () => {
      expect(validateUsername('A'.repeat(20))).toEqual({ isValid: true });
    });
  });

  describe('invalid usernames', () => {
    it('rejects empty username', () => {
      expect(validateUsername('')).toEqual({
        isValid: false,
        error: 'validation.usernameRequired',
      });
    });

    it('rejects whitespace-only username', () => {
      expect(validateUsername('   ')).toEqual({
        isValid: false,
        error: 'validation.usernameRequired',
      });
    });

    it('rejects too short username (1 character)', () => {
      expect(validateUsername('A')).toEqual({
        isValid: false,
        error: 'validation.usernameTooShort',
      });
    });

    it('rejects too long username (> 20 characters)', () => {
      expect(validateUsername('A'.repeat(21))).toEqual({
        isValid: false,
        error: 'validation.usernameTooLong',
      });
    });

    it('rejects special characters', () => {
      expect(validateUsername('user@name')).toEqual({
        isValid: false,
        error: 'validation.usernameInvalidChars',
      });
      expect(validateUsername('user#name')).toEqual({
        isValid: false,
        error: 'validation.usernameInvalidChars',
      });
    });
  });
});

describe('validateRoomName', () => {
  describe('valid room names', () => {
    it('accepts alphanumeric room names', () => {
      expect(validateRoomName('Room1')).toEqual({ isValid: true });
      expect(validateRoomName('GameRoom')).toEqual({ isValid: true });
    });

    it('accepts room names with spaces', () => {
      expect(validateRoomName('Fun Room')).toEqual({ isValid: true });
    });

    it('accepts minimum length (2 characters)', () => {
      expect(validateRoomName('AB')).toEqual({ isValid: true });
    });

    it('accepts maximum length (30 characters)', () => {
      expect(validateRoomName('A'.repeat(30))).toEqual({ isValid: true });
    });
  });

  describe('invalid room names', () => {
    it('rejects empty room name when required', () => {
      // Pass false to make room name required (default is optional)
      expect(validateRoomName('', false)).toEqual({
        isValid: false,
        error: 'validation.roomNameRequired',
      });
    });

    it('accepts empty room name when optional (default)', () => {
      expect(validateRoomName('')).toEqual({ isValid: true });
    });

    it('rejects too short room name', () => {
      expect(validateRoomName('A')).toEqual({
        isValid: false,
        error: 'validation.roomNameTooShort',
      });
    });

    it('rejects too long room name (> 30 characters)', () => {
      expect(validateRoomName('A'.repeat(31))).toEqual({
        isValid: false,
        error: 'validation.roomNameTooLong',
      });
    });
  });
});

describe('validateGameCode', () => {
  describe('valid game codes', () => {
    it('accepts 6-character alphanumeric codes', () => {
      expect(validateGameCode('ABC123')).toEqual({ isValid: true });
      expect(validateGameCode('GAME01')).toEqual({ isValid: true });
    });

    it('accepts lowercase codes', () => {
      expect(validateGameCode('abc123')).toEqual({ isValid: true });
    });

    it('accepts mixed case codes', () => {
      expect(validateGameCode('AbC123')).toEqual({ isValid: true });
    });

    it('accepts minimum length (6 characters)', () => {
      expect(validateGameCode('ABCDEF')).toEqual({ isValid: true });
    });

    it('accepts maximum length (10 characters)', () => {
      expect(validateGameCode('ABCDEFGHIJ')).toEqual({ isValid: true });
    });
  });

  describe('invalid game codes', () => {
    it('rejects empty game code', () => {
      expect(validateGameCode('')).toEqual({
        isValid: false,
        error: 'validation.gameCodeRequired',
      });
    });

    it('rejects too short game code (< 6 characters)', () => {
      expect(validateGameCode('ABC')).toEqual({
        isValid: false,
        error: 'validation.gameCodeInvalid',
      });
      expect(validateGameCode('ABCDE')).toEqual({
        isValid: false,
        error: 'validation.gameCodeInvalid',
      });
    });

    it('rejects too long game code (> 10 characters)', () => {
      expect(validateGameCode('ABCDEFGHIJK')).toEqual({
        isValid: false,
        error: 'validation.gameCodeInvalid',
      });
    });

    it('rejects non-alphanumeric characters', () => {
      expect(validateGameCode('ABC-12')).toEqual({
        isValid: false,
        error: 'validation.gameCodeInvalid',
      });
      expect(validateGameCode('ABC 12')).toEqual({
        isValid: false,
        error: 'validation.gameCodeInvalid',
      });
    });
  });
});

describe('validateWord', () => {
  describe('valid words', () => {
    it('accepts English words', () => {
      expect(validateWord('hello')).toEqual({ isValid: true });
      expect(validateWord('WORLD')).toEqual({ isValid: true });
    });

    it('accepts Hebrew words', () => {
      expect(validateWord('שלום')).toEqual({ isValid: true });
    });

    it('accepts minimum length (2 characters)', () => {
      expect(validateWord('ab')).toEqual({ isValid: true });
    });

    it('accepts maximum length (20 characters)', () => {
      expect(validateWord('A'.repeat(20))).toEqual({ isValid: true });
    });
  });

  describe('invalid words', () => {
    it('rejects empty word', () => {
      expect(validateWord('')).toEqual({
        isValid: false,
        error: 'validation.wordRequired',
      });
    });

    it('rejects too short word (1 character)', () => {
      expect(validateWord('a')).toEqual({
        isValid: false,
        error: 'playerView.wordTooShort',
      });
    });

    it('rejects too long word (> 20 characters)', () => {
      expect(validateWord('A'.repeat(21))).toEqual({
        isValid: false,
        error: 'validation.wordTooLong',
      });
    });

    it('rejects words with numbers', () => {
      expect(validateWord('hello1')).toEqual({
        isValid: false,
        error: 'validation.wordInvalidChars',
      });
    });

    it('rejects words with special characters', () => {
      expect(validateWord("don't")).toEqual({
        isValid: false,
        error: 'validation.wordInvalidChars',
      });
    });
  });
});

describe('sanitizeInput', () => {
  it('trims whitespace', () => {
    expect(sanitizeInput('  hello  ')).toBe('hello');
  });

  it('removes HTML tags', () => {
    // Note: Current implementation strips tags but may leave content
    expect(sanitizeInput('<b>Bold</b>')).toBe('Bold');
    // Script content is stripped of tags (security is handled server-side via DOMPurify)
    expect(sanitizeInput('<div>Content</div>')).toBe('Content');
  });

  it('truncates to max length', () => {
    expect(sanitizeInput('Hello World', 5)).toBe('Hello');
  });

  it('returns empty string for falsy input', () => {
    expect(sanitizeInput('')).toBe('');
  });

  it('handles complex HTML', () => {
    expect(sanitizeInput('<div><p>Text</p></div>')).toBe('Text');
  });
});

describe('validateEmail', () => {
  describe('valid emails', () => {
    it('accepts standard email formats', () => {
      expect(validateEmail('user@example.com')).toEqual({ isValid: true });
      expect(validateEmail('name.surname@domain.co')).toEqual({ isValid: true });
      expect(validateEmail('user+tag@gmail.com')).toEqual({ isValid: true });
    });

    it('accepts emails with subdomains', () => {
      expect(validateEmail('user@mail.example.com')).toEqual({ isValid: true });
    });

    it('trims and lowercases for validation', () => {
      expect(validateEmail('  User@Example.COM  ')).toEqual({ isValid: true });
    });
  });

  describe('invalid emails', () => {
    it('rejects empty email', () => {
      expect(validateEmail('')).toEqual({
        isValid: false,
        error: 'auth.inlineSignup.emailRequired',
      });
    });

    it('rejects whitespace-only email', () => {
      expect(validateEmail('   ')).toEqual({
        isValid: false,
        error: 'auth.inlineSignup.emailRequired',
      });
    });

    it('rejects email without @', () => {
      expect(validateEmail('userexample.com')).toEqual({
        isValid: false,
        error: 'auth.inlineSignup.invalidEmail',
      });
    });

    it('rejects email without domain', () => {
      expect(validateEmail('user@')).toEqual({
        isValid: false,
        error: 'auth.inlineSignup.invalidEmail',
      });
    });

    it('rejects email without TLD', () => {
      expect(validateEmail('user@example')).toEqual({
        isValid: false,
        error: 'auth.inlineSignup.invalidEmail',
      });
    });

    it('rejects email with spaces in middle', () => {
      expect(validateEmail('user @example.com')).toEqual({
        isValid: false,
        error: 'auth.inlineSignup.invalidEmail',
      });
    });

    it('rejects email with single-char TLD', () => {
      expect(validateEmail('user@example.c')).toEqual({
        isValid: false,
        error: 'auth.inlineSignup.invalidEmail',
      });
    });

    it('rejects email exceeding max length (254 chars)', () => {
      const longLocal = 'a'.repeat(243); // 243 + @ + example.com = 255
      expect(validateEmail(`${longLocal}@example.com`)).toEqual({
        isValid: false,
        error: 'auth.inlineSignup.emailTooLong',
      });
    });

    it('rejects email with local part exceeding 64 chars', () => {
      const longLocal = 'a'.repeat(65);
      expect(validateEmail(`${longLocal}@example.com`)).toEqual({
        isValid: false,
        error: 'auth.inlineSignup.emailTooLong',
      });
    });
  });
});

describe('validatePassword', () => {
  describe('valid passwords', () => {
    it('accepts passwords meeting minimum length (8 chars)', () => {
      expect(validatePassword('abcdefgh')).toEqual({ isValid: true });
    });

    it('accepts long passwords up to max length', () => {
      expect(validatePassword('a'.repeat(128))).toEqual({ isValid: true });
    });

    it('accepts passwords with special characters', () => {
      expect(validatePassword('p@ssw0rd!')).toEqual({ isValid: true });
    });
  });

  describe('invalid passwords', () => {
    it('rejects empty password', () => {
      expect(validatePassword('')).toEqual({
        isValid: false,
        error: 'auth.inlineSignup.passwordRequired',
      });
    });

    it('rejects too short password (< 8 chars)', () => {
      expect(validatePassword('abc')).toEqual({
        isValid: false,
        error: 'auth.inlineSignup.passwordTooShort',
      });
      expect(validatePassword('1234567')).toEqual({
        isValid: false,
        error: 'auth.inlineSignup.passwordTooShort',
      });
    });

    it('rejects too long password (> 128 chars)', () => {
      expect(validatePassword('a'.repeat(129))).toEqual({
        isValid: false,
        error: 'auth.inlineSignup.passwordTooLong',
      });
    });
  });

  describe('password strength validation', () => {
    it('accepts strong passwords when requireStrength is true', () => {
      expect(validatePassword('MyPassw0rd', true)).toEqual({ isValid: true });
      expect(validatePassword('Test1234', true)).toEqual({ isValid: true });
    });

    it('rejects passwords without uppercase when requireStrength is true', () => {
      expect(validatePassword('mypassw0rd', true)).toEqual({
        isValid: false,
        error: 'auth.inlineSignup.weakPassword',
      });
    });

    it('rejects passwords without lowercase when requireStrength is true', () => {
      expect(validatePassword('MYPASSW0RD', true)).toEqual({
        isValid: false,
        error: 'auth.inlineSignup.weakPassword',
      });
    });

    it('rejects passwords without digit when requireStrength is true', () => {
      expect(validatePassword('MyPassword', true)).toEqual({
        isValid: false,
        error: 'auth.inlineSignup.weakPassword',
      });
    });

    it('does not check strength by default', () => {
      // Lowercase-only password passes without requireStrength
      expect(validatePassword('abcdefgh')).toEqual({ isValid: true });
    });
  });
});
