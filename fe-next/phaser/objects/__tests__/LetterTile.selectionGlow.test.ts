/**
 * LetterTile — selection glow ring + snap animation tests.
 *
 * Verifies that:
 *  - select() creates a combo-colored glow ring around the tile
 *  - Glow ring pulses between 0.4 and 0.8 alpha
 *  - deselect()/reset() removes the selection glow
 *  - select() plays a squish snap animation (scaleX 0.85, scaleY 1.15)
 *  - reduceMotion skips glow pulse + snap animation
 *  - setDimmed() controls tile dimming (alpha 0.5 for dimmed, 0.7 for reachable)
 */

import Phaser from 'phaser';
import { LetterTile } from '../LetterTile';
import type { ComboHexColors } from '@/lib/phaser/logic/ComboTracker';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeScene(): Phaser.Scene {
  return new Phaser.Scene();
}

const LIME_COMBO: ComboHexColors = {
  fillColor: 0xb8ff00,
  borderColor: 0x0d0d0d,
  textColor: 0x0d0d0d,
  glowColor: 0xb8ff00,
};

// ─── Selection glow ring ──────────────────────────────────────────────────────

describe('LetterTile selection glow ring', () => {
  it('creates a glow ring graphics child on select', () => {
    const scene = makeScene();
    const tile = new LetterTile(scene, 0, 0, 'A', 80);

    const makeGraphicsBefore = (scene.make.graphics as jest.Mock).mock.calls.length;
    tile.select(0, LIME_COMBO);
    const makeGraphicsAfter = (scene.make.graphics as jest.Mock).mock.calls.length;

    // 1 extra graphics object for the glow ring
    expect(makeGraphicsAfter - makeGraphicsBefore).toBe(1);
  });

  it('glow ring uses the combo glowColor', () => {
    const scene = makeScene();
    const tile = new LetterTile(scene, 0, 0, 'A', 80);
    tile.select(0, LIME_COMBO);

    // The glow graphics is the last created one
    const makeGraphics = scene.make.graphics as jest.Mock;
    const glowGraphics = makeGraphics.mock.results[makeGraphics.mock.results.length - 1]?.value;
    expect(glowGraphics).toBeDefined();

    const lineStyleCalls = (glowGraphics.lineStyle as jest.Mock).mock.calls;
    const usesGlowColor = lineStyleCalls.some(
      (call: unknown[]) => call[1] === LIME_COMBO.glowColor
    );
    expect(usesGlowColor).toBe(true);
  });

  it('glow ring has a pulse tween between 0.4 and 0.8 alpha', () => {
    const scene = makeScene();
    const tile = new LetterTile(scene, 0, 0, 'A', 80);

    (scene.tweens.add as jest.Mock).mockClear();
    tile.select(0, LIME_COMBO);

    // Should have at least two tweens: the snap + the glow pulse
    const tweenCalls = (scene.tweens.add as jest.Mock).mock.calls;
    const pulseTween = tweenCalls.find((call: unknown[]) => {
      const config = call[0] as Record<string, unknown>;
      const alphaConfig = config.alpha;
      if (typeof alphaConfig === 'object' && alphaConfig !== null) {
        const a = alphaConfig as Record<string, number>;
        return a.from === 0.4 && a.to === 0.8;
      }
      return false;
    });
    expect(pulseTween).toBeDefined();
  });

  it('deselect removes the glow ring', () => {
    const scene = makeScene();
    const tile = new LetterTile(scene, 0, 0, 'A', 80);
    tile.select(0, LIME_COMBO);

    const makeGraphics = scene.make.graphics as jest.Mock;
    const glowGraphics = makeGraphics.mock.results[makeGraphics.mock.results.length - 1]?.value;

    tile.deselect();

    expect(glowGraphics.destroy).toHaveBeenCalled();
  });

  it('reset removes the glow ring', () => {
    const scene = makeScene();
    const tile = new LetterTile(scene, 0, 0, 'A', 80);
    tile.select(0, LIME_COMBO);

    const makeGraphics = scene.make.graphics as jest.Mock;
    const glowGraphics = makeGraphics.mock.results[makeGraphics.mock.results.length - 1]?.value;

    tile.reset();

    expect(glowGraphics.destroy).toHaveBeenCalled();
  });

  it('does not create duplicate glow if already selected', () => {
    const scene = makeScene();
    const tile = new LetterTile(scene, 0, 0, 'A', 80);

    const makeGraphicsBefore = (scene.make.graphics as jest.Mock).mock.calls.length;
    tile.select(0, LIME_COMBO);
    // Select again (same tile) — should not duplicate
    // First deselect so state allows re-select
    tile.deselect();
    tile.select(1, LIME_COMBO);
    const makeGraphicsAfter = (scene.make.graphics as jest.Mock).mock.calls.length;

    // 2 glow rings total (one per select), not accumulated
    expect(makeGraphicsAfter - makeGraphicsBefore).toBe(2);
  });
});

// ─── Snap animation (squish) ─────────────────────────────────────────────────

