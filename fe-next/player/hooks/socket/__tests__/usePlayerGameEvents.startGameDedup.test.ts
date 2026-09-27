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

  // Guards "MP game starts twice" regression: if handleStartGame fires for a
  // messageId that was already fully handled (server re-emit, listener
  // re-register, StrictMode double-mount), it must early-return before doing
  // store/timer/music/ack work again.
  it('imports wasStartGameHandled from gameEventUtils', () => {
    const importBlock = source.slice(0, source.indexOf("} from '@/shared/utils/gameEventUtils'"));
    expect(importBlock).toMatch(/wasStartGameHandled/);
  });

  it('early-returns from handleStartGame on duplicate messageId', () => {
    // Find the handleStartGame body and assert the guard precedes the work.
    const handleStart = source.slice(source.indexOf('const handleStartGame'));
    const guardIdx = handleStart.search(/wasStartGameHandled\('PLAYER',\s*data\.messageId\)/);
    const markIdx = handleStart.search(/markStartGameHandled\('PLAYER',\s*data\.messageId\)/);
    expect(guardIdx).toBeGreaterThan(-1);
    expect(markIdx).toBeGreaterThan(guardIdx);
  });

  // Guards parent-callback-flap re-registration: onGameStart must be accessed
  // through a ref so the socket-listener effect doesn't re-register when the
  // parent passes a new callback identity (which doubles the listener).
  it('routes onGameStart through onGameStartRef and excludes it from the deps array', () => {
    expect(source).toMatch(/const onGameStartRef = useRef\(onGameStart\)/);
    expect(source).toMatch(/onGameStartRef\.current\?\.\(\)/);
    // The deps array of the main socket-listener effect must NOT include onGameStart.
    // Slice from the effect cleanup return to the deps closing bracket.
    const depsBlock = source.slice(source.indexOf('// eslint-disable-next-line react-hooks/exhaustive-deps'));
    const depsArray = depsBlock.slice(depsBlock.indexOf('['), depsBlock.indexOf(']') + 1);
    // Strip line comments so the assertion ignores explanatory text and only
    // sees real dep entries.
    const codeOnly = depsArray.replace(/\/\/.*$/gm, '');
    expect(codeOnly).not.toMatch(/\bonGameStart\b(?!Ref)/);
  });
});
