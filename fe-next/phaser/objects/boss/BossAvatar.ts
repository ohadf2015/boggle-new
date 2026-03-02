/**
 * BossAvatar — boss portrait placeholder with reaction tweens.
 *
 * When a real boss image is loaded, it can be assigned via setTexture.
 * For now, draws a colored circle with an icon placeholder.
 * Reaction tweens: idle sway, hit flinch, attack lunge.
 */

import Phaser from 'phaser';

const AVATAR_COLOR = 0x1a1a2e;
const BORDER_COLOR = 0x0d0d0d;
const ENRAGED_GLOW_COLOR = 0xff2d20;

export class BossAvatar extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Graphics;
  private glow: Phaser.GameObjects.Graphics;
  private enrageTween: unknown = null;
  private readonly avatarSize: number;

  constructor(scene: Phaser.Scene, x: number, y: number, size = 56) {
    super(scene, x, y);

    this.avatarSize = size;
    this.bg = scene.make.graphics({ x: 0, y: 0 });
    this.glow = scene.make.graphics({ x: 0, y: 0 });

    this.drawAvatar();

    this.add([this.glow, this.bg]);
    this.setDepth(31);
    this.setSize(size, size);
    scene.add.existing(this);
  }

  // ─── Public API ──────────────────────────────────────────────────────────────

  playHit(): void {
    this.scene.tweens.add({
      targets: this,
      x: { from: this.x - 3, to: this.x + 3 },
      duration: 60,
      yoyo: true,
      repeat: 2,
      ease: 'Linear',
    });
  }

  playAttack(): void {
    this.scene.tweens.add({
      targets: this,
      scaleX: { from: 1, to: 1.15 },
      scaleY: { from: 1, to: 1.15 },
      duration: 150,
      yoyo: true,
      ease: 'Back.easeOut',
    });
  }

  setEnraged(enraged: boolean): void {
    if (enraged) {
      this.drawEnragedGlow();
      this.enrageTween = this.scene.tweens.add({
        targets: this.glow,
        alpha: { from: 0.4, to: 0.8 },
        duration: 600,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    } else {
      this.glow.clear();
      if (this.enrageTween) {
        this.scene.tweens.killTweensOf(this.glow);
        this.enrageTween = null;
      }
    }
  }

  override destroy(): void {
    this.bg.destroy();
    this.glow.destroy();
    super.destroy();
  }

  // ─── Private ─────────────────────────────────────────────────────────────────

  private drawAvatar(): void {
    const half = this.avatarSize / 2;
    this.bg.clear();
    this.bg.fillStyle(AVATAR_COLOR, 1);
    this.bg.fillRoundedRect(-half, -half, this.avatarSize, this.avatarSize, 6);
    this.bg.lineStyle(3, BORDER_COLOR, 1);
    this.bg.strokeRoundedRect(-half, -half, this.avatarSize, this.avatarSize, 6);
  }

  private drawEnragedGlow(): void {
    const half = this.avatarSize / 2 + 4;
    this.glow.clear();
    this.glow.fillStyle(ENRAGED_GLOW_COLOR, 0.3);
    this.glow.fillRoundedRect(-half, -half, half * 2, half * 2, 8);
  }
}
