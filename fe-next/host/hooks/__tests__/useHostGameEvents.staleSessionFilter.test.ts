/**
 * useHostGameEvents — stale-session filter parity with player
 *
 * The player handler (`usePlayerGameEvents.handleTimeUpdate`) uses `<` so it
 * only rejects OLDER sessions. The host previously used strict `!==`, which
 * also drops legitimate `timeUpdate` emits from a NEW session that arrive
 * before the corresponding `startGame` updates `gameSessionIdRef` (a real
 * reorder seen on reconnect snapshots and rolling deploys). On host that
 * race would freeze the timer display until the next `startGame` arrived —
 * a stall watchdog now covers it, but the parity fix removes the trigger.
 *
 * This file pins the operator so future edits don't regress back to `!==`.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('useHostGameEvents — handleTimeUpdate stale-session filter', () => {
  const source = readFileSync(
    resolve(__dirname, '../socket/useHostGameEvents.ts'),
    'utf8',
  );

  it('uses `<` (only-older) comparison, not strict `!==`', () => {
    const timeUpdateFnMatch = source.match(
      /const handleTimeUpdate\s*=[\s\S]*?(?=const handle[A-Z])/,
    );
    expect(timeUpdateFnMatch).not.toBeNull();
    const fnBody = timeUpdateFnMatch![0];

    expect(fnBody).toMatch(/data\.gameSessionId\s*<\s*gameSessionIdRef\.current/);
    expect(fnBody).not.toMatch(/data\.gameSessionId\s*!==\s*gameSessionIdRef\.current/);
  });
});
