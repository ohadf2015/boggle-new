/**
 * playAgainIntent.test.ts
 *
 * Test the unified intent system for "Play Again" — ensuring that when
 * a student clicks Play Again after a classroom game, the same game mode
 * and settings are reused without requiring navigation back through the lobby.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  writePlayAgainIntent,
  readPlayAgainIntent,
  clearPlayAgainIntent,
  isCompletePlayAgainIntent,
  PLAY_AGAIN_KEY,
  PLAY_AGAIN_TTL_MS,
  type PlayAgainIntent,
} from '../playAgainIntent';

describe('playAgainIntent', () => {
  beforeEach(() => {
    clearPlayAgainIntent();
  });

  afterEach(() => {
    clearPlayAgainIntent();
  });

  describe('writePlayAgainIntent', () => {
    it('should write a complete intent to sessionStorage', () => {
      const intent: Omit<PlayAgainIntent, 'createdAt'> = {
        gameMode: 'classic',
        roomCode: 'ABCDEF',
        classroomId: 'room-123',
      };

      writePlayAgainIntent(intent, 1000);

      const stored = sessionStorage.getItem(PLAY_AGAIN_KEY);
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored!);
      expect(parsed.gameMode).toBe('classic');
      expect(parsed.roomCode).toBe('ABCDEF');
      expect(parsed.createdAt).toBe(1000);
    });

    it('should handle sessionStorage write failures gracefully', () => {
      const originalSetItem = sessionStorage.setItem;
      sessionStorage.setItem = vi.fn(() => {
        throw new Error('Storage full');
      });

      const intent: Omit<PlayAgainIntent, 'createdAt'> = {
        gameMode: 'word-hunt',
        roomCode: 'XYZ123',
        classroomId: 'room-456',
      };

      // Should not throw
      expect(() => writePlayAgainIntent(intent)).not.toThrow();

      sessionStorage.setItem = originalSetItem;
    });
  });

  describe('readPlayAgainIntent', () => {
    it('should read a valid, non-expired intent', () => {
      const now = 5000;
      const intent: Omit<PlayAgainIntent, 'createdAt'> = {
        gameMode: 'blast',
        roomCode: 'ROOM1',
        classroomId: 'class-789',
      };

      writePlayAgainIntent(intent, now - 1000);

      const read = readPlayAgainIntent(now);
      expect(read).toBeTruthy();
      expect(read?.gameMode).toBe('blast');
      expect(read?.roomCode).toBe('ROOM1');
    });

    it('should return null for an expired intent', () => {
      const now = 10000;
      const intent: Omit<PlayAgainIntent, 'createdAt'> = {
        gameMode: 'classic',
        roomCode: 'OLD',
        classroomId: 'class-old',
      };

      // Write at time 0, read at time > TTL
      writePlayAgainIntent(intent, 0);

      const read = readPlayAgainIntent(now + PLAY_AGAIN_TTL_MS + 1000);
      expect(read).toBeNull();
    });

    it('should return null when sessionStorage is empty', () => {
      const read = readPlayAgainIntent(1000);
      expect(read).toBeNull();
    });

    it('should return null on malformed JSON', () => {
      try {
        sessionStorage.setItem(PLAY_AGAIN_KEY, '{invalid json}');
      } catch {
        // Storage might fail, which is fine
      }

      const read = readPlayAgainIntent(1000);
      expect(read).toBeNull();
    });

    it('should handle sessionStorage read failures gracefully', () => {
      const originalGetItem = sessionStorage.getItem;
      sessionStorage.getItem = vi.fn(() => {
        throw new Error('Storage unavailable');
      });

      const read = readPlayAgainIntent(1000);
      expect(read).toBeNull();

      sessionStorage.getItem = originalGetItem;
    });
  });

  describe('isCompletePlayAgainIntent', () => {
    it('should accept a complete intent', () => {
      const intent: PlayAgainIntent = {
        gameMode: 'word-hunt',
        roomCode: 'ABC123',
        classroomId: 'class-xyz',
        createdAt: 1000,
      };

      expect(isCompletePlayAgainIntent(intent)).toBe(true);
    });

    it('should reject an intent missing gameMode', () => {
      const intent = {
        roomCode: 'ABC123',
        classroomId: 'class-xyz',
        createdAt: 1000,
      };

      expect(isCompletePlayAgainIntent(intent)).toBe(false);
    });

    it('should reject an intent with invalid gameMode', () => {
      const intent = {
        gameMode: 'not-a-real-mode',
        roomCode: 'ABC123',
        classroomId: 'class-xyz',
        createdAt: 1000,
      };

      expect(isCompletePlayAgainIntent(intent)).toBe(false);
    });

    it('should reject an intent missing roomCode', () => {
      const intent = {
        gameMode: 'classic',
        classroomId: 'class-xyz',
        createdAt: 1000,
      };

      expect(isCompletePlayAgainIntent(intent)).toBe(false);
    });

    it('should reject an intent with empty roomCode', () => {
      const intent = {
        gameMode: 'classic',
        roomCode: '',
        classroomId: 'class-xyz',
        createdAt: 1000,
      };

      expect(isCompletePlayAgainIntent(intent)).toBe(false);
    });

    it('should reject null or non-object values', () => {
      expect(isCompletePlayAgainIntent(null)).toBe(false);
      expect(isCompletePlayAgainIntent(undefined)).toBe(false);
      expect(isCompletePlayAgainIntent('string')).toBe(false);
      expect(isCompletePlayAgainIntent(123)).toBe(false);
    });
  });

  describe('clearPlayAgainIntent', () => {
    it('should remove the intent from sessionStorage', () => {
      const intent: Omit<PlayAgainIntent, 'createdAt'> = {
        gameMode: 'classic',
        roomCode: 'TEST1',
        classroomId: 'class-test',
      };

      writePlayAgainIntent(intent);
      clearPlayAgainIntent();

      const read = readPlayAgainIntent();
      expect(read).toBeNull();
    });

    it('should handle removal failures gracefully', () => {
      const originalRemoveItem = sessionStorage.removeItem;
      sessionStorage.removeItem = vi.fn(() => {
        throw new Error('Remove failed');
      });

      expect(() => clearPlayAgainIntent()).not.toThrow();

      sessionStorage.removeItem = originalRemoveItem;
    });
  });

  describe('TTL enforcement', () => {
    it('should accept intents within the TTL window', () => {
      const now = 10000;
      const withinTTL = now - (PLAY_AGAIN_TTL_MS / 2);

      const intent: Omit<PlayAgainIntent, 'createdAt'> = {
        gameMode: 'wheel-rush',
        roomCode: 'MID',
        classroomId: 'mid-class',
      };

      writePlayAgainIntent(intent, withinTTL);
      const read = readPlayAgainIntent(now);
      expect(read).toBeTruthy();
    });

    it('should reject intents just past the TTL window', () => {
      const now = 10000;
      const pastTTL = now - (PLAY_AGAIN_TTL_MS + 100);

      const intent: Omit<PlayAgainIntent, 'createdAt'> = {
        gameMode: 'classic',
        roomCode: 'PAST',
        classroomId: 'past-class',
      };

      writePlayAgainIntent(intent, pastTTL);
      const read = readPlayAgainIntent(now);
      expect(read).toBeNull();
    });
  });
});
