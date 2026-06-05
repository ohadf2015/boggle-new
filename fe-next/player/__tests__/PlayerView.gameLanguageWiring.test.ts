/**
 * PlayerView — in-game language must come from the authoritative store
 * (source-level contract).
 *
 * REGRESSION: `usePlayerLobby` returns a local `gameLanguage` useState that is
 * NEVER set (the socket startGame handler writes the Zustand store, not this
 * local setter). The waiting view masked it with `|| roomLanguage`, but the
 * in-game view passed the bare null through to PlayerInGameView → useWordSubmission
 * → `gameLanguage || 'en'` → English regex → valid Spanish accented words
 * (á é í ó ú ü ñ, which the board DOES generate) were rejected with
 * "Use only letters from this language".
 *
 * The authoritative source is the store (`useGameLanguage()` from
 * `@/hooks/gameState`), written by usePlayerGameEvents on startGame. The in-game
 * view MUST read that, not the dead lobby local.
 *
 * A render-level test would require mocking ~30 hooks/contexts; a source-contract
 * test locks the wiring and survives refactors (same approach as
 * PlayerView.lifecycle.test.ts).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('PlayerView — in-game language sourced from store', () => {
  const source = readFileSync(resolve(__dirname, '../PlayerView.tsx'), 'utf8');

  it('imports useGameLanguage from the gameState store', () => {
    expect(source).toMatch(
      /import\s+\{[^}]*useGameLanguage[^}]*\}\s+from\s+['"]@\/hooks\/gameState['"]/,
    );
  });

  it('reads the authoritative language from the store', () => {
    expect(source).toMatch(/const\s+storeGameLanguage\s*=\s*useGameLanguage\(\)/);
  });

  it('resolves the in-game language from the store first, then roomLanguage', () => {
    expect(source).toMatch(
      /const\s+resolvedGameLanguage\s*=\s*storeGameLanguage\s*\|\|\s*roomLanguage/,
    );
  });

  it('passes the store-resolved language to the in-game view', () => {
    expect(source).toMatch(/<PlayerInGameView[\s\S]*?gameLanguage=\{resolvedGameLanguage\}/);
  });

  it('does NOT pass the dead lobby local language to the in-game view', () => {
    // The orphan-null `gameLanguage={gameLanguage}` pass-through is the bug.
    expect(source).not.toMatch(/<PlayerInGameView[\s\S]*?gameLanguage=\{gameLanguage\}/);
  });
});
