import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Bug: handleExitToLobby (used by the results "Exit" button and the host-left
 * grace modal) reset MP client state in place but NEVER told the server the
 * player left — so the room kept a ghost player in its roster and never migrated
 * host. The ConnectionBanner onLeaveGame path emits leaveRoom; this path didn't.
 * (signalIntentionalLeave/socket are declared after this callback, so it must
 * notify via the earlier socketRef.)
 *
 * Source-contract style (matches PageClient.gameStartConsumed.test).
 */
const source = readFileSync(resolve(__dirname, '../PageClient.tsx'), 'utf8');

describe('PageClient — exit to lobby notifies the server', () => {
  it('handleExitToLobby emits leaveRoom so the player is not a ghost in the room', () => {
    // leaveRoom must appear inside the handleExitToLobby useCallback body
    // (between its `() => {` and the closing `}, [` deps array).
    const block = /const handleExitToLobby = useCallback\(\(\)\s*=>\s*\{[\s\S]*?leaveRoom[\s\S]*?\},\s*\[/;
    expect(source).toMatch(block);
  });
});
