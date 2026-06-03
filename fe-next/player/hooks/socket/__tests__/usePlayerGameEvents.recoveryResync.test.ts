import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * usePlayerGameEvents — recovery emits bypass the stale-session filter
 *
 * The stale-session guard drops any startGame whose gameSessionId is LOWER than
 * the client's `gameSessionIdRef`. That is correct for genuinely-stale duplicate
 * events, but it also silently drops the server's RECOVERY startGame after a
 * server restart / instance switch — exactly when the client's ref has run ahead
 * of the (reset) server counter. The result: the watchdog fires
 * `requestGameState`, the server resends startGame with its real (lower) session
 * id, and the client drops it again → the player stays stuck on a dead board and
 * every submit returns GAME_NOT_IN_PROGRESS.
 *
 * Recovery/reconnect/late-join emits always carry the server's authoritative
 * current state (they set `reconnect: true`), so they must bypass the
 * stale-session filter and re-sync the ref downward.
 */
const source = readFileSync(
  resolve(__dirname, '../usePlayerGameEvents.ts'),
  'utf8',
);

describe('usePlayerGameEvents — recovery resync', () => {
  it('does not drop a reconnect/recovery startGame on a lower gameSessionId', () => {
    // Isolate the region from the top of handleStartGame up to the stale-session
    // log line — this is where the guard (and its recovery exemption) must live.
    const handleStart = source.slice(source.indexOf('const handleStartGame'));
    const guardIdx = handleStart.indexOf('Ignoring stale startGame from old session');
    expect(guardIdx).toBeGreaterThan(-1);
    const guardRegion = handleStart.slice(0, guardIdx);
    // The guard must derive a recovery flag from the reconnect marker...
    expect(guardRegion).toMatch(/data\.reconnect/);
    // ...and the stale-session condition itself must exempt that recovery flag,
    // so a lower-session recovery emit is NOT dropped.
    const lastIf = guardRegion.lastIndexOf('if (');
    const condition = guardRegion.slice(lastIf);
    expect(condition).toMatch(/!isRecoveryEmit|isRecoveryEmit\s*===\s*false|!.*reconnect/);
  });
});
