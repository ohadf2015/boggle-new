/**
 * BlastTile.playClearAnimation — juicy tile clear effects.
 *
 * Tests the enhanced clear animation:
 * 1. Squash-stretch before fade (scaleX 1.3 → 0.7, scaleY 0.7 → 1.3)
 * 2. Rotation tween (tumble)
 * 3. Particle emission via BlastParticleManager (tile-type-colored)
 * 4. Particle count scales with tile type (standard=6, special=12)
 * 5. reduceMotion: skips rotation, squash, and particles
 * 6. isLowEnd: halves particle count
 *
 * RED phase: tests fail until implementation is updated.
 */

import Phaser from 'phaser';
import { BlastTile } from '../BlastTile';
import type { BlastTileType } from '@/components/blast/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Create a scene whose tweens.add fires onComplete synchronously (for tween chain testing). */
function makeScene(): Phaser.Scene {
  const scene = new Phaser.Scene();
  // Override tweens.add to fire onComplete synchronously so chained tweens execute
  (scene.tweens.add as jest.Mock).mockImplementation((config: Record<string, unknown>) => {
    if (typeof config.onComplete === 'function') {
      (config.onComplete as () => void)();
    }
    return { destroy: jest.fn() };
  });
  return scene;
}

function makeTile(
  letter = 'A',
  type: BlastTileType = 'standard',
  hitsRemaining = 0,
): BlastTile {
  const scene = makeScene();
  // Construct the tile first (base LetterTile + BlastTile tweens may fire during constructor)
  const origImpl = (scene.tweens.add as jest.Mock).getMockImplementation();
  // Temporarily use no-op during construction to avoid firing constructor tweens
  (scene.tweens.add as jest.Mock).mockReturnValue({ destroy: jest.fn() });
  const tile = new BlastTile(scene, 100, 100, letter, 60, type, hitsRemaining);
  // Restore the synchronous-onComplete implementation for test calls
  if (origImpl) (scene.tweens.add as jest.Mock).mockImplementation(origImpl);
  return tile;
}

function getTweenCalls(tile: BlastTile): Array<Record<string, unknown>> {
  const scene = (tile as unknown as { scene: Phaser.Scene }).scene;
  return (scene.tweens.add as jest.Mock).mock.calls.map(
    (call: unknown[]) => call[0] as Record<string, unknown>,
  );
}

// ─── Squash-stretch ──────────────────────────────────────────────────────────

describe('BlastTile.playClearAnimation squash-stretch', () => {
  it('creates multiple tweens (squash + main clear)', () => {
    const tile = makeTile('A', 'gold', 0);
    const scene = (tile as unknown as { scene: Phaser.Scene }).scene;
    const tweensBefore = (scene.tweens.add as jest.Mock).mock.calls.length;

    tile.playClearAnimation();

    const tweensAfter = (scene.tweens.add as jest.Mock).mock.calls.length;
    // Expect at least 2 tweens: squash-stretch + main clear (rotation may be combined)
    expect(tweensAfter - tweensBefore).toBeGreaterThanOrEqual(2);
  });

  it('first tween has squash-stretch scale values', () => {
    const tile = makeTile('A', 'bomb', 0);
    const scene = (tile as unknown as { scene: Phaser.Scene }).scene;
    (scene.tweens.add as jest.Mock).mockClear();

    tile.playClearAnimation();

    const calls = getTweenCalls(tile);
    // Filter to calls made after mockClear
    const squashTween = calls[0];
    expect(squashTween).toBeDefined();
    // The squash tween should target scaleX going to 1.3 and scaleY to 0.7
    expect(squashTween.scaleX).toEqual(expect.objectContaining({ to: 1.3 }));
    expect(squashTween.scaleY).toEqual(expect.objectContaining({ to: 0.7 }));
  });
});

// ─── Rotation tween ──────────────────────────────────────────────────────────

describe('BlastTile.playClearAnimation rotation', () => {
  it('includes a rotation property in the clear tween', () => {
    const tile = makeTile('A', 'gold', 0);
    const scene = (tile as unknown as { scene: Phaser.Scene }).scene;
    (scene.tweens.add as jest.Mock).mockClear();

    tile.playClearAnimation();

    const calls = getTweenCalls(tile);
    // At least one tween should have an `angle` or `rotation` property
    const hasRotation = calls.some(
      (c) => c.angle !== undefined || c.rotation !== undefined,
    );
    expect(hasRotation).toBe(true);
  });
});

// ─── Particle emission ──────────────────────────────────────────────────────

