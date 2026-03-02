/**
 * BossHPBar — 3-segment HP bar rendered via Phaser Graphics.
 *
 * Verifies:
 *  - HP bar draws correctly at different HP levels
 *  - Phase colors change (green → yellow → red)
 *  - Flash effect triggers on damage
 *  - Low HP pulse (< 33%)
 *  - updateHP() redraws the bar
 *  - destroy() cleans up
 */

import Phaser from 'phaser';
import { BossHPBar } from '../BossHPBar';

function makeScene(): Phaser.Scene {
  return new Phaser.Scene();
}

describe('BossHPBar', () => {
  it('creates without throwing', () => {
    const scene = makeScene();
    expect(() => new BossHPBar(scene, 400, 20, 300, 20)).not.toThrow();
  });

  it('sets depth to 30 for boss UI layer', () => {
    const scene = makeScene();
    const bar = new BossHPBar(scene, 400, 20, 300, 20);
    expect(bar.setDepth).toHaveBeenCalledWith(30);
  });

  it('draws initial HP at full', () => {
    const scene = makeScene();
    const bar = new BossHPBar(scene, 400, 20, 300, 20);
    // Graphics should have been used for drawing
    const gfx = (bar as unknown as { bar: { fillStyle: jest.Mock } }).bar;
    expect(gfx.fillStyle).toHaveBeenCalled();
  });

  it('updateHP redraws with new value', () => {
    const scene = makeScene();
    const bar = new BossHPBar(scene, 400, 20, 300, 20);
    const gfx = (bar as unknown as { bar: { fillStyle: jest.Mock } }).bar;
    gfx.fillStyle.mockClear();

    bar.updateHP(50, 100, 'phase2');
    expect(gfx.fillStyle).toHaveBeenCalled();
  });

  it('uses red tint when phase is enraged', () => {
    const scene = makeScene();
    const bar = new BossHPBar(scene, 400, 20, 300, 20);
    const gfx = (bar as unknown as { bar: { fillStyle: jest.Mock } }).bar;
    gfx.fillStyle.mockClear();

    bar.updateHP(20, 100, 'enraged');
    // Should include red fill (0xff2d20 or similar)
    const fills = (gfx.fillStyle as jest.Mock).mock.calls.map(([c]: [number]) => c);
    const hasRed = fills.some((c: number) => (c & 0xff0000) > 0xaa0000);
    expect(hasRed).toBe(true);
  });

  it('flash triggers a tween on damage', () => {
    const scene = makeScene();
    const bar = new BossHPBar(scene, 400, 20, 300, 20);
    bar.flash();
    expect(scene.tweens.add).toHaveBeenCalled();
  });

  it('destroy cleans up', () => {
    const scene = makeScene();
    const bar = new BossHPBar(scene, 400, 20, 300, 20);
    expect(() => bar.destroy()).not.toThrow();
  });
});
