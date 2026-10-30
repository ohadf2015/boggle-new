import { vi, describe, it, expect, afterEach } from 'vitest';

vi.mock('../gameStateManager', () => ({ getGame: vi.fn(), updateGame: vi.fn() }));
vi.mock('../../handlers/earthquakeHandler.js', () => ({ executeEarthquakeSequence: vi.fn() }));

import '../roundEventsManager';
import timerManager from '../../utils/timerManager';
import { gameCleanupEmitter } from '../../events/gameCleanup';

describe('word-feedback prompt across a rematch', () => {
  afterEach(() => timerManager.clearTimer('feedback:G1'));

  it('a new round cancels the pending feedback prompt from the last one', () => {
    const fired = vi.fn();
    timerManager.setTimeout('feedback:G1', fired, 20_000);
    gameCleanupEmitter.emitGameReset('G1');
    expect(timerManager.hasTimer('feedback:G1')).toBe(false);
  });
});
