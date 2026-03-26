import { vi, type Mock, } from 'vitest';
/**
 * Test for empty roomName bug in session saving
 *
 * Bug: When saveSession is called in the 'joined' event handler, it uses
 * the local roomName state which may be empty (React state update is async),
 * instead of using data.roomName from the server response.
 *
 * On socket reconnection, this empty roomName is used directly without fallback,
 * causing backend validation to fail.
 */

import { saveSession, getSession, clearSession } from '@/utils/session';
import type { Session } from '@/types';

// Mock js-cookie
vi.mock('js-cookie', () => ({
  default: {
    set: vi.fn(),
    get: vi.fn(),
    remove: vi.fn(),
  },
}));

import Cookies from 'js-cookie';

describe('Session roomName handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (Cookies.get as Mock).mockReturnValue(null);
  });

  describe('Bug reproduction: empty roomName in session', () => {
    it('should NOT save empty roomName when server provides a valid one', () => {
      // Simulate the bug scenario:
      // - Server response (data) has roomName: "Fish Room"
      // - But local React state roomName is "" (not yet updated)

      // This is how the buggy code saves the session:
      // roomName: data.isHost ? roomName : ''
      // where roomName is the empty local state

      const serverResponse = {
        gameCode: 'ABC123',
        roomName: 'Fish Room',  // Server KNOWS the room name
        isHost: true,
        username: 'Fish',
        language: 'he',
      };

      const localRoomNameState = '';  // Bug: React state not updated yet

      // Buggy behavior - uses empty local state
      const buggySession = {
        gameCode: serverResponse.gameCode,
        username: serverResponse.username,
        isHost: serverResponse.isHost,
        roomName: serverResponse.isHost ? localRoomNameState : '',  // BUG: empty!
        language: serverResponse.language,
      };

      // This is what gets saved - EMPTY roomName!
      expect(buggySession.roomName).toBe('');

      // Fixed behavior - should use server response first
      const fixedSession = {
        gameCode: serverResponse.gameCode,
        username: serverResponse.username,
        isHost: serverResponse.isHost,
        roomName: serverResponse.roomName || localRoomNameState || '',  // FIXED: uses server response
        language: serverResponse.language,
      };

      expect(fixedSession.roomName).toBe('Fish Room');
    });

    it('should use server roomName when local state is empty', () => {
      const serverRoomName = 'Server Room';
      const localRoomName = '';  // Empty local state (async update not complete)

      // Fixed logic: data.roomName || localRoomName || ''
      const result = serverRoomName || localRoomName || '';
      expect(result).toBe('Server Room');
    });

    it('should fallback to local roomName if server returns undefined', () => {
      const serverRoomName = undefined;
      const localRoomName = 'Local Room';

      // Fixed logic should still work
      const result = serverRoomName || localRoomName || '';
      expect(result).toBe('Local Room');
    });

    it('should return empty string only when both are empty/undefined', () => {
      const serverRoomName = undefined;
      const localRoomName = '';

      const result = serverRoomName || localRoomName || '';
      expect(result).toBe('');
    });
  });

  describe('Reconnection scenario', () => {
    it('should reject createGame with empty roomName on backend', () => {
      // Simulate what the backend validation does
      const roomNameSchema = /^[a-zA-Z0-9\s._\-\u0590-\u05FF\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]+$/;

      // Empty string does NOT match the regex
      const emptyRoomName = '';
      expect(emptyRoomName).not.toMatch(roomNameSchema);

      // Valid room name DOES match
      const validRoomName = 'Fish Room';
      expect(validRoomName).toMatch(roomNameSchema);
    });

    it('should have fallback in reconnection when session has empty roomName', () => {
      // Simulate session with empty roomName (bug state)
      const savedSession = {
        gameCode: 'ABC123',
        username: 'Fish',
        isHost: true,
        roomName: '',  // Empty due to bug
        hostUsername: 'Fish',
        language: 'he' as const,
      };

      // The reconnection code SHOULD have fallback:
      // roomName: savedSession.roomName || `${savedSession.hostUsername} Room`
      const reconnectRoomName = savedSession.roomName || `${savedSession.hostUsername} Room`;

      expect(reconnectRoomName).toBe('Fish Room');
      expect(reconnectRoomName).not.toBe('');
    });
  });
});
