import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * PlayerView — pendingGameStart dedup contract
 *
 * A normal MP game start runs both usePlayerGameEvents.handleStartGame (which
 * does the store/timer/ack work and calls `markStartGameHandled`) AND this
 * effect. When the socket handler already processed the messageId, the effect
 * must short-circuit: skip the redundant `useGameStore.setState`, timer reset,
 * and `startGameAck`, doing only its effect-only work (mode-reveal trigger)
 * and consuming the pending start.
 *
 * The handled-check must sit ABOVE the `isReconnect` branch so reconnect
 * double-handling is covered too.
 */
const source = readFileSync(resolve(__dirname, '../PlayerView.tsx'), 'utf8');

describe('PlayerView — pendingGameStart dedup', () => {
  it('imports wasStartGameHandled from gameEventUtils', () => {
    expect(source).toMatch(/wasStartGameHandled/);
  });

  it('checks wasStartGameHandled for the pending start messageId', () => {
    expect(source).toMatch(
      /wasStartGameHandled\('PLAYER',\s*pendingGameStart\.messageId\)/,
    );
  });

  it('runs the handled-check before the isReconnect branch', () => {
    const effectStart = source.indexOf('Handle pending game start');
    expect(effectStart).toBeGreaterThan(0);
    const handledIdx = source.indexOf('wasStartGameHandled', effectStart);
    const reconnectIdx = source.indexOf('isReconnect', effectStart);
    expect(handledIdx).toBeGreaterThan(0);
    expect(reconnectIdx).toBeGreaterThan(0);
    expect(handledIdx).toBeLessThan(reconnectIdx);
  });

  it('short-circuits with an early return inside the handled branch', () => {
    // The handled branch must consume the pending start and return BEFORE
    // falling through to the full setState path — assert the ordered pattern
    // within a single `if (wasStartGameHandled(...)) { ... }` block.
    expect(source).toMatch(
      /if \(wasStartGameHandled\([^)]*\)\) \{[\s\S]*?onGameStartConsumed\(\);[\s\S]*?return;[\s\S]*?\n {4}\}/,
    );
  });
});
