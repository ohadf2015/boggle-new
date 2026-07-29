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
});
