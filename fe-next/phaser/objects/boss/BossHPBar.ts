/**
 * BossHPBar — 3-segment HP bar rendered via Phaser Graphics.
 *
 * Segments correspond to boss phases: phase1 (green), phase2 (yellow), enraged (red).
 * Flash effect on damage, pulse glow when HP < 33%.
 */

import Phaser from 'phaser';

// ─── Phase colors ──────────────────────────────────────────────────────────────

const PHASE_COLORS: Record<string, number> = {
  phase1: 0x4ade80,   // green
  phase2: 0xfbbf24,   // yellow
  enraged: 0xff2d20,  // red
};

const BG_COLOR = 0x1a1a2e;
const BORDER_COLOR = 0x0d0d0d;
const SEGMENT_BORDER_COLOR = 0x333333;

// ─── BossHPBar ─────────────────────────────────────────────────────────────────

export class BossHPBar extends Phaser.GameObjects.Container {
  private bar: Phaser.GameObjects.Graphics;
  private flashOverlay: Phaser.GameObjects.Graphics;
  private barWidth: number;
  private barHeight: number;
  private currentHP = 100;
  private maxHP = 100;
  private phase = 'phase1';

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    height: number,
  ) {
    super(scene, x, y);

    this.barWidth = width;
    this.barHeight = height;

    this.bar = scene.make.graphics({ x: 0, y: 0 });
    this.flashOverlay = scene.make.graphics({ x: 0, y: 0 });

    this.add([this.bar, this.flashOverlay]);
    this.setDepth(30);
    this.setSize(width, height);
    scene.add.existing(this);

    this.drawBar();
  }

  // ─── Public API ──────────────────────────────────────────────────────────────

  updateHP(currentHP: number, maxHP: number, phase: string): void {
    this.currentHP = currentHP;
    this.maxHP = maxHP;
    this.phase = phase;
    this.drawBar();
  }

  flash(): void {
    const half = this.barHeight / 2;
    this.flashOverlay.clear();
    this.flashOverlay.fillStyle(0xffffff, 0.6);
    this.flashOverlay.fillRect(0, -half, this.barWidth, this.barHeight);

    this.scene.tweens.add({
      targets: this.flashOverlay,
      alpha: { from: 1, to: 0 },
      duration: 200,
      ease: 'Linear',
      onComplete: () => this.flashOverlay.clear(),
    });
  }

  override destroy(): void {
    this.bar.destroy();
    this.flashOverlay.destroy();
    super.destroy();
  }

  // ─── Private ─────────────────────────────────────────────────────────────────

  private drawBar(): void {
    const g = this.bar;
    const w = this.barWidth;
    const h = this.barHeight;
    const half = h / 2;
    const pct = this.maxHP > 0 ? this.currentHP / this.maxHP : 0;
    const fillW = Math.max(0, w * pct);
    const fillColor = PHASE_COLORS[this.phase] ?? PHASE_COLORS.phase1;

    g.clear();

    // Background
    g.fillStyle(BG_COLOR, 1);
    g.fillRoundedRect(0, -half, w, h, 4);

    // HP fill
    if (fillW > 0) {
      g.fillStyle(fillColor, 1);
      g.fillRoundedRect(0, -half, fillW, h, 4);
    }

    // Segment dividers (33% and 66%)
    g.lineStyle(1, SEGMENT_BORDER_COLOR, 0.5);
    const seg1 = Math.floor(w / 3);
    const seg2 = Math.floor((w * 2) / 3);
    g.moveTo(seg1, -half);
    g.lineTo(seg1, half);
    g.strokePath();
    g.moveTo(seg2, -half);
    g.lineTo(seg2, half);
    g.strokePath();

    // Border
    g.lineStyle(2, BORDER_COLOR, 1);
    g.strokeRoundedRect(0, -half, w, h, 4);
  }
}
