import { describe, it, expect } from 'vitest';
import { hideClassroomChrome, classroomPanelExpanded } from './classroomLobbyChrome';

/**
 * Regression guard for the 2026-08-30 "five abandoned rooms" incident.
 *
 * A teacher created five classroom rooms in 37 minutes and no student ever
 * joined. Reproduced on production: the host screen contained the game code
 * ZERO times, because the classroom header + code/QR panel were gated on
 * `isActive`, which `onJoined` sets to true the moment the host enters the
 * LOBBY — not when the game starts. The code vanished exactly when the teacher
 * needed to read it onto a projector.
 */
describe('classroom lobby chrome visibility', () => {
  describe('hideClassroomChrome', () => {
    it('KEEPS the code on screen while the host waits in the lobby', () => {
      // Given: host has joined the room, no game running yet
      // (this is the case the old `isActive` predicate got wrong)
      expect(hideClassroomChrome({ gameActive: false, showResults: false })).toBe(false);
    });

    it('hides chrome during real gameplay so the grid gets the space', () => {
      expect(hideClassroomChrome({ gameActive: true, showResults: false })).toBe(true);
    });

    it('KEEPS the code on screen on the results screen', () => {
      // Late joiners for the next round still need the code.
      expect(hideClassroomChrome({ gameActive: true, showResults: true })).toBe(false);
    });

    it('keeps the code on screen before anything has started', () => {
      expect(hideClassroomChrome({ gameActive: false, showResults: true })).toBe(false);
    });
  });

  describe('classroomPanelExpanded', () => {
    it('renders the FULL panel (code + QR) while waiting in the lobby', () => {
      expect(classroomPanelExpanded({ gameActive: false })).toBe(true);
    });

    it('collapses to the slim banner once the game is actually running', () => {
      expect(classroomPanelExpanded({ gameActive: true })).toBe(false);
    });
  });
});
