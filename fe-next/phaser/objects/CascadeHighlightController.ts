/**
 * CascadeHighlightController — cascade word highlight visuals in Phaser.
 *
 * Draws glow rectangles around cascade word tiles with pulsing alpha.
 * Stateless controller: creates/destroys graphics per highlight cycle.
 */

import Phaser from 'phaser';
import type { CascadeHighlightWord } from '@/components/blast/types';

// ─── Constants ───────────────────────────────────────────────────────────────

const GLOW_COLOR = 0xff1493; // neo-pink
const GLOW_ALPHA = 0.4;
const GLOW_PADDING = 4;
const PULSE_DURATION = 400;

// ─── Layout type (subset of GridLayout) ──────────────────────────────────────

interface LayoutInfo {
  tileSize: number;
  gap: number;
  offsetX: number;
  offsetY: number;
}

// ─── CascadeHighlightController ─────────────────────────────────────────────

export class CascadeHighlightController {
  private graphics: Phaser.GameObjects.Graphics | null = null;
  private tween: unknown = null;

  /** Draw glow rectangles around cascade word paths with pulsing alpha. */
  showHighlight(
    scene: Phaser.Scene,
    words: CascadeHighlightWord[],
    layout: LayoutInfo,
  ): void {
    this.clearHighlight();

    this.graphics = scene.add.graphics();

    for (const word of words) {
      for (const cell of word.path) {
        const x = layout.offsetX + cell.col * (layout.tileSize + layout.gap);
        const y = layout.offsetY + cell.row * (layout.tileSize + layout.gap);

        // Glow rectangle around tile
        this.graphics.fillStyle(GLOW_COLOR, GLOW_ALPHA);
        this.graphics.fillRoundedRect(
          x - GLOW_PADDING,
          y - GLOW_PADDING,
          layout.tileSize + GLOW_PADDING * 2,
          layout.tileSize + GLOW_PADDING * 2,
          6,
        );
      }
    }

    // Pulsing alpha tween
    this.tween = scene.tweens.add({
      targets: this.graphics,
      alpha: { from: 1, to: 0.4 },
      duration: PULSE_DURATION,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  /** Remove all highlight graphics. */
  clearHighlight(): void {
    if (this.graphics) {
      this.graphics.destroy();
      this.graphics = null;
    }
    this.tween = null;
  }
}
