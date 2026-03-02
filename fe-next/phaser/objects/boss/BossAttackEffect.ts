/**
 * BossAttackEffect — static helper methods for boss attack visuals.
 *
 * All methods are static to keep them stateless and easy to call from BossUIManager.
 * Effects: camera flash, slash mark graphics, floating damage numbers.
 */

import Phaser from 'phaser';

interface EffectOptions {
  reduceMotion?: boolean;
}

export class BossAttackEffect {
  /**
   * Flash the camera red on attack impact.
   */
  static cameraFlash(scene: Phaser.Scene, opts: EffectOptions = {}): void {
    const duration = opts.reduceMotion ? 0 : 200;
    scene.cameras.main.flash(duration, 255, 50, 50);
  }

  /**
   * Draw animated slash marks at the given position.
   */
  static slashMarks(scene: Phaser.Scene, x: number, y: number, opts: EffectOptions = {}): void {
    const g = scene.add.graphics();
    g.setDepth(45);
    g.lineStyle(3, 0xff3366, 0.9);

    // Two crossing slash lines
    const len = 60;
    g.beginPath();
    g.moveTo(x - len, y - len);
    g.lineTo(x + len, y + len);
    g.strokePath();

    g.beginPath();
    g.moveTo(x + len, y - len);
    g.lineTo(x - len, y + len);
    g.strokePath();

    // Fade out
    scene.tweens.add({
      targets: g,
      alpha: 0,
      duration: opts.reduceMotion ? 0 : 500,
      ease: 'Linear',
      onComplete: () => g.destroy(),
    });
  }

  /**
   * Show a floating damage number that rises and fades.
   */
  static damageNumber(scene: Phaser.Scene, x: number, y: number, damage: number, opts: EffectOptions = {}): void {
    if (damage <= 0) return;

    const text = scene.add.text(x, y, `-${damage}`, {
      fontSize: '28px',
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontStyle: 'bold',
      color: '#ff2d20',
    });
    text.setOrigin(0.5, 0.5);
    text.setDepth(46);

    scene.tweens.add({
      targets: text,
      y: y - 40,
      alpha: { from: 1, to: 0 },
      duration: opts.reduceMotion ? 0 : 700,
      ease: 'Quad.easeOut',
      onComplete: () => text.destroy(),
    });
  }
}
