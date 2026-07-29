/**
 * gameStartHandler — round timer is gated on countdownComplete, not on ack.
 * Source-level contract test. Confirms:
 *  - Bot-only rooms short-circuit and call startGameTimer immediately.
 *  - Multi-human rooms wait via setCountdownCompleteTimeout (not the old
 *    setAcknowledgmentTimeout) before falling back to startGameTimer.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('gameStartHandler — countdown gate', () => {
  const source = readFileSync(
    resolve(__dirname, '../gameStartHandler.ts'),
    'utf8',
  );

  it('short-circuits startGameTimer for bot-only rooms (no humans)', () => {
    expect(source).toMatch(/humanUsernames\.length\s*===\s*0[\s\S]{0,200}startGameTimer\(/);
  });

  it('uses setCountdownCompleteTimeout (not setAcknowledgmentTimeout) for the timer-start fallback', () => {
    expect(source).toMatch(/setCountdownCompleteTimeout\(/);
    // The old ack-based timer-start fallback must be gone:
    expect(source).not.toMatch(/setAcknowledgmentTimeout\(\s*gameCode\s*,\s*\d+\s*,\s*\(\)\s*=>\s*\{[\s\S]{0,80}startGameTimer/);
  });

  it('force-syncs still-loading players when the countdown fallback fires (host-starts-early catch-up)', () => {
    // The fallback callback must iterate the missing players and resend startGame
    // with reconnect:true (silent resume) so a slow-loading client lands on the
    // running board instead of being stuck "waiting for the game to load".
    const idx = source.indexOf('setCountdownCompleteTimeout(');
    expect(idx).toBeGreaterThan(0);
    const block = source.slice(idx, idx + 1500);
    expect(block).toMatch(/stats\.missing/);
    expect(block).toMatch(/safeEmit\([\s\S]{0,160}reconnect:\s*true/);
  });
});

describe('gameLifecycleHandler — countdownComplete handler', () => {
  const source = readFileSync(
    resolve(__dirname, '../gameLifecycleHandler.ts'),
    'utf8',
  );

  it('registers a countdownComplete socket handler', () => {
    expect(source).toMatch(/socket\.on\(\s*['"]countdownComplete['"]/);
  });

  it('starts the round timer when all clients report countdownComplete', () => {
    const idx = source.indexOf("socket.on('countdownComplete'");
    expect(idx).toBeGreaterThan(0);
    const block = source.slice(idx, idx + 600);
    expect(block).toMatch(/recordCountdownComplete\(/);
    expect(block).toMatch(/allReady[\s\S]{0,120}startGameTimer\(/);
  });

  it('startGameAck handler no longer starts the round timer', () => {
    const idx = source.indexOf("socket.on('startGameAck'");
    expect(idx).toBeGreaterThan(0);
    const block = source.slice(idx, idx + 600);
    expect(block).not.toMatch(/startGameTimer\(/);
  });
});
