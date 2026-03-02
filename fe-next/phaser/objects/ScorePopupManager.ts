/**
 * ScorePopupManager — floating score text popups in Phaser canvas.
 *
 * Creates text objects that rise, scale-pulse, and fade out.
 * Color-coded by tile type, with cascade distinction and stagger timing.
 */

import Phaser from 'phaser';
import type { BlastTileType } from '@/components/blast/types';

// ─── Constants ───────────────────────────────────────────────────────────────

const RISE_DISTANCE = 60;
const BASE_DURATION = 800;
const BASE_FONT_SIZE = 24;
const LARGE_FONT_SIZE = 30;
const HUGE_FONT_SIZE = 36;
const STAGGER_DELAY = 50; // ms per stagger index
const CASCADE_SIZE_MULTIPLIER = 1.2;

// Score thresholds for visual intensity
const MEDIUM_SCORE = 6;
const HIGH_SCORE = 16;

// ─── Tile type color map ────────────────────────────────────────────────────

const TILE_TYPE_COLORS: Record<string, string> = {
  gold: '#ffd700',
  bomb: '#ff4500',
  ice: '#00bfff',
  frozen: '#00bfff',
  lightning: '#ffe135',
  cascade: '#ff00ff',
};
const DEFAULT_COLOR = '#ffffff';
const CASCADE_COLOR = '#ff00ff';

// ─── Options ─────────────────────────────────────────────────────────────────

export interface PopupOptions {
  /** Tile type for color coding */
  tileType?: BlastTileType | string;
  /** Cascade chain level (2+ triggers cascade styling) */
  chainLevel?: number;
  /** Stagger index for timing offset (0 = no delay) */
  staggerIndex?: number;
  /** Skip tween animation */
  reduceMotion?: boolean;
}

// ─── ScorePopupManager ──────────────────────────────────────────────────────

export class ScorePopupManager {
  private activePopups: Phaser.GameObjects.Text[] = [];

  /**
   * Show a floating score popup at (x, y).
   * Color-coded by tile type, cascade scores get magenta + chain suffix.
   */
  showPopup(
    scene: Phaser.Scene,
    x: number,
    y: number,
    score: number,
    options: PopupOptions = {},
  ): void {
    const {
      tileType,
      chainLevel,
      staggerIndex = 0,
      reduceMotion = false,
    } = options;

    const isCascade = chainLevel !== undefined && chainLevel >= 2;

    // Font size: base scales with score, cascade is 20% bigger
    let fontSize = score >= HIGH_SCORE
      ? HUGE_FONT_SIZE
      : score >= MEDIUM_SCORE
        ? LARGE_FONT_SIZE
        : BASE_FONT_SIZE;

    if (isCascade) {
      fontSize = Math.round(fontSize * CASCADE_SIZE_MULTIPLIER);
    }

    // Color: cascade overrides tile type color
    const color = isCascade
      ? CASCADE_COLOR
      : (tileType && TILE_TYPE_COLORS[tileType]) || DEFAULT_COLOR;

    // Text content: cascade appends chain level suffix
    const displayText = isCascade
      ? `+${score} \u00D7${chainLevel}`
      : `+${score}`;

    // Horizontal drift to avoid overlap (±10px)
    const drift = (Math.random() - 0.5) * 20;

    const text = scene.add.text(x + drift, y, displayText, {
      fontSize: `${fontSize}px`,
      fontFamily: "'Fredoka', 'Rubik', sans-serif",
      color,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    });
    text.setOrigin(0.5, 0.5);

    this.activePopups.push(text);

    if (reduceMotion) {
      scene.time.delayedCall(BASE_DURATION, () => {
        this.destroyPopup(text);
      });
      return;
    }

    const delay = staggerIndex > 0 ? staggerIndex * STAGGER_DELAY : 0;

    scene.tweens.add({
      targets: text,
      y: y - RISE_DISTANCE,
      alpha: { from: 1, to: 0 },
      scaleX: { from: 1.3, to: 1.0 },
      scaleY: { from: 1.3, to: 1.0 },
      duration: BASE_DURATION,
      delay: delay || undefined,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.destroyPopup(text);
      },
    });
  }

  /** Remove all active popups. */
  cleanup(): void {
    for (const popup of this.activePopups) {
      popup.destroy();
    }
    this.activePopups = [];
  }

  private destroyPopup(text: Phaser.GameObjects.Text): void {
    text.destroy();
    this.activePopups = this.activePopups.filter(p => p !== text);
  }
}
