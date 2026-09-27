import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * useMultiplayerSocket — GAME_NOT_IN_PROGRESS recovery contract
 *
 * Root cause of "game not in progress a lot": the client's local `gameActive`
 * flag and the server's `gameState` can drift (server restart bumps the room's
 * gameSessionId backwards so `timeUpdate`s get filtered; a missed `endGame`;
 * a stale board after reset). When that happens the player keeps submitting
 * words and the server keeps replying GAME_NOT_IN_PROGRESS.
 *
 * Previously the only response was `socket.emit('debugGameState')` whose
 * `debugGameStateResponse` handler merely logged — so the error repeated with
 * no recovery. This test pins the fix: on GAME_NOT_IN_PROGRESS the client must
 * trigger the real recovery path (`requestGameState`), and the
 * `debugGameStateResponse` handler must reconcile (recover/reset) instead of
 * being a pure log no-op.
 */
const source = readFileSync(
  resolve(__dirname, '../useMultiplayerSocket.ts'),
  'utf8',
);

describe('useMultiplayerSocket — game state recovery', () => {
  it('requests authoritative game state when the server rejects with GAME_NOT_IN_PROGRESS', () => {
    // The error handler branch that detects the not-in-progress mismatch must
    // kick off the recovery path that the server actually services
    // (requestGameState resends startGame / results), not just a debug query.
    const errorHandler = source.slice(
      source.indexOf("data?.code === 'GAME_NOT_IN_PROGRESS'"),
    );
    const branch = errorHandler.slice(0, errorHandler.indexOf('}'));
    expect(branch).toMatch(/emit\(['"]requestGameState['"]\)/);
  });

  it('reconciles client state inside debugGameStateResponse instead of only logging', () => {
    const handlerStart = source.indexOf("socketInstance.on('debugGameStateResponse'");
    expect(handlerStart).toBeGreaterThan(-1);
    // Grab the handler body up to the closing of the arrow callback.
    const handlerBody = source.slice(handlerStart, handlerStart + 1400);
    // It must act on the reported server state, not just log it.
    expect(handlerBody).toMatch(/gameState/);
    // 'waiting' on the server while the client thinks it's mid-game means the
    // round was reset out from under the client — fall back to the reset path.
    expect(handlerBody).toMatch(/onGameReset|requestGameState/);
  });
});
