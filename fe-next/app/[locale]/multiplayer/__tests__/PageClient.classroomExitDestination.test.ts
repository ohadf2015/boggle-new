import { readMpPageSource } from './mpPageSource';

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
const source = readMpPageSource();

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
 * The in-lobby Back (ConnectionBanner `onLeaveGame`) is the exit a teacher taps
 * mid-lesson. It used to repeat the reset inline and drifted from
 * `handleExitToLobby` (pitfalls class 3); it now routes through it.
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

  it('the in-lobby Back path goes through handleExitToLobby, which chooses the destination', () => {
    expect(leaveGameHandlerBody()).toMatch(/handleExitToLobby\(\)/);
    expect(exitHandlerBody()).toMatch(/multiplayerExitDestination\(/);
  });
});
