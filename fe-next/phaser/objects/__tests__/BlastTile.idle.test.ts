/**
 * BlastTile idle breathing + type-specific ambient animation tests.
 *
 * Covers:
 *  - Idle breathing tween config (scale 1.0→1.03, staggered duration)
 *  - Type-specific animations (ice=shimmer, bomb=wobble, etc.)
 *  - Pause on select / resume on deselect
 *  - reduceMotion: no tweens at all
 *  - isLowEnd: breathing only, no type-specific
 *  - Standard tiles: breathing only, no type animation
 */

import Phaser from 'phaser';
import { BlastTile } from '../BlastTile';
import { getComboHexColors } from '@/lib/phaser/logic/ComboTracker';
import type { BlastTileType } from '@/components/blast/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeScene(): Phaser.Scene {
  return new Phaser.Scene();
}

const COMBO = getComboHexColors(0);

// ─── Breathing animation ─────────────────────────────────────────────────────

describe('BlastTile idle breathing', () => {
  it('starts a breathing tween on construction', () => {
    const scene = makeScene();
    const tile = new BlastTile(scene, 0, 0, 'A', 80, 'standard', 0);
    tile.startIdleAnimations({ reduceMotion: false, isLowEnd: false });

    const tweenAdd = scene.tweens.add as jest.Mock;
    const breathingCall = tweenAdd.mock.calls.find(
      (call) => call[0]?.scaleX !== undefined && call[0]?.repeat === -1
    );
    expect(breathingCall).toBeDefined();
  });

  it('uses scale range 1.0 to 1.03', () => {
    const scene = makeScene();
    const tile = new BlastTile(scene, 0, 0, 'A', 80, 'standard', 0);
    tile.startIdleAnimations({ reduceMotion: false, isLowEnd: false });

    const tweenAdd = scene.tweens.add as jest.Mock;
    const breathingCall = tweenAdd.mock.calls.find(
      (call) => call[0]?.scaleX !== undefined && call[0]?.repeat === -1
    );
    expect(breathingCall).toBeDefined();
    const config = breathingCall![0];
    expect(config.scaleX.from).toBe(1);
    expect(config.scaleX.to).toBe(1.03);
    expect(config.scaleY.from).toBe(1);
    expect(config.scaleY.to).toBe(1.03);
  });

  it('uses Sine.easeInOut easing with yoyo', () => {
    const scene = makeScene();
    const tile = new BlastTile(scene, 0, 0, 'A', 80, 'standard', 0);
    tile.startIdleAnimations({ reduceMotion: false, isLowEnd: false });

    const tweenAdd = scene.tweens.add as jest.Mock;
    const breathingCall = tweenAdd.mock.calls.find(
      (call) => call[0]?.scaleX !== undefined && call[0]?.repeat === -1
    );
    const config = breathingCall![0];
    expect(config.ease).toBe('Sine.easeInOut');
    expect(config.yoyo).toBe(true);
    expect(config.repeat).toBe(-1);
  });

  it('randomises duration between 1200 and 1800ms for organic stagger', () => {
    const scene = makeScene();
    const tile = new BlastTile(scene, 0, 0, 'A', 80, 'standard', 0);
    tile.startIdleAnimations({ reduceMotion: false, isLowEnd: false });

    const tweenAdd = scene.tweens.add as jest.Mock;
    const breathingCall = tweenAdd.mock.calls.find(
      (call) => call[0]?.scaleX !== undefined && call[0]?.repeat === -1
    );
    const duration = breathingCall![0].duration;
    expect(duration).toBeGreaterThanOrEqual(1200);
    expect(duration).toBeLessThanOrEqual(1800);
  });
});

// ─── reduceMotion ────────────────────────────────────────────────────────────

