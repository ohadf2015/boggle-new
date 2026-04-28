/**
 * HostView — CrazyGames lifecycle wiring (source-level contract)
 *
 * Audit ref: BLT-SYNC-1 (blast MP audit 2026-04-28) — pairs with
 * CG-CRIT-1 (multiplayer audit 2026-04-27). MP hosts must emit
 * gameplayStart/Stop for CG QA detection just like the player side.
 *
 * Mirrors PlayerView.lifecycle.test.ts: a render-level test would need
 * ~20 context/hook mocks; the source-contract test is a lightweight
 * regression lock that fails if a refactor drops the wiring.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('HostView — CrazyGames lifecycle wiring', () => {
  const source = readFileSync(
    resolve(__dirname, '../HostView.tsx'),
    'utf8',
  );

  it('imports useCrazyGamesLifecycle hook', () => {
    expect(source).toMatch(
      /import\s+\{[^}]*useCrazyGamesLifecycle[^}]*\}\s+from\s+['"]@\/hooks\/useCrazyGamesLifecycle['"]/,
    );
  });

  it('invokes useCrazyGamesLifecycle with isGameActive + isGameOver', () => {
    expect(source).toMatch(/useCrazyGamesLifecycle\s*\(\s*\{[\s\S]*?isGameActive[\s\S]*?isGameOver[\s\S]*?\}\s*\)/);
  });

  it('ties isGameActive to runtime.gameStarted (gated by !waitingForResults)', () => {
    // Host shell drives lifecycle from the runtime reducer state; gate prevents
    // a stale "active" signal during the results-screen tail of a round.
    expect(source).toMatch(/isGameActive:\s*runtime\.gameStarted\s*&&\s*!runtime\.waitingForResults/);
  });

  it('ties isGameOver to runtime.waitingForResults', () => {
    expect(source).toMatch(/isGameOver:\s*runtime\.waitingForResults/);
  });

  it('passes roundKey from tournament data so multi-round runs re-emit gameplayStart', () => {
    // Without a changing roundKey, the hook's hasStartedRef would suppress
    // start emits on rounds 2+ — CG QA flagged exactly this in 2026-04 audit.
    expect(source).toMatch(/roundKey:\s*tournament\.tournamentData\?\.currentRound/);
  });
});
