/**
 * Source-contract test: reconnect/recovery must NOT replay the 3-2-1 countdown.
 *
 * Bug ("game starts more than once with the countdown" + "auto-resume"):
 * the server's requestGameState recovery (gameLifecycleHandler.ts) re-emits
 * `startGame` with reconnect:true and a FRESH `recovery-<ts>` messageId (so the
 * client's messageId dedup can't catch it). handleStartGame's non-lateJoin
 * branch then set showStartAnimation=true → the countdown replayed mid-game and
 * yanked the player back in. A mid-game timer-stall watchdog fires
 * requestGameState on any transient stall, so this hit real players.
 *
 * Contract: a reconnecting/recovering player RESUMES (gameActive=true) WITHOUT
 * the countdown animation — only a genuinely fresh start shows the countdown.
 * (Matches usePlayerGameEvents.reconnectStability source-contract style.)
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(__dirname, '../usePlayerGameEvents.ts'), 'utf8');

describe('usePlayerGameEvents — reconnect must not replay countdown', () => {
  it('resumes (no countdown) for lateJoin OR reconnect', () => {
    // The branch that sets gameActive directly (no 3-2-1) must cover reconnect.
    expect(source).toMatch(/if\s*\(\s*data\.lateJoin\s*\|\|\s*isReconnect\s*\)/);
  });

  it('does NOT show the start animation on a reconnect path', () => {
    // Regression guard: catch a revert to `if (data.lateJoin)` that would let
    // showStartAnimation fire for reconnect (the countdown-replay bug).
    const buggy = /if\s*\(\s*data\.lateJoin\s*\)\s*\{[\s\S]{0,160}storeUpdates\.showStartAnimation\s*=\s*true/;
    expect(source).not.toMatch(buggy);
  });

  it('reports countdownComplete from the resume path (no 8s room stall)', () => {
    // Skipping GoRipplesAnimation means it can't emit countdownComplete; the
    // resume path must report it so a reconnect during the countdown window
    // doesn't block the room's timer-start until the 8s fallback.
    expect(source).toMatch(/sendCountdownComplete\s*\(\s*socket\s*,\s*data\.messageId/);
    // ...and it must be imported.
    expect(source).toMatch(/sendCountdownComplete,/);
  });
});
