/**
 * BossAvatar — boss portrait with reaction tweens.
 */

import Phaser from 'phaser';
import { BossAvatar } from '../BossAvatar';

function makeScene(): Phaser.Scene {
  return new Phaser.Scene();
}

describe('BossAvatar', () => {
  it('creates without throwing', () => {
    const scene = makeScene();
    expect(() => new BossAvatar(scene, 50, 30)).not.toThrow();
  });

  it('sets depth to 31 (above HP bar)', () => {
    const scene = makeScene();
    const avatar = new BossAvatar(scene, 50, 30);
    expect(avatar.setDepth).toHaveBeenCalledWith(31);
  });

  it('playHit triggers a tween', () => {
    const scene = makeScene();
    const avatar = new BossAvatar(scene, 50, 30);
    avatar.playHit();
    expect(scene.tweens.add).toHaveBeenCalled();
  });

  it('playAttack triggers a tween', () => {
    const scene = makeScene();
    const avatar = new BossAvatar(scene, 50, 30);
    avatar.playAttack();
    expect(scene.tweens.add).toHaveBeenCalled();
  });

  it('setEnraged applies a glow tween', () => {
    const scene = makeScene();
    const avatar = new BossAvatar(scene, 50, 30);
    avatar.setEnraged(true);
    expect(scene.tweens.add).toHaveBeenCalled();
  });

  it('destroy cleans up', () => {
    const scene = makeScene();
    const avatar = new BossAvatar(scene, 50, 30);
    expect(() => avatar.destroy()).not.toThrow();
  });
});
