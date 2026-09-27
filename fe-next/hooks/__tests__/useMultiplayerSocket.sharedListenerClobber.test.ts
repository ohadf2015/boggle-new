import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * useMultiplayerSocket — shared-singleton listener clobber contract
 *
 * Root cause: useMultiplayerSocket attaches to the SHARED Socket.IO singleton
 * (getSharedSocket). SocketContext's SocketProvider also registers its own
 * connection-lifecycle handlers (connect/disconnect/reconnect/...) on that same
 * singleton to drive the app-wide `isConnected`/`isReconnecting` state read by
 * ConnectionDot/ConnectionStatusIndicator.
 *
 * The bug: useMultiplayerSocket cleaned up with `socket.off(event)` — NO handler
 * argument — for those shared events. On a shared socket that removes ALL
 * listeners for the event, including SocketProvider's. After a user visits the
 * MP page and leaves, the singleton has permanently lost SocketProvider's
 * connect/disconnect/reconnect handlers, so the app-wide connection indicator
 * freezes until a full page reload.
 *
 * Fix contract: the connection-lifecycle events that SocketProvider co-owns must
 * be registered as NAMED handlers and removed by reference (`off(event, fn)`),
 * never blanket-removed. They must NOT appear in the blanket `eventNames`
 * off-list. MP-exclusive game events (joined/startGame/...) may still be
 * blanket-removed — useMultiplayerSocket is their sole owner.
 */
const source = readFileSync(
  resolve(__dirname, '../useMultiplayerSocket.ts'),
  'utf8',
);

// Connection-lifecycle events that SocketProvider also registers on the shared
// singleton. Blanket-off on these clobbers SocketProvider's handlers.
const SHARED_LIFECYCLE_EVENTS = [
  'connect',
  'disconnect',
  'connect_error',
  'reconnect',
  'reconnect_failed',
  'error',
];

describe('useMultiplayerSocket — shared listener clobber', () => {
  it('does not blanket-off SocketProvider-owned connection events', () => {
    // Extract the `const eventNames = [ ... ]` array literal that feeds the
    // blanket `eventNames.forEach((e) => socket.off(e))` cleanup.
    const start = source.indexOf('const eventNames = [');
    expect(start).toBeGreaterThan(-1);
    const arrayLiteral = source.slice(start, source.indexOf(']', start) + 1);

    for (const event of SHARED_LIFECYCLE_EVENTS) {
      expect(arrayLiteral).not.toContain(`'${event}'`);
    }
  });

  it('removes each shared connection handler by named reference, not blanket-off', () => {
    // Every shared lifecycle event must be torn down with a handler argument:
    // socket.off('connect', onConnect) — proving only OUR handler is removed.
    for (const event of SHARED_LIFECYCLE_EVENTS) {
      const namedOff = new RegExp(
        `\\.off\\(\\s*['"]${event.replace('_', '_')}['"]\\s*,\\s*\\w`,
      );
      expect(source).toMatch(namedOff);
    }
  });
});
