import { describe, it, expect } from 'vitest';
import { classifyRoomError } from './roomErrorClassifier';

describe('classifyRoomError', () => {
  describe('room-gone (the dominant "room closed or inactive" complaint)', () => {
    it('classifies GAME_NOT_FOUND code as gone', () => {
      expect(classifyRoomError({ code: 'GAME_NOT_FOUND', message: 'Game not found' })).toBe('gone');
    });

    it('classifies GAME_CLOSED code as gone', () => {
      expect(classifyRoomError({ code: 'GAME_CLOSED', message: 'Game room has been closed' })).toBe('gone');
    });

    // The two real backend paths the old substring matcher missed:
    it('classifies GAME_CLOSED with ranked-in-progress custom message as gone', () => {
      expect(classifyRoomError({ code: 'GAME_CLOSED', message: 'Cannot join ranked game in progress' })).toBe('gone');
    });

    it('classifies GAME_CLOSED with game-ending custom message as gone', () => {
      expect(classifyRoomError({ code: 'GAME_CLOSED', message: 'Cannot join while game is ending. Wait for the next round.' })).toBe('gone');
    });

    it('falls back to message substring for legacy untyped emit sites (no code)', () => {
      expect(classifyRoomError({ message: 'Game not found' })).toBe('gone');
      expect(classifyRoomError({ message: 'Room is no longer available — closed' })).toBe('gone');
    });
  });

  describe('code-exists', () => {
    it('classifies GAME_ALREADY_EXISTS code', () => {
      expect(classifyRoomError({ code: 'GAME_ALREADY_EXISTS', message: 'Game code already in use' })).toBe('codeExists');
    });

    it('falls back to legacy message', () => {
      expect(classifyRoomError({ message: 'Game code already in use' })).toBe('codeExists');
    });
  });

  describe('username-taken', () => {
    it('classifies PLAYER_USERNAME_TAKEN code', () => {
      expect(classifyRoomError({ code: 'PLAYER_USERNAME_TAKEN', message: 'That username is already taken' })).toBe('usernameTaken');
    });

    it('falls back to legacy message containing username', () => {
      expect(classifyRoomError({ message: 'Username already in use' })).toBe('usernameTaken');
    });
  });

  describe('generic / safe defaults', () => {
    it('returns generic for unknown code + message', () => {
      expect(classifyRoomError({ code: 'INTERNAL_ERROR', message: 'Something exploded' })).toBe('generic');
    });

    it('returns generic for null/undefined/empty', () => {
      expect(classifyRoomError(null)).toBe('generic');
      expect(classifyRoomError(undefined)).toBe('generic');
      expect(classifyRoomError({})).toBe('generic');
    });

    it('stays generic for an arbitrary message with none of the markers', () => {
      expect(classifyRoomError({ message: 'Server is busy, retry shortly' })).toBe('generic');
    });
  });

  /**
   * Both of these fell through to 'generic' — i.e. the user saw only
   * "An error occurred", which says nothing about what to change, so they
   * retried IDENTICALLY. Production (30d, lexiclash.live): 108 join errors from
   * just 19 people, ~5.7 attempts each, and those same people are the
   * multiplayer rage-clickers (191 of the product's 320 rage clicks).
   */
  describe('errors that told the user nothing, so they retried unchanged', () => {
    it('classifies the backend NAME_TAKEN code as usernameTaken', () => {
      // gameLifecycleHandler emits code NAME_TAKEN with the message "That name
      // is already in use" — the old matcher wanted PLAYER_USERNAME_TAKEN or the
      // literal word "username", and that message contains neither.
      expect(classifyRoomError({ code: 'NAME_TAKEN', message: 'That name is already in use' })).toBe('usernameTaken');
    });

    it('classifies the legacy untyped name-taken message as usernameTaken', () => {
      expect(classifyRoomError({ message: 'That name is already in use' })).toBe('usernameTaken');
    });

    it('classifies rate limiting as its own kind, not generic', () => {
      // socketHandlers emits this when a player trips the 50 msg/10s limiter —
      // which rage-clicking Join is exactly how you trip. Telling them "an error
      // occurred" invites another tap, which extends the lockout.
      expect(classifyRoomError({ message: 'Too many requests. Please try again later.' })).toBe('rateLimited');
      expect(classifyRoomError({ code: 'RATE_LIMITED', message: 'Slow down.' })).toBe('rateLimited');
      expect(classifyRoomError({ code: 'RATE_LIMIT_EXCEEDED' })).toBe('rateLimited');
    });

    it('still returns generic for genuinely unknown payloads', () => {
      expect(classifyRoomError({ code: 'SOMETHING_NEW', message: 'kaboom' })).toBe('generic');
      expect(classifyRoomError(null)).toBe('generic');
    });
  });
});
