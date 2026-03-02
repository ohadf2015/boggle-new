/**
 * BossTelegraph — full-canvas attack warning overlay.
 *
 * Shows a semi-transparent red overlay with ability name banner,
 * countdown timer, and a progress bar. Positioned at depth 50 (highest boss UI).
 */

import Phaser from 'phaser';

const OVERLAY_COLOR = 0xff0000;
const OVERLAY_ALPHA = 0.15;
const BANNER_COLOR = 0x0d0d0d;
const BANNER_ALPHA = 0.85;
const TEXT_COLOR = '#ffe135';

export class BossTelegraph extends Phaser.GameObjects.Container {
  private overlay: Phaser.GameObjects.Graphics;
  private bannerBg: Phaser.GameObjects.Graphics;
  private abilityText: Phaser.GameObjects.Text;
  private countdownTimer: Phaser.Time.TimerEvent | null = null;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);

    this.overlay = scene.make.graphics({ x: 0, y: 0 });
    this.bannerBg = scene.make.graphics({ x: 0, y: 0 });
    this.abilityText = scene.make.text({
      x: scene.scale.width / 2,
      y: scene.scale.height * 0.3,
      text: '',
      style: {
        fontSize: '24px',
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontStyle: 'bold',
        color: TEXT_COLOR,
        align: 'center',
      },
    });
    this.abilityText.setOrigin(0.5, 0.5);

    this.add([this.overlay, this.bannerBg, this.abilityText]);
    this.setDepth(50);
    this.setVisible(false);
    scene.add.existing(this);
  }

  // ─── Public API ──────────────────────────────────────────────────────────────

  show(abilityName: string, duration: number): void {
    const w = this.scene.scale.width;
    const h = this.scene.scale.height;

    // Red overlay
    this.overlay.clear();
    this.overlay.fillStyle(OVERLAY_COLOR, OVERLAY_ALPHA);
    this.overlay.fillRect(0, 0, w, h);

    // Banner background
    const bannerY = h * 0.25;
    const bannerH = 50;
    this.bannerBg.clear();
    this.bannerBg.fillStyle(BANNER_COLOR, BANNER_ALPHA);
    this.bannerBg.fillRect(0, bannerY, w, bannerH);

    // Ability name text
    this.abilityText.setText(abilityName);
    this.abilityText.setPosition(w / 2, bannerY + bannerH / 2);

    this.setVisible(true);

    // Edge flash pulse
    this.countdownTimer = this.scene.time.addEvent({
      delay: duration,
      callback: () => this.hide(),
    }) as unknown as Phaser.Time.TimerEvent;
  }

  hide(): void {
    this.overlay.clear();
    this.bannerBg.clear();
    this.abilityText.setText('');
    this.setVisible(false);

    if (this.countdownTimer) {
      this.scene.time.removeEvent(this.countdownTimer);
      this.countdownTimer = null;
    }
  }

  override destroy(): void {
    if (this.countdownTimer) {
      this.scene.time.removeEvent(this.countdownTimer);
    }
    this.overlay.destroy();
    this.bannerBg.destroy();
    this.abilityText.destroy();
    super.destroy();
  }
}
