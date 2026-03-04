/**
 * Test: PlayerInGameView emits correct socket event for Word Hunt guesses
 *
 * TDD RED phase — verifies client uses 'submitTargetWord' (matching server)
 * Uses source code analysis to verify the event name without full component render
 */

import fs from 'fs';
import path from 'path';

describe('PlayerInGameView Word Hunt socket event name', () => {
  const sourceCode = fs.readFileSync(
    path.resolve(__dirname, '../PlayerInGameView.tsx'),
    'utf-8'
  );

  it('should emit submitTargetWord (not wordHuntGuess)', () => {
    // The source should use the server-expected event name
    expect(sourceCode).toContain("'submitTargetWord'");
    expect(sourceCode).not.toContain("'wordHuntGuess'");
  });
});