describe('BlastTile reduceMotion', () => {
  it('does NOT create any tweens when reduceMotion is true', () => {
    const scene = makeScene();
    const tile = new BlastTile(scene, 0, 0, 'A', 80, 'bomb', 0);
    tile.startIdleAnimations({ reduceMotion: true, isLowEnd: false });

    const tweenAdd = scene.tweens.add as jest.Mock;
    // No idle tweens should have been added by startIdleAnimations
    // (the constructor may add other tweens, so we check AFTER startIdleAnimations)
    const callsAfterConstruction = tweenAdd.mock.calls.filter(
      (call) => call[0]?.repeat === -1
    );
    expect(callsAfterConstruction.length).toBe(0);
  });
});

// ─── isLowEnd ────────────────────────────────────────────────────────────────

describe('BlastTile isLowEnd', () => {
  it('creates breathing tween but NO type-specific tween', () => {
    const scene = makeScene();
    const tile = new BlastTile(scene, 0, 0, 'A', 80, 'bomb', 0);
    tile.startIdleAnimations({ reduceMotion: false, isLowEnd: true });

    const tweenAdd = scene.tweens.add as jest.Mock;
    // Should have breathing tween (scale)
    const breathingCall = tweenAdd.mock.calls.find(
      (call) => call[0]?.scaleX !== undefined && call[0]?.repeat === -1
    );
    expect(breathingCall).toBeDefined();

    // Should NOT have rotation tween (bomb wobble)
    const wobbleCall = tweenAdd.mock.calls.find(
      (call) => call[0]?.angle !== undefined && call[0]?.repeat === -1
    );
    expect(wobbleCall).toBeUndefined();
  });
});

// ─── Type-specific animations ────────────────────────────────────────────────

