import { describe, it, expect } from 'vitest';
import {
  isClassroomStudent,
  classroomStudentHomePath,
  CLASSROOM_ROOM_GONE_KEY,
} from '../classroomRoomGone';

/**
 * When the server tears a classroom room down (host reconnect timeout, room
 * gone), a live critic run saw three different outcomes from one event: the
 * teacher got a "HOST LEFT" countdown, one student was dropped on the generic
 * multiplayer hub with no explanation, and the other student was PROMOTED into
 * the host's own share-code/QR screen.
 *
 * A student in a classroom room is never a candidate host and never belongs in
 * the arcade hub. These are the two decisions that has to turn on, kept pure so
 * they are testable away from `app/[locale]/multiplayer/PageClient.tsx`.
 */
describe('isClassroomStudent', () => {
  it('is true for a student in a classroom room', () => {
    expect(isClassroomStudent({ isClassroomMode: true, isHost: false })).toBe(true);
  });

  it('is false for the teacher hosting that room', () => {
    expect(isClassroomStudent({ isClassroomMode: true, isHost: true })).toBe(false);
  });

  it('is false in a normal multiplayer room, where host promotion is correct', () => {
    expect(isClassroomStudent({ isClassroomMode: false, isHost: false })).toBe(false);
  });
});

describe('classroomStudentHomePath', () => {
  it('sends a student back to their own hub, locale intact', () => {
    expect(classroomStudentHomePath('en')).toBe('/en/student');
    expect(classroomStudentHomePath('he')).toBe('/he/student');
  });

  it('falls back to English rather than emitting a pathless //student', () => {
    expect(classroomStudentHomePath('')).toBe('/en/student');
  });
});

describe('CLASSROOM_ROOM_GONE_KEY', () => {
  it('is a translation key, never literal copy', () => {
    expect(CLASSROOM_ROOM_GONE_KEY).toMatch(/^[a-z][\w.]*[a-zA-Z]$/);
    expect(CLASSROOM_ROOM_GONE_KEY).toContain('.');
  });
});
