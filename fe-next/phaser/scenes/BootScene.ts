/**
 * BootScene — asset preloading before the main game scene.
 *
 * Generates all textures programmatically (no external network requests).
 * Immediately transitions to GameScene when done.
 */

import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // Generate a 64×64 white square texture used as the tile base.
    // Tinted at runtime to produce every combo-level colour.
    const g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, 64, 64);
    g.generateTexture('tile-base', 64, 64);
    g.destroy();
  }

  create(): void {
    const allKeys = this.scene.manager.keys;
    const target = Object.keys(allKeys).find(k => k !== 'BootScene') ?? 'GameScene';
    this.scene.start(target);
  }
}
