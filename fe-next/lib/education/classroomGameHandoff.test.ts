/**
 * The classroom → multiplayer handoff.
 *
 * ClassroomGameLobby writes the teacher's lesson (vocabulary, game mode, timer)
 * to sessionStorage and then navigates to /multiplayer. useMultiplayerSession
 * reads it back. Historically the read was gated on `?fromLesson=true` — a param
 * NOTHING in the app ever set — so the teacher's words never reached the board
 * and the teacher's mode never seeded the host pre-game selector.
 *
 * Every unit test of the downstream components passed lessonData as a *prop*,
 * so the dead channel was invisible. These tests assert the two ends against
 * each other: the URL the lobby actually produces must satisfy the gate the
 * session hook actually applies.
 */

import { describe, it, expect } from 'vitest';
import { classroomMultiplayerPath, shouldLoadLessonData } from './classroomGameHandoff';

describe('classroomMultiplayerPath', () => {
  it('carries the room code and marks the room as a host-run classroom game', () => {
    const path = classroomMultiplayerPath('en', 'ABC123');
    expect(path).toBe('/en/multiplayer?room=ABC123&classroom=true&host=true');
  });

  it('respects the active locale so the teacher is not bounced to English', () => {
    expect(classroomMultiplayerPath('he', 'XYZ789')).toContain('/he/multiplayer');
  });
});

describe('shouldLoadLessonData', () => {
  it('loads the lesson for the URL the classroom lobby actually navigates to', () => {
    const search = new URL(`https://x${classroomMultiplayerPath('en', 'ABC123')}`).search;
    expect(shouldLoadLessonData(search)).toBe(true);
  });

  it('still honours the legacy ?fromLesson=true entry point', () => {
    expect(shouldLoadLessonData('?room=ABC123&fromLesson=true')).toBe(true);
  });

  it('does not leak a stale lesson into a casual room opened in the same tab', () => {
    expect(shouldLoadLessonData('?room=ABC123')).toBe(false);
    expect(shouldLoadLessonData('')).toBe(false);
    expect(shouldLoadLessonData('?classroom=false')).toBe(false);
  });
});