describe('BlastTile type-specific animations', () => {
  it('bomb: adds rotation wobble tween', () => {
    const scene = makeScene();
    const tile = new BlastTile(scene, 0, 0, 'A', 80, 'bomb', 0);
    tile.startIdleAnimations({ reduceMotion: false, isLowEnd: false });

    const tweenAdd = scene.tweens.add as jest.Mock;
    const wobbleCall = tweenAdd.mock.calls.find(
      (call) => call[0]?.angle !== undefined && call[0]?.repeat === -1
    );
    expect(wobbleCall).toBeDefined();
  });

  it('ice: adds alpha shimmer tween on overlay', () => {
    const scene = makeScene();
    const tile = new BlastTile(scene, 0, 0, 'A', 80, 'ice', 2);
    tile.startIdleAnimations({ reduceMotion: false, isLowEnd: false });

    const tweenAdd = scene.tweens.add as jest.Mock;
    const shimmerCall = tweenAdd.mock.calls.find(
      (call) => call[0]?.alpha !== undefined && call[0]?.repeat === -1 && call[0]?._idleType === 'shimmer'
    );
    expect(shimmerCall).toBeDefined();
  });

  it('prism: adds rainbow color-cycle tween', () => {
    const scene = makeScene();
    const tile = new BlastTile(scene, 0, 0, 'A', 80, 'prism', 2);
    tile.startIdleAnimations({ reduceMotion: false, isLowEnd: false });

    const tweenAdd = scene.tweens.add as jest.Mock;
    // Prism uses a tween counter for color cycling
    const addCounter = scene.tweens.addCounter as jest.Mock;
    const rainbowCall = addCounter.mock.calls.find(
      (call) => call[0]?.repeat === -1
    );
    expect(rainbowCall).toBeDefined();
  });

  it('gem: adds bounce tween', () => {
    const scene = makeScene();
    const tile = new BlastTile(scene, 0, 0, 'A', 80, 'gem', 3);
    tile.startIdleAnimations({ reduceMotion: false, isLowEnd: false });

    const tweenAdd = scene.tweens.add as jest.Mock;
    const bounceCall = tweenAdd.mock.calls.find(
      (call) => call[0]?.y !== undefined && call[0]?.repeat === -1
    );
    expect(bounceCall).toBeDefined();
  });

  it('lightning: adds flicker (alpha) tween', () => {
    const scene = makeScene();
    const tile = new BlastTile(scene, 0, 0, 'A', 80, 'lightning', 0);
    tile.startIdleAnimations({ reduceMotion: false, isLowEnd: false });

    const tweenAdd = scene.tweens.add as jest.Mock;
    const flickerCall = tweenAdd.mock.calls.find(
      (call) => call[0]?.alpha !== undefined && call[0]?.repeat === -1 && call[0]?._idleType === 'flicker'
    );
    expect(flickerCall).toBeDefined();
  });

  it('magnet: adds rotation tween', () => {
    const scene = makeScene();
    const tile = new BlastTile(scene, 0, 0, 'A', 80, 'magnet', 0);
    tile.startIdleAnimations({ reduceMotion: false, isLowEnd: false });

    const tweenAdd = scene.tweens.add as jest.Mock;
    const rotateCall = tweenAdd.mock.calls.find(
      (call) => call[0]?.angle !== undefined && call[0]?.repeat === -1 && call[0]?._idleType === 'rotate'
    );
    expect(rotateCall).toBeDefined();
  });

  it('standard: NO type-specific tween (breathing only)', () => {
    const scene = makeScene();
    const tile = new BlastTile(scene, 0, 0, 'A', 80, 'standard', 0);
    tile.startIdleAnimations({ reduceMotion: false, isLowEnd: false });

    const tweenAdd = scene.tweens.add as jest.Mock;
    // Only breathing tween — no type-specific ones
    const idleTweens = tweenAdd.mock.calls.filter(
      (call) => call[0]?.repeat === -1
    );
    expect(idleTweens.length).toBe(1); // Only the breathing tween
  });

  it('mirror: adds mirror-shimmer idle tween (_idleType="mirror-shimmer")', () => {
    const scene = makeScene();
    const tile = new BlastTile(scene, 0, 0, 'A', 80, 'mirror', 0);
    tile.startIdleAnimations({ reduceMotion: false, isLowEnd: false });

    const tweenAdd = scene.tweens.add as jest.Mock;
    const shimmerCall = tweenAdd.mock.calls.find(
      (call) => call[0]?._idleType === 'mirror-shimmer'
    );
    expect(shimmerCall).toBeDefined();
  });

  it('silver: adds gleam idle tween (_idleType="gleam")', () => {
    const scene = makeScene();
    const tile = new BlastTile(scene, 0, 0, 'A', 80, 'silver', 0);
    tile.startIdleAnimations({ reduceMotion: false, isLowEnd: false });

    const tweenAdd = scene.tweens.add as jest.Mock;
    const gleamCall = tweenAdd.mock.calls.find(
      (call) => call[0]?._idleType === 'gleam'
    );
    expect(gleamCall).toBeDefined();
  });

  it('diamond: adds diamond-sparkle idle tween (_idleType="diamond-sparkle")', () => {
    const scene = makeScene();
    const tile = new BlastTile(scene, 0, 0, 'A', 80, 'diamond', 0);
    tile.startIdleAnimations({ reduceMotion: false, isLowEnd: false });

    const tweenAdd = scene.tweens.add as jest.Mock;
    const sparkleCall = tweenAdd.mock.calls.find(
      (call) => call[0]?._idleType === 'diamond-sparkle'
    );
    expect(sparkleCall).toBeDefined();
  });

  it('mirror shimmer targets overlay alpha oscillation (not scaleX flip)', () => {
    const scene = makeScene();
    const tile = new BlastTile(scene, 0, 0, 'A', 80, 'mirror', 0);
    tile.startIdleAnimations({ reduceMotion: false, isLowEnd: false });

    const tweenAdd = scene.tweens.add as jest.Mock;
    const shimmerCall = tweenAdd.mock.calls.find(
      (call) => call[0]?._idleType === 'mirror-shimmer'
    );
    expect(shimmerCall).toBeDefined();
    const config = shimmerCall![0];
    // Should animate alpha, NOT scaleX (to avoid RTL flip issues)
    expect(config.alpha).toBeDefined();
    expect(config.scaleX).toBeUndefined();
  });

  it('diamond sparkle animates scale', () => {
    const scene = makeScene();
    const tile = new BlastTile(scene, 0, 0, 'A', 80, 'diamond', 0);
    tile.startIdleAnimations({ reduceMotion: false, isLowEnd: false });

    const tweenAdd = scene.tweens.add as jest.Mock;
    const sparkleCall = tweenAdd.mock.calls.find(
      (call) => call[0]?._idleType === 'diamond-sparkle'
    );
    const config = sparkleCall![0];
    expect(config.scaleX).toBeDefined();
    expect(config.scaleY).toBeDefined();
  });
});

