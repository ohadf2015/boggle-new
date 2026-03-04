/**
 * Test: HostInGameView emits correct socket event for Word Hunt guesses
 *
 * TDD RED phase — verifies host client uses 'submitTargetWord' (matching server)
 */

import fs from 'fs';
import path from 'path';

describe('HostInGameView Word Hunt socket event name', () => {
  const sourceCode = fs.readFileSync(
    path.resolve(__dirname, '../HostInGameView.tsx'),
    'utf-8'
  );

  it('should emit submitTargetWord (not wordHuntGuess)', () => {
    expect(sourceCode).toContain("'submitTargetWord'");
    expect(sourceCode).not.toContain("'wordHuntGuess'");
  });
});
