/**
 * Source-contract tests for two MP-stability fixes (audit 2026-05-10):
 *
 * 1. timeUpdate gameSessionId filter must use `<` not `!==`.
 *    Strict-equality drops legitimate timeUpdates from a NEW session that
 *    arrive before the corresponding startGame updates the ref (rare reorder
 *    on reconnect snapshots).
 *
 * 2. handleStartGame must NOT clear foundWords on reconnect, and should
 *    seed them from `ext.myFoundWords` when the server replays.
 *
 * Source-contract style mirrors usePlayerGameEvents.blastReconnect: regex
 * over source survives refactors that preserve intent.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(
  resolve(__dirname, '../usePlayerGameEvents.ts'),
  'utf8',
);

describe('usePlayerGameEvents — MP stability fixes 2026-05-10', () => {
  describe('timeUpdate gameSessionId filter', () => {
    it('uses `<` (older-only) not strict !== for stale-session reject', () => {
      // Find the handleTimeUpdate body and assert it's `<`-based, not `!==`.
      const block =
        /handleTimeUpdate[\s\S]*?data\.gameSessionId\s*<\s*gameSessionIdRef\.current/;
      expect(source).toMatch(block);
    });

    it('does NOT reject equal-or-newer timeUpdate session ids', () => {
      // Regression guard: catch any future revert to strict !==
      const stricter =
        /handleTimeUpdate[\s\S]{0,200}data\.gameSessionId\s*!==\s*gameSessionIdRef\.current/;
      expect(source).not.toMatch(stricter);
    });
  });

  describe('handleStartGame reconnect foundWords replay', () => {
    it('reads `data.reconnect` to branch foundWords behavior', () => {
      expect(source).toMatch(/const\s+isReconnect\s*=\s*data\.reconnect\s*===\s*true/);
    });

    it('clears foundWords ONLY when not reconnecting', () => {
      // The `foundWords: []` clear must be inside the !isReconnect branch
      const branch = /if\s*\(\s*!isReconnect\s*\)\s*\{[\s\S]{0,200}storeUpdates\.foundWords\s*=\s*\[\]/;
      expect(source).toMatch(branch);
    });

    it('seeds foundWords from ext.myFoundWords on reconnect', () => {
      // Reconnect path maps server string[] → FoundWord[]
      expect(source).toMatch(/ext\.myFoundWords/);
      expect(source).toMatch(/ext\.myFoundWords\.map/);
    });

    it('declares myFoundWords on the StartGameBroadcastExt interface', () => {
      // Ensures the type is plumbed end-to-end (catch removal of the field)
      expect(source).toMatch(/myFoundWords\?:\s*string\[\]/);
    });
  });
});
