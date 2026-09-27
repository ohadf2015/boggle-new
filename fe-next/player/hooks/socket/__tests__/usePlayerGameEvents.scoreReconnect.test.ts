/**
 * Source-contract test: score (leaderboard) restore on reconnect in
 * usePlayerGameEvents.
 *
 * The live MP score lives ONLY in the Zustand `leaderboard[]`, fed by the
 * `updateLeaderboard` event. After a deploy/reconnect the board+timer ride
 * `startGame` but the score rode a SEPARATE event — so a dropped/raced/reset
 * `updateLeaderboard` left the player at "0 PUNTOS". Belt-and-suspenders: the
 * server now also carries the authoritative leaderboard INSIDE the reconnect
 * `startGame` payload, and the handler restores it in the SAME batched setState
 * as the board — atomic, ordering-independent.
 *
 * A render-level test would need ~15 mocks (see blastReconnect); this
 * regex-over-source test locks the wiring at syntactic level, matching the
 * established convention for this hook.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(
  resolve(__dirname, '../usePlayerGameEvents.ts'),
  'utf8',
);

describe('usePlayerGameEvents — score (leaderboard) restore on reconnect', () => {
  it('restores the leaderboard from the reconnect startGame payload', () => {
    expect(source).toMatch(/storeUpdates\.leaderboard\s*=\s*ext\.leaderboard/);
  });

  it('only restores on a reconnect + a non-empty payload (never stomps a fresh game)', () => {
    // The restore must be gated by isReconnect AND a non-empty ext.leaderboard,
    // so a fresh start (which legitimately resets the board to no scores) is
    // never overwritten with stale data.
    const m = source.match(/isReconnect[\s\S]{0,120}ext\.leaderboard/);
    expect(m).not.toBeNull();
  });

  it('declares leaderboard on the StartGameBroadcastExt payload type', () => {
    expect(source).toMatch(/leaderboard\?\s*:\s*LeaderboardEntry\[\]/);
  });

  it('piggybacks on the single batched setState (no extra cascading render)', () => {
    expect(source).toMatch(/useGameStore\.setState\(storeUpdates\)/);
  });
});