// ─── reduceMotion / isLowEnd guards for new types ────────────────────────────

describe('BlastTile new type guards (mirror/silver/diamond)', () => {
  const NEW_TYPES: Array<'mirror' | 'silver' | 'diamond'> = ['mirror', 'silver', 'diamond'];
  const IDLE_TYPE_MAP = {
    mirror: 'mirror-shimmer',
    silver: 'gleam',
    diamond: 'diamond-sparkle',
  };

  it('reduceMotion: no type-specific tweens for mirror/silver/diamond', () => {
    for (const tileType of NEW_TYPES) {
      const scene = makeScene();
      const tile = new BlastTile(scene, 0, 0, 'A', 80, tileType, 0);
      tile.startIdleAnimations({ reduceMotion: true, isLowEnd: false });

      const tweenAdd = scene.tweens.add as jest.Mock;
      const idleTweens = tweenAdd.mock.calls.filter(
        (call) => call[0]?._idleType === IDLE_TYPE_MAP[tileType]
      );
      expect(idleTweens.length).toBe(0);
    }
  });

  it('isLowEnd: no type-specific tweens for mirror/silver/diamond', () => {
    for (const tileType of NEW_TYPES) {
      const scene = makeScene();
      const tile = new BlastTile(scene, 0, 0, 'A', 80, tileType, 0);
      tile.startIdleAnimations({ reduceMotion: false, isLowEnd: true });

      const tweenAdd = scene.tweens.add as jest.Mock;
      const idleTweens = tweenAdd.mock.calls.filter(
        (call) => call[0]?._idleType === IDLE_TYPE_MAP[tileType]
      );
      expect(idleTweens.length).toBe(0);
    }
  });
});

// ─── Pause / Resume on select ────────────────────────────────────────────────

describe('BlastTile idle pause/resume', () => {
  it('pauses idle tweens when selected', () => {
    const scene = makeScene();
    const tile = new BlastTile(scene, 0, 0, 'A', 80, 'bomb', 0);
    tile.startIdleAnimations({ reduceMotion: false, isLowEnd: false });

    tile.select(0, COMBO);

    // killTweensOf should have been called (pausing idle)
    const killTweensOf = scene.tweens.killTweensOf as jest.Mock;
    expect(killTweensOf).toHaveBeenCalledWith(tile);
  });

  it('resumes idle tweens when deselected', () => {
    const scene = makeScene();
    const tile = new BlastTile(scene, 0, 0, 'A', 80, 'bomb', 0);
    tile.startIdleAnimations({ reduceMotion: false, isLowEnd: false });

    const tweenAdd = scene.tweens.add as jest.Mock;
    const callsBefore = tweenAdd.mock.calls.length;

    tile.select(0, COMBO);
    tile.deselect();

    // After deselect, idle tweens should be restarted
    const callsAfter = tweenAdd.mock.calls.length;
    expect(callsAfter).toBeGreaterThan(callsBefore);
  });
});

// ─── Cleanup ─────────────────────────────────────────────────────────────────

describe('BlastTile idle cleanup', () => {
  it('stopIdleAnimations kills all idle tweens', () => {
    const scene = makeScene();
    const tile = new BlastTile(scene, 0, 0, 'A', 80, 'bomb', 0);
    tile.startIdleAnimations({ reduceMotion: false, isLowEnd: false });
    tile.stopIdleAnimations();

    const killTweensOf = scene.tweens.killTweensOf as jest.Mock;
    expect(killTweensOf).toHaveBeenCalledWith(tile);
  });
});
