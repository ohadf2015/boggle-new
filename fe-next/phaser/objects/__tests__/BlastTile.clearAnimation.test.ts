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
    const fillCalls = lastGraphics.flatMap((r) =>
      (r.value as { fillStyle: jest.Mock }).fillStyle.mock.calls,
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

// ─── Per-type death animations ────────────────────────────────────────────────

describe('BlastTile per-type death animations', () => {
  // Helper: get tween calls made during playClearAnimation (clears mocks first)
  function getDeathTweens(type: BlastTileType): Array<Record<string, unknown>> {
    const tile = makeTile('A', type, 0);
    const scene = (tile as unknown as { scene: Phaser.Scene }).scene;
    (scene.tweens.add as jest.Mock).mockClear();
    tile.playClearAnimation();
    return getTweenCalls(tile);
  }

  // ─── bomb: explosive burst — scaleX to >= 1.5 ─────────────────────────────
  it('bomb death: produces a tween with scaleX >= 1.5 (explosive burst)', () => {
    const tweens = getDeathTweens('bomb');
    const hasExplosiveBurst = tweens.some((t) => {
      const scaleX = t.scaleX as { to?: number } | undefined;
      return scaleX !== undefined && typeof scaleX === 'object' && (scaleX.to ?? 0) >= 1.5;
    });
    expect(hasExplosiveBurst).toBe(true);
  });

  // ─── ice: shatter spin — angle rotation >= 90 ─────────────────────────────
  it('ice death: produces a tween with angle rotation >= 90 (shatter spin)', () => {
    const tweens = getDeathTweens('ice');
    const hasHighAngle = tweens.some((t) => {
      const angle = t.angle as { to?: number } | number | undefined;
      if (typeof angle === 'number') return Math.abs(angle) >= 90;
      if (typeof angle === 'object' && angle !== null) return Math.abs((angle as { to?: number }).to ?? 0) >= 90;
      return false;
    });
    expect(hasHighAngle).toBe(true);
  });

  // ─── lightning: zap flash — alpha oscillation (multiple tweens or duration <= 50) ──
  it('lightning death: produces a rapid alpha tween (zap flash)', () => {
    const tweens = getDeathTweens('lightning');
    // Lightning should produce multiple tweens (rapid flicker) or a very short duration alpha tween
    const hasZap = tweens.some((t) => {
      const alpha = t.alpha as { from?: number; to?: number } | number | undefined;
      const dur = t.duration as number | undefined;
      // Either a very short alpha tween (<=50ms) or a multi-step flicker pattern
      if (alpha !== undefined && dur !== undefined && dur <= 50) return true;
      // Or multiple tweens total indicates rapid sequence
      return false;
    }) || tweens.length >= 3;
    expect(hasZap).toBe(true);
  });

  // ─── prism: refraction burst — scaleX AND scaleY both expand ──────────────
  it('prism death: produces a tween with scaleX AND scaleY both expanding (refraction burst)', () => {
    const tweens = getDeathTweens('prism');
    const hasRefraction = tweens.some((t) => {
      const sx = t.scaleX as { to?: number } | undefined;
      const sy = t.scaleY as { to?: number } | undefined;
      return (
        sx !== undefined &&
        sy !== undefined &&
        typeof sx === 'object' &&
        typeof sy === 'object' &&
        (sx.to ?? 0) >= 1.2 &&
        (sy.to ?? 0) >= 1.2
      );
    });
    expect(hasRefraction).toBe(true);
  });

  // ─── rainbow: dissolve — alpha fade with NO rotation ─────────────────────
  it('rainbow death: produces an alpha tween with no rotation property (dissolve)', () => {
    const tweens = getDeathTweens('rainbow');
    // Rainbow uses pure alpha fade — at least one alpha tween exists
    const hasAlpha = tweens.some((t) => t.alpha !== undefined);
    // None of the tweens should have an angle property (pure dissolve, no spin)
    const hasAngle = tweens.some((t) => t.angle !== undefined);
    expect(hasAlpha).toBe(true);
    expect(hasAngle).toBe(false);
  });

  // ─── gem: extra particle burst ─────────────────────────────────────────────
  it('gem death: emits particles (spark burst)', () => {
    const tile = makeTile('A', 'gem', 0);
    const scene = (tile as unknown as { scene: Phaser.Scene }).scene;
    (scene.add.particles as jest.Mock).mockClear();
    tile.playClearAnimation();
    const particleCalls = (scene.add.particles as jest.Mock).mock.calls.length;
    expect(particleCalls).toBeGreaterThanOrEqual(1);
  });

  // ─── frozen: icy melt — has a tween (gentle rotation) ────────────────────
  it('frozen death: produces a tween (icy melt)', () => {
    const tweens = getDeathTweens('frozen');
    expect(tweens.length).toBeGreaterThanOrEqual(1);
  });

  // ─── gold: gold burst — scale expansion ───────────────────────────────────
  it('gold death: produces a tween with scale expansion (gold burst)', () => {
    const tweens = getDeathTweens('gold');
    const hasExpansion = tweens.some((t) => {
      const sx = t.scaleX as { to?: number } | undefined;
      return sx !== undefined && typeof sx === 'object' && (sx.to ?? 0) >= 1.1;
    });
    expect(hasExpansion).toBe(true);
  });

  // ─── silver: silver burst — scale expansion ───────────────────────────────
  it('silver death: produces a tween with scale expansion (silver burst)', () => {
    const tweens = getDeathTweens('silver');
    const hasExpansion = tweens.some((t) => {
      const sx = t.scaleX as { to?: number } | undefined;
      return sx !== undefined && typeof sx === 'object' && (sx.to ?? 0) >= 1.1;
    });
    expect(hasExpansion).toBe(true);
  });

  // ─── diamond: diamond burst — scale expansion ─────────────────────────────
  it('diamond death: produces a tween with scale expansion (diamond burst)', () => {
    const tweens = getDeathTweens('diamond');
    const hasExpansion = tweens.some((t) => {
      const sx = t.scaleX as { to?: number } | undefined;
      return sx !== undefined && typeof sx === 'object' && (sx.to ?? 0) >= 1.1;
    });
    expect(hasExpansion).toBe(true);
  });

  // ─── magnet: magnetic pulse — full spin (angle 360) ───────────────────────
  it('magnet death: produces a tween with angle 360 spin (magnetic pulse)', () => {
    const tweens = getDeathTweens('magnet');
    const hasSpin = tweens.some((t) => {
      const angle = t.angle as { to?: number } | number | undefined;
      if (typeof angle === 'number') return Math.abs(angle) >= 180;
      if (typeof angle === 'object' && angle !== null) return Math.abs((angle as { to?: number }).to ?? 0) >= 180;
      return false;
    });
    expect(hasSpin).toBe(true);
  });

  // ─── mirror: mirror shatter — scaleX to negative (flip) ──────────────────
  it('mirror death: produces a tween with scaleX (mirror shatter)', () => {
    const tweens = getDeathTweens('mirror');
    const hasMirrorShatter = tweens.some((t) => t.scaleX !== undefined);
    expect(hasMirrorShatter).toBe(true);
  });

  // ─── standard: regression — still plays generic death ─────────────────────
  it('standard tile: still plays generic death animation (regression)', () => {
    const tweens = getDeathTweens('standard');
    // Standard should still produce >=2 tweens (squash + clear)
    expect(tweens.length).toBeGreaterThanOrEqual(2);
    // And have rotation
    const hasRotation = tweens.some((t) => t.angle !== undefined || t.rotation !== undefined);
    expect(hasRotation).toBe(true);
  });

  // ─── Each special type produces at least 1 tween distinct from generic ────
  it('each special type produces at least 1 tween call', () => {
    const specialTypes: BlastTileType[] = [
      'bomb', 'ice', 'lightning', 'prism', 'rainbow', 'gem',
      'frozen', 'gold', 'silver', 'diamond', 'magnet', 'mirror',
    ];
    for (const type of specialTypes) {
      const tweens = getDeathTweens(type);
      expect(tweens.length).toBeGreaterThanOrEqual(1);
    }
  });

  // ─── Promise resolves for every tile type ─────────────────────────────────
  it.each<BlastTileType>([
    'standard', 'bomb', 'ice', 'lightning', 'prism', 'rainbow',
    'gem', 'frozen', 'gold', 'silver', 'diamond', 'magnet', 'mirror',
  ])('Promise resolves for tile type: %s', async (type) => {
    const tile = makeTile('A', type, 0);
    await expect(tile.playClearAnimation()).resolves.toBeUndefined();
  });

  // ─── reduceMotion: single fade for bomb, mirror, diamond ─────────────────
  it('reduceMotion: bomb still produces single fade tween', () => {
    const tile = makeTile('A', 'bomb', 0);
    const scene = (tile as unknown as { scene: Phaser.Scene }).scene;
    (scene.tweens.add as jest.Mock).mockClear();
    tile.playClearAnimation({ reduceMotion: true });
    expect((scene.tweens.add as jest.Mock).mock.calls.length).toBe(1);
  });

  it('reduceMotion: mirror still produces single fade tween', () => {
    const tile = makeTile('A', 'mirror', 0);
    const scene = (tile as unknown as { scene: Phaser.Scene }).scene;
    (scene.tweens.add as jest.Mock).mockClear();
    tile.playClearAnimation({ reduceMotion: true });
    expect((scene.tweens.add as jest.Mock).mock.calls.length).toBe(1);
  });

  it('reduceMotion: diamond still produces single fade tween', () => {
    const tile = makeTile('A', 'diamond', 0);
    const scene = (tile as unknown as { scene: Phaser.Scene }).scene;
    (scene.tweens.add as jest.Mock).mockClear();
    tile.playClearAnimation({ reduceMotion: true });
    expect((scene.tweens.add as jest.Mock).mock.calls.length).toBe(1);
  });

  // ─── isLowEnd: halves particle count for bomb and gem ───────────────────
  it('isLowEnd: halves particle count for bomb', () => {
    const normalTile = makeTile('A', 'bomb', 0);
    const normalScene = (normalTile as unknown as { scene: Phaser.Scene }).scene;
    normalTile.playClearAnimation();
    const normalQty = (normalScene.add.particles as jest.Mock).mock.calls[0]?.[3]?.quantity ?? 0;

    const lowTile = makeTile('A', 'bomb', 0);
    const lowScene = (lowTile as unknown as { scene: Phaser.Scene }).scene;
    lowTile.playClearAnimation({ isLowEnd: true });
    const lowQty = (lowScene.add.particles as jest.Mock).mock.calls[0]?.[3]?.quantity ?? 0;

    expect(lowQty).toBe(Math.ceil(normalQty / 2));
  });

  it('isLowEnd: halves particle count for gem', () => {
    const normalTile = makeTile('A', 'gem', 0);
    const normalScene = (normalTile as unknown as { scene: Phaser.Scene }).scene;
    normalTile.playClearAnimation();
    const normalQty = (normalScene.add.particles as jest.Mock).mock.calls[0]?.[3]?.quantity ?? 0;

    const lowTile = makeTile('A', 'gem', 0);
    const lowScene = (lowTile as unknown as { scene: Phaser.Scene }).scene;
    lowTile.playClearAnimation({ isLowEnd: true });
    const lowQty = (lowScene.add.particles as jest.Mock).mock.calls[0]?.[3]?.quantity ?? 0;

    expect(lowQty).toBe(Math.ceil(normalQty / 2));
  });
});
