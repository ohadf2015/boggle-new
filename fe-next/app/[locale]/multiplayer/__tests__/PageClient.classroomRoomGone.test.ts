import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * One event, three outcomes (critic-livequiz-r4, finding #10): the server closed
 * a classroom room and the teacher got a countdown, one student was dropped on
 * the generic multiplayer hub with no explanation, and the other student was
 * PROMOTED onto the host's own share-code/QR screen.
 *
 * A classroom student is never a host candidate and never belongs in the arcade
 * hub. The decision itself is pure and unit-tested in
 * `lib/education/__tests__/classroomRoomGone.test.ts`; PageClient is ~750 lines
 * of provider-wrapped app shell, so this file guards the WIRING the same way
 * PageClient.rosterSounds does — by contract on the source.
 */
const source = readFileSync(resolve(__dirname, '../PageClient.tsx'), 'utf8');

describe('PageClient — a classroom student survives the room closing', () => {
  it('uses the shared classroom-student predicate rather than re-deriving it', () => {
    expect(source).toMatch(/isClassroomStudent/);
    expect(source).toMatch(/classroomStudentHomePath/);
  });

  it('never promotes a classroom student on hostTransferred', () => {
    // The old wiring was an unconditional `if (data.newHost === username) setIsHost(true)`.
    const transferred = source.match(/onHostTransferred:[\s\S]{0,600}?\n {4}(?=\w)/);
    expect(transferred, 'onHostTransferred handler not found').toBeTruthy();
    // The predicate is read through a ref so the socket handler sees the current
    // role rather than the one captured when the listener was registered.
    expect(transferred?.[0]).toMatch(/classroomStudentRef\.current/);
    expect(source).toMatch(/classroomStudentRef\.current = isClassroomStudent\(/);
  });

  it('routes a classroom student home instead of leaving them on the MP hub', () => {
    expect(source).toMatch(/classroomStudentHomePath\(/);
    expect(source).toMatch(/CLASSROOM_ROOM_GONE_KEY/);
  });
});