describe('LetterTile snap animation', () => {
  it('plays a squish snap with scaleX 0.85 and scaleY 1.15 on select', () => {
    const scene = makeScene();
    const tile = new LetterTile(scene, 0, 0, 'A', 80);

    (scene.tweens.add as jest.Mock).mockClear();
    tile.select(0, LIME_COMBO);

    const tweenCalls = (scene.tweens.add as jest.Mock).mock.calls;
    const snapTween = tweenCalls.find((call: unknown[]) => {
      const config = call[0] as Record<string, unknown>;
      // Look for the squish: scaleX goes to 0.85
      const scaleX = config.scaleX;
      if (typeof scaleX === 'object' && scaleX !== null) {
        const sx = scaleX as Record<string, number>;
        return sx.to === 0.85;
      }
      return false;
    });
    expect(snapTween).toBeDefined();

    // Verify scaleY goes to 1.15
    if (snapTween) {
      const config = snapTween[0] as Record<string, unknown>;
      const scaleY = config.scaleY as Record<string, number>;
      expect(scaleY.to).toBe(1.15);
    }
  });

  it('snap squish duration is 60ms', () => {
    const scene = makeScene();
    const tile = new LetterTile(scene, 0, 0, 'A', 80);

    (scene.tweens.add as jest.Mock).mockClear();
    tile.select(0, LIME_COMBO);

    const tweenCalls = (scene.tweens.add as jest.Mock).mock.calls;
    const snapTween = tweenCalls.find((call: unknown[]) => {
      const config = call[0] as Record<string, unknown>;
      const scaleX = config.scaleX;
      if (typeof scaleX === 'object' && scaleX !== null) {
        return (scaleX as Record<string, number>).to === 0.85;
      }
      return false;
    });
    expect(snapTween).toBeDefined();

    const config = snapTween![0] as Record<string, unknown>;
    expect(config.duration).toBe(60);
  });
});

// ─── Reduce motion ───────────────────────────────────────────────────────────

describe('LetterTile selection with reduceMotion', () => {
  it('skips glow pulse tween when reduceMotion is true', () => {
    const scene = makeScene();
    const tile = new LetterTile(scene, 0, 0, 'A', 80);

    (scene.tweens.add as jest.Mock).mockClear();
    tile.select(0, LIME_COMBO, true);

    const tweenCalls = (scene.tweens.add as jest.Mock).mock.calls;
    // No pulse tween (alpha 0.4→0.8)
    const pulseTween = tweenCalls.find((call: unknown[]) => {
      const config = call[0] as Record<string, unknown>;
      const alphaConfig = config.alpha;
      if (typeof alphaConfig === 'object' && alphaConfig !== null) {
        const a = alphaConfig as Record<string, number>;
        return a.from === 0.4 && a.to === 0.8;
      }
      return false;
    });
    expect(pulseTween).toBeUndefined();
  });

  it('skips snap squish tween when reduceMotion is true', () => {
    const scene = makeScene();
    const tile = new LetterTile(scene, 0, 0, 'A', 80);

    (scene.tweens.add as jest.Mock).mockClear();
    tile.select(0, LIME_COMBO, true);

    const tweenCalls = (scene.tweens.add as jest.Mock).mock.calls;
    // No snap tween
    const snapTween = tweenCalls.find((call: unknown[]) => {
      const config = call[0] as Record<string, unknown>;
      const scaleX = config.scaleX;
      return typeof scaleX === 'object' && scaleX !== null;
    });
    expect(snapTween).toBeUndefined();
  });

  it('still creates glow ring graphics even with reduceMotion (static glow)', () => {
    const scene = makeScene();
    const tile = new LetterTile(scene, 0, 0, 'A', 80);

    const makeGraphicsBefore = (scene.make.graphics as jest.Mock).mock.calls.length;
    tile.select(0, LIME_COMBO, true);
    const makeGraphicsAfter = (scene.make.graphics as jest.Mock).mock.calls.length;

    // Glow ring still created (just no pulse)
    expect(makeGraphicsAfter - makeGraphicsBefore).toBe(1);
  });
});

// ─── Dimming ─────────────────────────────────────────────────────────────────

describe('LetterTile.setDimmed', () => {
  it('sets alpha to 0.5 when dimmed', () => {
    const scene = makeScene();
    const tile = new LetterTile(scene, 0, 0, 'A', 80);

    tile.setDimmed('dimmed');
    expect(tile.setAlpha).toHaveBeenCalledWith(0.5);
  });

  it('sets alpha to 0.7 when reachable', () => {
    const scene = makeScene();
    const tile = new LetterTile(scene, 0, 0, 'A', 80);

    tile.setDimmed('reachable');
    expect(tile.setAlpha).toHaveBeenCalledWith(0.7);
  });

  it('sets alpha to 1 when none', () => {
    const scene = makeScene();
    const tile = new LetterTile(scene, 0, 0, 'A', 80);

    tile.setDimmed('none');
    expect(tile.setAlpha).toHaveBeenCalledWith(1);
  });
});
