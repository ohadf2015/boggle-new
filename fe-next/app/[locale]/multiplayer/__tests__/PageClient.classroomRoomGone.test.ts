import { readMpPageSource } from './mpPageSource';

/**
 * One event, three outcomes (critic-livequiz-r4, finding #10): the server closed
 * a classroom room and the teacher got a countdown, one student was dropped on
 * the generic multiplayer hub with no explanation, and the other student was
 * PROMOTED onto the host's own share-code/QR screen.
 *
 * A classroom student is never a host candidate and never belongs in the arcade
 * hub. The decisions are pure and unit-tested in
 * `lib/education/__tests__/classroomRoomGone.test.ts`; PageClient is a
 * provider-wrapped app shell, so this file guards the WIRING the same way
 * PageClient.rosterSounds does — by contract on the source. The detection-side
 * contracts (fetch enabled for every room, pending-defers) live in
 * PageClient.classroomContext.test.ts.
 */
const source = readMpPageSource();

describe('PageClient — a classroom student survives the room closing', () => {
  it('uses the shared classroom decisions rather than re-deriving them', () => {
    expect(source).toMatch(/resolveClassroomContext/);
    expect(source).toMatch(/hostTransferAction/);
    expect(source).toMatch(/roomGoneAction/);
    expect(source).toMatch(/classroomStudentHomePath/);
  });

  it('never promotes a classroom student on hostTransferred', () => {
    // The old wiring was an unconditional `if (data.newHost === username) setIsHost(true)`.
    const transferred = source.match(/onHostTransferred:[\s\S]{0,900}?\n {4}(?=\w)/);
    expect(transferred, 'onHostTransferred handler not found').toBeTruthy();
    expect(transferred?.[0]).toMatch(/hostTransferAction\(/);
    // The decision reads through a ref so the socket handler sees the current
    // context rather than the one captured when the listener was registered.
    expect(transferred?.[0]).toMatch(/classroomDecisionRef\.current/);
  });

  it('routes a classroom student home instead of leaving them on the MP hub', () => {
    expect(source).toMatch(/classroomStudentHomePath\(/);
    expect(source).toMatch(/CLASSROOM_ROOM_GONE_KEY/);
  });
});
