import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Measured live 2026-09-15. A teacher launched a classroom game from
 * `/en/teacher` (GO LIVE), landed on
 * `/en/multiplayer?room=XLXFSU&classroom=true&host=true`, tapped Back in the
 * lobby, confirmed — and landed on `/en/multiplayer`: the CONSUMER arcade
 * lobby, titled "Free Multiplayer Word Game — 2-20 Players, 8 Modes, No
 * Signup", education shell gone, Quick Play / Daily / Ranks / Arena Hub chrome
 * in its place and "Home" one tap from `/en`.
 *
 * `handleExitToLobby` stripped `room|classroom|host` and then chose no
 * destination, so the user was left standing on whatever route the params had
 * been removed from. The strip itself is correct and must stay (audit
 * `multiplayer-ux-2026-05-04 #5`: a reload re-entering the lobby being left).
 *
 * The decision is pure and unit-tested in
 * `lib/multiplayer/__tests__/exitDestination.test.ts`. PageClient is an
 * ~830-line provider-wrapped app shell, so — exactly as
 * `PageClient.classroomRoomGone.test.ts` does for the room-gone wiring — this
 * file guards the WIRING by contract on the source.
 */
const source = readFileSync(resolve(__dirname, '../PageClient.tsx'), 'utf8');

/** Body of `handleExitToLobby`, from its declaration to the closing `}, [`. */
function exitHandlerBody(): string {
  const start = source.indexOf('const handleExitToLobby');
  if (start < 0) return '';
  const end = source.indexOf('}, [', start);
  return end < 0 ? source.slice(start) : source.slice(start, end);
}

describe('PageClient — leaving a classroom room does not drop the teacher in the arcade', () => {
  it('still strips the exit-trap params (the 2026-05-04 fix is not reverted)', () => {
    expect(exitHandlerBody()).toMatch(/stripMultiplayerExitParams/);
  });

  it('asks the shared helper where to go rather than re-deriving a route', () => {
    expect(source).toMatch(/multiplayerExitDestination/);
    expect(exitHandlerBody()).toMatch(/multiplayerExitDestination\(/);
  });

  it('performs a real navigation on that destination, not just a replaceState', () => {
    const body = exitHandlerBody();
    // `history.replaceState` rewrites the URL without re-running route guards or
    // re-evaluating the layout — which is why the education shell never came
    // back. Leaving the multiplayer surface has to be a router navigation.
    expect(body).toMatch(/router\.(push|replace)\(/);
  });

  it('does not hardcode a teacher or student route at the call site', () => {
    const body = exitHandlerBody();
    expect(body).not.toMatch(/['"`]\/\$\{[^}]*\}\/teacher['"`]/);
    expect(body).not.toMatch(/['"`]\/\$\{[^}]*\}\/student['"`]/);
  });
});

/**
 * There are TWO ways out of a live room and they are not the same function.
 * `handleExitToLobby` serves the results "Exit" button and the host-left modal;
 * the ConnectionBanner's inline `onLeaveGame` serves the in-lobby Back button —
 * which is the one a teacher actually taps mid-lesson, and the one that produced
 * the measured `/en/multiplayer` landing. `handleExitToLobby`'s own comment says
 * it "Mirrors the ConnectionBanner onLeaveGame path", and the two drifted:
 * fixing only the first left the real path broken.
 *
 * That is the asymmetry itself (pitfalls class 3), so it is what this block
 * pins. A third exit added later must choose a destination too.
 */
function leaveGameHandlerBody(): string {
  const start = source.indexOf('onLeaveGame={() => {');
  if (start < 0) return '';
  const end = source.indexOf('}} />', start);
  return end < 0 ? source.slice(start) : source.slice(start, end);
}

describe('PageClient — EVERY exit from a classroom room chooses a destination', () => {
  it('finds the ConnectionBanner in-lobby leave handler', () => {
    expect(leaveGameHandlerBody(), 'onLeaveGame handler not found').not.toBe('');
  });

  it('the in-lobby Back path asks the same helper where to go', () => {
    expect(leaveGameHandlerBody()).toMatch(/multiplayerExitDestination\(/);
  });

  it('the in-lobby Back path performs a real navigation', () => {
    expect(leaveGameHandlerBody()).toMatch(/router\.(push|replace)\(/);
  });

  it('both exit paths consult the helper — not just one of them', () => {
    const calls = source.match(/multiplayerExitDestination\(/g) ?? [];
    expect(
      calls.length,
      'each exit path needs its own destination decision; one call means a path was missed',
    ).toBeGreaterThanOrEqual(2);
  });
});
