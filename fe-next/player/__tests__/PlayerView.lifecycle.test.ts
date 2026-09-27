/**
 * PlayerView — CrazyGames lifecycle wiring (source-level contract)
 *
 * CG full-launch QA requires gameplayStart/Stop signals during active
 * multiplayer rounds. A full render-level test would require mocking
 * ~20 contexts/hooks; a source-contract test is a lightweight way to
 * lock the wiring and survive refactors.
 */
import { readPlayerViewSource } from './playerViewSource';

describe('PlayerView — CrazyGames lifecycle wiring', () => {
  const source = readPlayerViewSource();

  it('imports useCrazyGamesLifecycle hook', () => {
    expect(source).toMatch(
      /import\s+\{[^}]*useCrazyGamesLifecycle[^}]*\}\s+from\s+['"]@\/hooks\/useCrazyGamesLifecycle['"]/,
    );
  });

  it('invokes useCrazyGamesLifecycle with isGameActive + isGameOver', () => {
    expect(source).toMatch(/useCrazyGamesLifecycle\s*\(\s*\{[\s\S]*?isGameActive[\s\S]*?isGameOver[\s\S]*?\}\s*\)/);
  });

  it('ties isGameActive to gameActive state', () => {
    expect(source).toMatch(/isGameActive:\s*gameActive/);
  });

  it('ties isGameOver to waitingForResults', () => {
    expect(source).toMatch(/isGameOver:\s*waitingForResults/);
  });
});
