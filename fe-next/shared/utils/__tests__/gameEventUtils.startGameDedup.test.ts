import { markStartGameHandled, wasStartGameHandled } from '../gameEventUtils';

/**
 * Bug: a normal MP game start is processed by TWO independent handlers —
 * `usePlayerGameEvents.handleStartGame` (socket listener) AND PlayerView's
 * `pendingGameStart` effect. Both write the Zustand store, reset the timer,
 * and emit `startGameAck`. The effect must stay as a fallback for the
 * results-screen case (where usePlayerGameEvents is unmounted), so we dedup
 * by messageId: the socket handler marks the id, the effect checks it.
 */

describe('gameEventUtils — startGame dedup', () => {
  // `handledStartGameIds` is process-local module state shared across test
  // files in a worker — reset it so marks don't leak between tests.
  beforeEach(() => {
    markStartGameHandled('PLAYER', null);
    markStartGameHandled('HOST', null);
  });

  it('reports an unmarked messageId as not handled', () => {
    expect(wasStartGameHandled('PLAYER', 'msg-never-seen')).toBe(false);
  });

  it('reports a messageId as handled after it is marked', () => {
    markStartGameHandled('PLAYER', 'msg-1');
    expect(wasStartGameHandled('PLAYER', 'msg-1')).toBe(true);
  });

  it('only treats the most recently marked id as handled (next game start is fresh)', () => {
    markStartGameHandled('PLAYER', 'msg-game-1');
    markStartGameHandled('PLAYER', 'msg-game-2');
    expect(wasStartGameHandled('PLAYER', 'msg-game-1')).toBe(false);
    expect(wasStartGameHandled('PLAYER', 'msg-game-2')).toBe(true);
  });

  it('never treats a null/undefined messageId as handled (cannot dedup unidentified events)', () => {
    markStartGameHandled('PLAYER', undefined);
    expect(wasStartGameHandled('PLAYER', undefined)).toBe(false);
    expect(wasStartGameHandled('PLAYER', null)).toBe(false);
  });

  it('keeps HOST and PLAYER roles independent', () => {
    markStartGameHandled('HOST', 'msg-host');
    expect(wasStartGameHandled('HOST', 'msg-host')).toBe(true);
    expect(wasStartGameHandled('PLAYER', 'msg-host')).toBe(false);
  });
});
