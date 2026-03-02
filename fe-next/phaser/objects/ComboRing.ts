/**
 * ComboRing — expanding ring animation on combo level-up.
 *
 * Single Graphics object that tweens its scale outward then fades.
 * Instant / skipped when reduceMotion is true.
 */

import Phaser from 'phaser';

export class ComboRing extends Phaser.GameObjects.Graphics {
  constructor(scene: Phaser.Scene) {
    super(scene);
    scene.add.existing(this);
    this.setDepth(20);
    this.setAlpha(0);
  }

  /**
   * Trigger the ring burst at canvas position (x, y).
   * @param color - 24-bit hex integer
   * @param reduceMotion - skip animation entirely when true
   */
  play(x: number, y: number, color: number, reduceMotion: boolean): void {
    if (reduceMotion) return;

    this.setPosition(x, y);
    this.setAlpha(1);
    this.setScale(0.1);
    this.clear();

    this.lineStyle(4, color, 1);
    this.strokeCircle(0, 0, 40);

    this.scene.tweens.add({
      targets: this,
      scale: 3,
      alpha: 0,
      duration: 500,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.clear();
        this.setScale(1);
      },
    });
  }
}
