/**
 * BossAttackEffect — static methods for camera flash, slash marks, damage numbers.
 */

import Phaser from 'phaser';
import { BossAttackEffect } from '../BossAttackEffect';

function makeScene(): Phaser.Scene {
  return new Phaser.Scene();
}

describe('BossAttackEffect', () => {
  it('cameraFlash calls scene.cameras.main.flash', () => {
    const scene = makeScene();
    BossAttackEffect.cameraFlash(scene);
    expect(scene.cameras.main.flash).toHaveBeenCalled();
  });

  it('cameraFlash skips with reduce motion', () => {
    const scene = makeScene();
    BossAttackEffect.cameraFlash(scene, { reduceMotion: true });
    // Still calls flash but with 0 duration
    expect(scene.cameras.main.flash).toHaveBeenCalledWith(0, expect.anything(), expect.anything(), expect.anything());
  });

  it('slashMarks creates a graphics object', () => {
    const scene = makeScene();
    BossAttackEffect.slashMarks(scene, 400, 300);
    expect(scene.add.graphics).toHaveBeenCalled();
  });

  it('damageNumber creates a text object', () => {
    const scene = makeScene();
    BossAttackEffect.damageNumber(scene, 400, 300, 15);
    expect(scene.add.text).toHaveBeenCalled();
  });

  it('damageNumber with 0 damage does not create text', () => {
    const scene = makeScene();
    (scene.add.text as jest.Mock).mockClear();
    BossAttackEffect.damageNumber(scene, 400, 300, 0);
    expect(scene.add.text).not.toHaveBeenCalled();
  });
});
