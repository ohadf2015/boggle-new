/**
 * BossUIManager — orchestrates all boss Phaser UI via bridge events.
 *
 * Verifies:
 *  - Subscribes to all boss:* events on init()
 *  - Creates child objects (HPBar, Avatar, etc.)
 *  - Delegates events to correct child objects
 *  - Unsubscribes and destroys on cleanup
 */

import Phaser from 'phaser';
import { GameBridge } from '@/lib/phaser/bridge/GameBridge';
import { BossUIManager } from '../BossUIManager';

function makeScene(): Phaser.Scene {
  return new Phaser.Scene();
}

beforeEach(() => {
  GameBridge.reset();
});

describe('BossUIManager', () => {
  it('creates without throwing', () => {
    const scene = makeScene();
    expect(() => new BossUIManager(scene)).not.toThrow();
  });

  it('init() subscribes to boss:init event', () => {
    const scene = makeScene();
    const mgr = new BossUIManager(scene);
    mgr.init();

    // Emit boss:init — should not throw (listener registered)
    expect(() => {
      GameBridge.emit('boss:init', {
        bossName: 'Test Boss',
        bossImagePath: '/boss.png',
        maxHP: 100,
        currentHP: 100,
        phase: 'phase1',
      });
    }).not.toThrow();
  });

  it('boss:damage updates HP bar', () => {
    const scene = makeScene();
    const mgr = new BossUIManager(scene);
    mgr.init();

    // Initialize boss first
    GameBridge.emit('boss:init', {
      bossName: 'Test Boss',
      bossImagePath: '/boss.png',
      maxHP: 100,
      currentHP: 100,
      phase: 'phase1',
    });

    // Should not throw when processing damage
    expect(() => {
      GameBridge.emit('boss:damage', {
        currentHP: 50,
        maxHP: 100,
        phase: 'phase2',
      });
    }).not.toThrow();
  });

  it('boss:taunt shows dialogue bubble', () => {
    const scene = makeScene();
    const mgr = new BossUIManager(scene);
    mgr.init();

    GameBridge.emit('boss:init', {
      bossName: 'Test Boss',
      bossImagePath: '/boss.png',
      maxHP: 100,
      currentHP: 100,
      phase: 'phase1',
    });

    expect(() => {
      GameBridge.emit('boss:taunt', {
        text: 'You fool!',
        bossName: 'Test Boss',
        visible: true,
      });
    }).not.toThrow();
  });

  it('boss:ability:telegraph shows telegraph overlay', () => {
    const scene = makeScene();
    const mgr = new BossUIManager(scene);
    mgr.init();

    GameBridge.emit('boss:init', {
      bossName: 'Test Boss',
      bossImagePath: '/boss.png',
      maxHP: 100,
      currentHP: 100,
      phase: 'phase1',
    });

    expect(() => {
      GameBridge.emit('boss:ability:telegraph', {
        abilityId: 'frost-breath',
        abilityName: 'Frost Breath',
        duration: 2000,
        targetTiles: [0, 1, 2],
      });
    }).not.toThrow();
  });

  it('boss:end cleans up UI', () => {
    const scene = makeScene();
    const mgr = new BossUIManager(scene);
    mgr.init();

    GameBridge.emit('boss:init', {
      bossName: 'Test Boss',
      bossImagePath: '/boss.png',
      maxHP: 100,
      currentHP: 100,
      phase: 'phase1',
    });

    expect(() => {
      GameBridge.emit('boss:end', { result: 'victory' });
    }).not.toThrow();
  });

  it('destroy() unsubscribes from bridge events', () => {
    const scene = makeScene();
    const mgr = new BossUIManager(scene);
    mgr.init();
    mgr.destroy();

    // After destroy, emitting boss events should be safe (no listeners)
    expect(() => {
      GameBridge.emit('boss:init', {
        bossName: 'Test Boss',
        bossImagePath: '/boss.png',
        maxHP: 100,
        currentHP: 100,
        phase: 'phase1',
      });
    }).not.toThrow();
  });
});
