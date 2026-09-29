import { describe, it, expect } from 'vitest';
import {
  isClassroomStudent,
  resolveClassroomContext,
  hostTransferAction,
  roomGoneAction,
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

describe('resolveClassroomContext', () => {
  it('is classroom on the URL flag alone (record may be pending or 404)', () => {
    expect(resolveClassroomContext({ urlClassroom: true, recordStatus: 'loading' })).toBe('classroom');
    expect(resolveClassroomContext({ urlClassroom: true, recordStatus: 'absent' })).toBe('classroom');
  });

  it('is classroom on a found record alone — the manual-code join the URL flag misses', () => {
    expect(resolveClassroomContext({ urlClassroom: false, recordStatus: 'found' })).toBe('classroom');
  });

  it('is pending only while the record is loading — never an optimistic arcade default', () => {
    expect(resolveClassroomContext({ urlClassroom: false, recordStatus: 'loading' })).toBe('pending');
  });

  it('is arcade once the record has answered absent — and on idle, where no fetch is coming to flush a deferred decision', () => {
    expect(resolveClassroomContext({ urlClassroom: false, recordStatus: 'absent' })).toBe('arcade');
    // idle = no fetch in flight and none coming (no valid room code). Mapping
    // it to pending would park a deferred room-gone forever: no toast, no URL
    // strip, no session clear — a silent no-op.
    expect(resolveClassroomContext({ urlClassroom: false, recordStatus: 'idle' })).toBe('arcade');
  });
});

describe('hostTransferAction', () => {
  it('sends a classroom student to their hub, never the host seat', () => {
    expect(hostTransferAction({ context: 'classroom', isHost: false })).toBe('exit-to-hub');
  });

  it('defers while the record is pending — a classroom student must not be permanently promoted during the fetch window', () => {
    expect(hostTransferAction({ context: 'pending', isHost: false })).toBe('defer');
  });

  it('lets an arcade player accept the host seat', () => {
    expect(hostTransferAction({ context: 'arcade', isHost: false })).toBe('accept-host');
  });

  it('accepts host in a classroom room when this client IS the teacher', () => {
    expect(hostTransferAction({ context: 'classroom', isHost: true })).toBe('accept-host');
  });
});

describe('roomGoneAction', () => {
  it('sends a classroom student to their hub with the classroom sentence', () => {
    expect(roomGoneAction({ context: 'classroom', isHost: false })).toBe('exit-to-hub');
  });

  it('defers while the record is pending rather than guessing arcade', () => {
    expect(roomGoneAction({ context: 'pending', isHost: false })).toBe('defer');
  });

  it('keeps the arcade feedback path for arcade rooms', () => {
    expect(roomGoneAction({ context: 'arcade', isHost: false })).toBe('arcade-feedback');
    expect(roomGoneAction({ context: 'classroom', isHost: true })).toBe('arcade-feedback');
  });
});

describe('CLASSROOM_ROOM_GONE_KEY', () => {
  it('is a translation key, never literal copy', () => {
    expect(CLASSROOM_ROOM_GONE_KEY).toMatch(/^[a-z][\w.]*[a-zA-Z]$/);
    expect(CLASSROOM_ROOM_GONE_KEY).toContain('.');
  });
});
