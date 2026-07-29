import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * PlayerView — startGame retry must not replay countdown
 *
 * The server retries `startGame` to clients that didn't ack in time, with
 * the SAME messageId. Each retry pushes the broadcast into PageClient state
 * via setPendingGameStart, which re-runs PlayerView's pendingGameStart
 * effect.
 *
 * Without a per-messageId guard, the dedup branch (entered when the socket
 * listener already marked the id as handled) re-fires setShowModeReveal(true).
 * The mode-reveal then auto-dismisses after 2s and flips
 * showStartAnimation=true again — the player sees the 3-2-1 countdown twice.
 *
 * Fix: track the last-revealed messageId in a ref and skip
 * setShowModeReveal(true) when it matches the current pending messageId.
 */
const source = readFileSync(resolve(__dirname, '../PlayerView.tsx'), 'utf8');

describe('PlayerView — startGame retry reveal dedup', () => {
  it('declares revealedMessageIdRef to track the last-revealed messageId', () => {
    expect(source).toMatch(/revealedMessageIdRef\s*=\s*useRef</);
  });

  it('guards setShowModeReveal in the dedup branch with a messageId compare', () => {
    const dedupBlock = source.slice(
      source.indexOf("wasStartGameHandled('PLAYER', pendingGameStart.messageId)"),
      source.indexOf('onGameStartConsumed();\n      return;\n    }'),
    );
    expect(dedupBlock).toMatch(/revealedMessageIdRef\.current\s*!==/);
    expect(dedupBlock).toMatch(/setShowModeReveal\(true\)/);
  });
});
