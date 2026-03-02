/**
 * GameBridge — typed EventEmitter singleton.
 *
 * Verifies that the bridge correctly routes typed events between React
 * and Phaser, handles multiple listeners, and cleans up on off().
 *
 * RED phase: tests must fail until GameBridge.ts is implemented.
 */

import { GameBridge, type BridgeEvents } from '../GameBridge';

// Reset the singleton between tests
beforeEach(() => {
  GameBridge.reset();
});

// ─── on / emit ────────────────────────────────────────────────────────────────

describe('GameBridge.on + emit', () => {
  it('delivers an emitted event to a registered listener', () => {
    const listener = jest.fn();
    GameBridge.on('scene:ready', listener);
    GameBridge.emit('scene:ready', undefined);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('passes typed payload to the listener', () => {
    const listener = jest.fn();
    GameBridge.on('word:submit', listener);

    const payload: BridgeEvents['word:submit'] = {
      word: 'CAT',
      path: [
        { row: 0, col: 0, letter: 'C' },
        { row: 0, col: 1, letter: 'A' },
        { row: 0, col: 2, letter: 'T' },
      ],
    };

    GameBridge.emit('word:submit', payload);
    expect(listener).toHaveBeenCalledWith(payload);
  });

  it('supports multiple listeners on the same event', () => {
    const a = jest.fn();
    const b = jest.fn();
    GameBridge.on('scene:ready', a);
    GameBridge.on('scene:ready', b);
    GameBridge.emit('scene:ready', undefined);
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });

  it('does not deliver events to listeners on other channels', () => {
    const readyListener = jest.fn();
    GameBridge.on('scene:ready', readyListener);
    GameBridge.emit('scene:destroy', undefined);
    expect(readyListener).not.toHaveBeenCalled();
  });
});

// ─── off ─────────────────────────────────────────────────────────────────────

describe('GameBridge.off', () => {
  it('stops delivering events after off() is called', () => {
    const listener = jest.fn();
    GameBridge.on('scene:ready', listener);
    GameBridge.off('scene:ready', listener);
    GameBridge.emit('scene:ready', undefined);
    expect(listener).not.toHaveBeenCalled();
  });

  it('only removes the specified listener', () => {
    const a = jest.fn();
    const b = jest.fn();
    GameBridge.on('scene:ready', a);
    GameBridge.on('scene:ready', b);
    GameBridge.off('scene:ready', a);
    GameBridge.emit('scene:ready', undefined);
    expect(a).not.toHaveBeenCalled();
    expect(b).toHaveBeenCalledTimes(1);
  });
});

// ─── once ────────────────────────────────────────────────────────────────────

describe('GameBridge.once', () => {
  it('fires the listener only on the first emit', () => {
    const listener = jest.fn();
    GameBridge.once('scene:ready', listener);
    GameBridge.emit('scene:ready', undefined);
    GameBridge.emit('scene:ready', undefined);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

// ─── reset ───────────────────────────────────────────────────────────────────

describe('GameBridge.reset', () => {
  it('removes all listeners after reset()', () => {
    const listener = jest.fn();
    GameBridge.on('scene:ready', listener);
    GameBridge.reset();
    GameBridge.emit('scene:ready', undefined);
    expect(listener).not.toHaveBeenCalled();
  });
});

// ─── Error safety ────────────────────────────────────────────────────────────

describe('GameBridge error safety', () => {
  it('continues delivering to remaining listeners when one throws', () => {
    const badListener = jest.fn(() => { throw new Error('boom'); });
    const goodListener = jest.fn();
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    GameBridge.on('scene:ready', badListener);
    GameBridge.on('scene:ready', goodListener);
    GameBridge.emit('scene:ready', undefined);

    expect(badListener).toHaveBeenCalledTimes(1);
    expect(goodListener).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('[GameBridge]'),
      expect.any(Error),
    );

    consoleErrorSpy.mockRestore();
  });
});

// ─── Typed event coverage ─────────────────────────────────────────────────────

describe('React → Phaser events', () => {
  it('delivers grid:update payload', () => {
    const listener = jest.fn();
    GameBridge.on('grid:update', listener);

    const payload: BridgeEvents['grid:update'] = {
      grid: [['A', 'B'], ['C', 'D']],
      comboLevel: 3,
      fireRoundActive: false,
    };
    GameBridge.emit('grid:update', payload);
    expect(listener).toHaveBeenCalledWith(payload);
  });

  it('delivers word:feedback payload', () => {
    const listener = jest.fn();
    GameBridge.on('word:feedback', listener);

    const payload: BridgeEvents['word:feedback'] = {
      type: 'accepted',
      word: 'CAT',
      score: 10,
    };
    GameBridge.emit('word:feedback', payload);
    expect(listener).toHaveBeenCalledWith(payload);
  });

  it('delivers accessibility:update payload', () => {
    const listener = jest.fn();
    GameBridge.on('accessibility:update', listener);

    const payload: BridgeEvents['accessibility:update'] = {
      reduceMotion: true,
      disableFireRoundLights: false,
      disableEarthquakeEffects: false,
      isLowEnd: false,
      isRTL: false,
    };
    GameBridge.emit('accessibility:update', payload);
    expect(listener).toHaveBeenCalledWith(payload);
  });
});

describe('React → Phaser boss events', () => {
  it('delivers boss:init payload', () => {
    const listener = jest.fn();
    GameBridge.on('boss:init', listener);

    const payload: BridgeEvents['boss:init'] = {
      bossName: 'Frost Guardian',
      bossImagePath: '/images/boss1.png',
      maxHP: 100,
      currentHP: 100,
      phase: 'phase1',
    };
    GameBridge.emit('boss:init', payload);
    expect(listener).toHaveBeenCalledWith(payload);
  });

  it('delivers boss:damage payload', () => {
    const listener = jest.fn();
    GameBridge.on('boss:damage', listener);

    const payload: BridgeEvents['boss:damage'] = {
      currentHP: 75,
      maxHP: 100,
      phase: 'phase1',
    };
    GameBridge.emit('boss:damage', payload);
    expect(listener).toHaveBeenCalledWith(payload);
  });

  it('delivers boss:ability:telegraph payload', () => {
    const listener = jest.fn();
    GameBridge.on('boss:ability:telegraph', listener);

    const payload: BridgeEvents['boss:ability:telegraph'] = {
      abilityId: 'frost-breath',
      abilityName: 'Frost Breath',
      duration: 2000,
      targetTiles: [0, 1, 2],
    };
    GameBridge.emit('boss:ability:telegraph', payload);
    expect(listener).toHaveBeenCalledWith(payload);
  });

  it('delivers boss:ability:execute payload', () => {
    const listener = jest.fn();
    GameBridge.on('boss:ability:execute', listener);

    const payload: BridgeEvents['boss:ability:execute'] = {
      abilityName: 'Frost Breath',
      damage: 15,
    };
    GameBridge.emit('boss:ability:execute', payload);
    expect(listener).toHaveBeenCalledWith(payload);
  });

  it('delivers boss:taunt payload', () => {
    const listener = jest.fn();
    GameBridge.on('boss:taunt', listener);

    const payload: BridgeEvents['boss:taunt'] = {
      text: 'You cannot defeat me!',
      bossName: 'Frost Guardian',
      visible: true,
    };
    GameBridge.emit('boss:taunt', payload);
    expect(listener).toHaveBeenCalledWith(payload);
  });

  it('delivers boss:phase:change payload', () => {
    const listener = jest.fn();
    GameBridge.on('boss:phase:change', listener);

    const payload: BridgeEvents['boss:phase:change'] = { phase: 'enraged' };
    GameBridge.emit('boss:phase:change', payload);
    expect(listener).toHaveBeenCalledWith(payload);
  });

  it('delivers boss:end payload', () => {
    const listener = jest.fn();
    GameBridge.on('boss:end', listener);

    const payload: BridgeEvents['boss:end'] = { result: 'victory' };
    GameBridge.emit('boss:end', payload);
    expect(listener).toHaveBeenCalledWith(payload);
  });
});

describe('Phaser → React events', () => {
  it('delivers word:change payload', () => {
    const listener = jest.fn();
    GameBridge.on('word:change', listener);

    const payload: BridgeEvents['word:change'] = {
      word: 'DOG',
      letterCount: 3,
      path: [
        { row: 0, col: 0, letter: 'D' },
        { row: 0, col: 1, letter: 'O' },
        { row: 0, col: 2, letter: 'G' },
      ],
    };
    GameBridge.emit('word:change', payload);
    expect(listener).toHaveBeenCalledWith(payload);
  });

  it('delivers tile:activated payload', () => {
    const listener = jest.fn();
    GameBridge.on('tile:activated', listener);

    const payload: BridgeEvents['tile:activated'] = {
      row: 1,
      col: 2,
      tileType: 'ice',
      effect: 'melt',
    };
    GameBridge.emit('tile:activated', payload);
    expect(listener).toHaveBeenCalledWith(payload);
  });
});
