/**
 * CascadeSequencer — orchestrates the full cascade chain reaction choreography.
 *
 * Ties together: highlight zoom-in → "CASCADE ×N" text → camera flash → camera shake
 * into a cohesive sequence with escalating intensity per chain level.
 *
 * Returns a Promise that resolves when the full sequence completes,
 * so gravity can wait on it before dropping tiles.
 */

import Phaser from 'phaser';
import { cameraFlash, cameraShake } from '../effects/CameraEffects';

// ─── Types ──────────────────────────────────────────────────────────────────

interface CascadeWord {
  word: string;
  path: Array<{ row: number; col: number }>;
  chainLevel: number;
}

interface LayoutInfo {
  tileSize: number;
  gap: number;
  offsetX: number;
  offsetY: number;
}

export interface CascadeSequenceConfig {
  scene: Phaser.Scene;
  chainLevel: number;
  cascadeWords: CascadeWord[];
  layout: LayoutInfo;
  reduceMotion: boolean;
  isLowEnd: boolean;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const BASE_FONT_SIZE = 24;
const FONT_SIZE_PER_LEVEL = 4;
const GLOW_BASE_ALPHA = 0.3;
const GLOW_ALPHA_PER_LEVEL = 0.1;
const GLOW_MAX_ALPHA = 0.8;
const GLOW_PADDING = 4;
const GLOW_COLOR = 0xff1493; // neo-pink
const FLASH_THRESHOLD = 3;
const SHAKE_THRESHOLD = 4;
const HIGHLIGHT_DURATION = 200;
const TEXT_DURATION = 300;
const PAUSE_BETWEEN = 150;

/** Color escalation per chain level */
const CHAIN_COLORS: Record<number, string> = {
  2: '#ffe135', // neo-yellow
  3: '#ff6b35', // neo-orange
  4: '#ff1493', // neo-pink
};
const DEFAULT_CHAIN_COLOR = '#00ffff'; // neo-cyan (level 5+)

function getChainColor(level: number): string {
  return CHAIN_COLORS[level] ?? DEFAULT_CHAIN_COLOR;
}

function getGlowAlpha(level: number): number {
  return Math.min(GLOW_BASE_ALPHA + GLOW_ALPHA_PER_LEVEL * level, GLOW_MAX_ALPHA);
}

// ─── CascadeSequencer ───────────────────────────────────────────────────────

export const CascadeSequencer = {
  play(config: CascadeSequenceConfig): Promise<void> {
    const { scene, chainLevel, cascadeWords, layout, reduceMotion, isLowEnd } = config;

    if (reduceMotion) {
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      // Step 1: Draw highlight glows with zoom-in
      const glowGraphics = scene.add.graphics();
      const glowAlpha = getGlowAlpha(chainLevel);

      for (const word of cascadeWords) {
        for (const cell of word.path) {
          const x = layout.offsetX + cell.col * (layout.tileSize + layout.gap);
          const y = layout.offsetY + cell.row * (layout.tileSize + layout.gap);
          glowGraphics.fillStyle(GLOW_COLOR, glowAlpha);
          glowGraphics.fillRoundedRect(
            x - GLOW_PADDING,
            y - GLOW_PADDING,
            layout.tileSize + GLOW_PADDING * 2,
            layout.tileSize + GLOW_PADDING * 2,
            6,
          );
        }
      }

      // Zoom-in animation on the glow
      scene.tweens.add({
        targets: glowGraphics,
        scaleX: { from: 0.8, to: 1.0 },
        scaleY: { from: 0.8, to: 1.0 },
        alpha: { from: 0, to: 1 },
        duration: HIGHLIGHT_DURATION,
        ease: 'Back.easeOut',
        onComplete: () => {
          // Step 2: Pause, then show CASCADE text
          scene.time.delayedCall(PAUSE_BETWEEN, () => {
            this.showCascadeText(scene, chainLevel);

            // Step 3: Camera flash at level 3+
            if (chainLevel >= FLASH_THRESHOLD) {
              cameraFlash(scene.cameras.main, 0xffffff, 200, false);
            }

            // Step 4: Camera shake at level 4+
            if (chainLevel >= SHAKE_THRESHOLD) {
              const intensity = chainLevel >= 5 ? 'shaking' : 'warning';
              cameraShake(scene.cameras.main, intensity, false);
            }

            // Step 5: Text animation, then resolve
            scene.time.delayedCall(TEXT_DURATION, () => {
              glowGraphics.destroy();
              resolve();
            });
          });
        },
      });
    });
  },

  showCascadeText(scene: Phaser.Scene, chainLevel: number): void {
    const cx = scene.scale.width / 2;
    const cy = scene.scale.height / 2;
    const fontSize = BASE_FONT_SIZE + FONT_SIZE_PER_LEVEL * chainLevel;
    const color = getChainColor(chainLevel);

    const text = scene.add.text(cx, cy, `CASCADE \u00D7${chainLevel}!`, {
      fontSize: `${fontSize}px`,
      fontFamily: "'Fredoka', 'Rubik', sans-serif",
      color,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
    });

    // Zoom-in with Back easing
    scene.tweens.add({
      targets: text,
      scaleX: { from: 0.5, to: 1.2 },
      scaleY: { from: 0.5, to: 1.2 },
      alpha: { from: 0, to: 1 },
      duration: TEXT_DURATION,
      ease: 'Back.easeOut',
      onComplete: () => {
        text.destroy();
      },
    });
  },
};
