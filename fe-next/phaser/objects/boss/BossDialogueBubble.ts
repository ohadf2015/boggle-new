/**
 * BossDialogueBubble — speech bubble for boss taunts.
 *
 * Displays boss name (yellow) and taunt text (white) in a rounded bubble.
 * RTL support via Phaser Text `rtl` property for Hebrew locale.
 */

import Phaser from 'phaser';

const BUBBLE_BG = 0x1a1a2e;
const BUBBLE_BORDER = 0x0d0d0d;
const NAME_COLOR = '#ffe135';
const TAUNT_COLOR = '#ffffff';
const BUBBLE_PADDING = 12;
const BUBBLE_WIDTH = 260;

export class BossDialogueBubble extends Phaser.GameObjects.Container {
  private bubble: Phaser.GameObjects.Graphics;
  private nameText: Phaser.GameObjects.Text;
  private tauntText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    this.bubble = scene.make.graphics({ x: 0, y: 0 });
    this.nameText = scene.make.text({
      x: BUBBLE_PADDING,
      y: BUBBLE_PADDING,
      text: '',
      style: {
        fontSize: '14px',
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontStyle: 'bold',
        color: NAME_COLOR,
      },
    });
    this.tauntText = scene.make.text({
      x: BUBBLE_PADDING,
      y: BUBBLE_PADDING + 20,
      text: '',
      style: {
        fontSize: '13px',
        fontFamily: 'Arial, Helvetica, sans-serif',
        color: TAUNT_COLOR,
        wordWrap: { width: BUBBLE_WIDTH - BUBBLE_PADDING * 2 },
      },
    });

    this.add([this.bubble, this.nameText, this.tauntText]);
    this.setDepth(35);
    this.setVisible(false);
    scene.add.existing(this);
  }

  // ─── Public API ──────────────────────────────────────────────────────────────

  show(bossName: string, tauntText: string): void {
    this.nameText.setText(bossName);
    this.tauntText.setText(tauntText);
    this.drawBubble();
    this.setVisible(true);
  }

  hide(): void {
    this.setVisible(false);
  }

  setRTL(rtl: boolean): void {
    this.nameText.setStyle({ rtl });
    this.tauntText.setStyle({ rtl });
  }

  override destroy(): void {
    this.bubble.destroy();
    this.nameText.destroy();
    this.tauntText.destroy();
    super.destroy();
  }

  // ─── Private ─────────────────────────────────────────────────────────────────

  private drawBubble(): void {
    const h = 70; // Approximate bubble height
    this.bubble.clear();
    this.bubble.fillStyle(BUBBLE_BG, 0.9);
    this.bubble.fillRoundedRect(0, 0, BUBBLE_WIDTH, h, 8);
    this.bubble.lineStyle(2, BUBBLE_BORDER, 1);
    this.bubble.strokeRoundedRect(0, 0, BUBBLE_WIDTH, h, 8);
  }
}