describe('BlastTile.playClearAnimation particles', () => {
  it('calls scene.add.particles for standard tiles with base count', () => {
    const tile = makeTile('A', 'standard', 0);
    const scene = (tile as unknown as { scene: Phaser.Scene }).scene;
    const particlesBefore = (scene.add.particles as jest.Mock).mock.calls.length;

    tile.playClearAnimation();

    const particlesAfter = (scene.add.particles as jest.Mock).mock.calls.length;
    expect(particlesAfter).toBeGreaterThan(particlesBefore);
  });

  it('emits more particles for special tiles than standard', () => {
    // Standard tile
    const stdTile = makeTile('A', 'standard', 0);
    const stdScene = (stdTile as unknown as { scene: Phaser.Scene }).scene;
    stdTile.playClearAnimation();
    const stdParticleCall = (stdScene.add.particles as jest.Mock).mock.calls[0];
    const stdQuantity = stdParticleCall?.[3]?.quantity ?? 0;

    // Special tile (bomb)
    const specialTile = makeTile('A', 'bomb', 0);
    const specialScene = (specialTile as unknown as { scene: Phaser.Scene }).scene;
    specialTile.playClearAnimation();
    const specialParticleCall = (specialScene.add.particles as jest.Mock).mock.calls[0];
    const specialQuantity = specialParticleCall?.[3]?.quantity ?? 0;

    expect(specialQuantity).toBeGreaterThan(stdQuantity);
  });

  it('uses tile-type color for particle texture (gold → 0xffd700)', () => {
    const tile = makeTile('A', 'gold', 0);
    const scene = (tile as unknown as { scene: Phaser.Scene }).scene;

    tile.playClearAnimation();

    // ensureParticleTexture calls scene.make.graphics + fillStyle with the color
    const graphicsCalls = (scene.make.graphics as jest.Mock).mock.calls;
    const lastGraphics = (scene.make.graphics as jest.Mock).mock.results;
    // The particle texture creation should use gold's tint color (0xffd700)
    const fillCalls = lastGraphics.flatMap((r: { value: { fillStyle: jest.Mock } }) =>
      r.value.fillStyle.mock.calls,
    );
    const usedGold = fillCalls.some(
      (call: unknown[]) => call[0] === 0xffd700,
    );
    expect(usedGold).toBe(true);
  });
});

// ─── Accessibility: reduceMotion ─────────────────────────────────────────────

describe('BlastTile.playClearAnimation reduceMotion', () => {
  it('creates only 1 tween (simple fade) when reduceMotion is true', () => {
    const tile = makeTile('A', 'gold', 0);
    const scene = (tile as unknown as { scene: Phaser.Scene }).scene;
    (scene.tweens.add as jest.Mock).mockClear();

    tile.playClearAnimation({ reduceMotion: true });

    const tweenCount = (scene.tweens.add as jest.Mock).mock.calls.length;
    expect(tweenCount).toBe(1);
  });

  it('does not emit particles when reduceMotion is true', () => {
    const tile = makeTile('A', 'bomb', 0);
    const scene = (tile as unknown as { scene: Phaser.Scene }).scene;
    const particlesBefore = (scene.add.particles as jest.Mock).mock.calls.length;

    tile.playClearAnimation({ reduceMotion: true });

    const particlesAfter = (scene.add.particles as jest.Mock).mock.calls.length;
    expect(particlesAfter).toBe(particlesBefore);
  });
});

// ─── Accessibility: isLowEnd ─────────────────────────────────────────────────

describe('BlastTile.playClearAnimation isLowEnd', () => {
  it('halves particle quantity when isLowEnd is true', () => {
    // Normal
    const normalTile = makeTile('A', 'bomb', 0);
    const normalScene = (normalTile as unknown as { scene: Phaser.Scene }).scene;
    normalTile.playClearAnimation();
    const normalCall = (normalScene.add.particles as jest.Mock).mock.calls[0];
    const normalQty = normalCall?.[3]?.quantity ?? 0;

    // Low end
    const lowTile = makeTile('A', 'bomb', 0);
    const lowScene = (lowTile as unknown as { scene: Phaser.Scene }).scene;
    lowTile.playClearAnimation({ isLowEnd: true });
    const lowCall = (lowScene.add.particles as jest.Mock).mock.calls[0];
    const lowQty = lowCall?.[3]?.quantity ?? 0;

    expect(lowQty).toBe(Math.ceil(normalQty / 2));
  });
});

// ─── Promise resolution ──────────────────────────────────────────────────────

describe('BlastTile.playClearAnimation Promise', () => {
  it('still returns a Promise', () => {
    const tile = makeTile('A', 'standard', 0);
    const result = tile.playClearAnimation();
    expect(result).toBeInstanceOf(Promise);
  });
});
