/**
 * BlastTile combo glow — setComboGlow / clearComboGlow methods.
 *
 * Verifies:
 * - setComboGlow creates a glow graphics layer with given color and alpha
 * - Glow pulses via a tween (alpha oscillation)
 * - clearComboGlow removes the glow layer and kills tweens
 * - Calling setComboGlow again replaces the previous glow
 * - Standard tiles can also have combo glow applied
 *
 * RED phase: tests fail until implementation exists.
 */

import Phaser from 'phaser';
import { BlastTile } from '../BlastTile';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeScene(): Phaser.Scene {
  return new Phaser.Scene();
}

function makeTile(letter = 'A'): BlastTile {
  const scene = makeScene();
  return new BlastTile(scene, 100, 100, letter, 60, 'standard', 0);
}

function getScene(tile: BlastTile): Phaser.Scene {
  return (tile as unknown as { scene: Phaser.Scene }).scene;
}

// ─── setComboGlow ─────────────────────────────────────────────────────────────

describe('BlastTile.setComboGlow', () => {
  it('creates a glow graphics object via scene.make.graphics', () => {
    const tile = makeTile();
    const scene = getScene(tile);
    const makeGraphicsBefore = (scene.make.graphics as jest.Mock).mock.calls.length;

    tile.setComboGlow(0xffe135, 0.4);

    expect((scene.make.graphics as jest.Mock).mock.calls.length).toBeGreaterThan(makeGraphicsBefore);
  });

  it('draws a circle with the given color', () => {
    const tile = makeTile();
    const scene = getScene(tile);

    tile.setComboGlow(0xff1493, 0.6);

    // The last graphics created should have fillStyle called with the color
    const makeGraphics = scene.make.graphics as jest.Mock;
    const glowGraphics = makeGraphics.mock.results[makeGraphics.mock.results.length - 1].value;
    expect(glowGraphics.fillStyle).toHaveBeenCalledWith(0xff1493, expect.any(Number));
    expect(glowGraphics.fillCircle).toHaveBeenCalled();
  });

  it('starts a pulse tween for alpha oscillation', () => {
    const tile = makeTile();
    const scene = getScene(tile);
    const tweensBefore = (scene.tweens.add as jest.Mock).mock.calls.length;

    tile.setComboGlow(0xffe135, 0.4);

    expect((scene.tweens.add as jest.Mock).mock.calls.length).toBeGreaterThan(tweensBefore);
    // Verify tween config has yoyo and repeat for pulsing
    const lastTweenCall = (scene.tweens.add as jest.Mock).mock.calls.at(-1)[0];
    expect(lastTweenCall.yoyo).toBe(true);
    expect(lastTweenCall.repeat).toBe(-1);
  });

  it('replaces previous glow when called again', () => {
    const tile = makeTile();
    const scene = getScene(tile);

    tile.setComboGlow(0xffe135, 0.2);

    // Kill tweens should be called on second set to clean up
    const killSpy = scene.tweens.killTweensOf as jest.Mock;
    killSpy.mockClear();

    tile.setComboGlow(0xff1493, 0.6);

    expect(killSpy).toHaveBeenCalled();
  });

  it('adds the glow as a child of the tile container', () => {
    const tile = makeTile();
    const addSpy = tile.add as jest.Mock;
    const addCountBefore = addSpy.mock.calls.length;

    tile.setComboGlow(0xffe135, 0.4);

    expect(addSpy.mock.calls.length).toBeGreaterThan(addCountBefore);
  });
});

// ─── clearComboGlow ───────────────────────────────────────────────────────────

describe('BlastTile.clearComboGlow', () => {
  it('destroys the glow graphics', () => {
    const tile = makeTile();
    const scene = getScene(tile);

    tile.setComboGlow(0xffe135, 0.4);

    const makeGraphics = scene.make.graphics as jest.Mock;
    const glowGraphics = makeGraphics.mock.results[makeGraphics.mock.results.length - 1].value;

    tile.clearComboGlow();

    expect(glowGraphics.destroy).toHaveBeenCalled();
  });

  it('kills tweens on the glow object', () => {
    const tile = makeTile();
    const scene = getScene(tile);

    tile.setComboGlow(0xffe135, 0.4);

    const killSpy = scene.tweens.killTweensOf as jest.Mock;
    killSpy.mockClear();

    tile.clearComboGlow();

    expect(killSpy).toHaveBeenCalled();
  });

  it('does not throw when no glow exists', () => {
    const tile = makeTile();
    expect(() => tile.clearComboGlow()).not.toThrow();
  });

  it('prevents double-destroy', () => {
    const tile = makeTile();

    tile.setComboGlow(0xffe135, 0.4);
    tile.clearComboGlow();
    // Second call should not throw
    expect(() => tile.clearComboGlow()).not.toThrow();
  });
});
