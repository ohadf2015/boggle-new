import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * usePlayerGameEvents — startGame dedup contract
 *
 * A normal MP game start is processed by BOTH this hook's `handleStartGame`
 * socket listener AND PlayerView's `pendingGameStart` effect. To let the
 * effect skip its redundant store/timer/ack work, `handleStartGame` must
 * record the messageId via `markStartGameHandled('PLAYER', ...)`.
 */
const source = readFileSync(
  resolve(__dirname, '../usePlayerGameEvents.ts'),
  'utf8',
);

describe('usePlayerGameEvents — startGame dedup', () => {
  it('imports markStartGameHandled from gameEventUtils', () => {
    expect(source).toMatch(/markStartGameHandled/);
    const importBlock = source.slice(0, source.indexOf("} from '@/shared/utils/gameEventUtils'"));
    expect(importBlock).toMatch(/markStartGameHandled/);
  });

  it('marks the startGame messageId handled inside handleStartGame', () => {
    expect(source).toMatch(/markStartGameHandled\('PLAYER',\s*data\.messageId\)/);
  });
});
