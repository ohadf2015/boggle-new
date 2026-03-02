/**
 * LetterTile — a single Phaser tile: rounded-rect background + letter text.
 *
 * Wraps TileStateMachine for state tracking.
 * Selected and submitted-accept states use the active combo colour palette;
 * idle is always white (clean, readable default).
 */

import Phaser from 'phaser';
import {
  createTileState,
  transitionTile,
  type TileState,
  type TileStatus,
} from '@/lib/phaser/logic/TileStateMachine';
import { getComboHexColors, type ComboHexColors } from '@/lib/phaser/logic/ComboTracker';

// ─── Static colours (non-combo states) ───────────────────────────────────────

const IDLE_COLORS    = { bg: 0xffffff, border: 0x1a1a2e, text: 0x1a1a2e };
const REJECT_COLORS  = { bg: 0xff2d20, border: 0x0d0d0d, text: 0xffffff };
const CLEAR_COLORS   = { bg: 0x00ffff, border: 0x0d0d0d, text: 0x0d0d0d };

const CORNER_RADIUS = 8;
const BORDER_WIDTH = 3;
const FONT_SIZE_RATIO = 0.45;
const HINT_GLOW_COLOR = 0xffe135; // neo-yellow

// ─── Idle breathing constants ────────────────────────────────────────────────

const BREATHING_SCALE_MIN = 1;
const BREATHING_SCALE_MAX = 1.03;
const BREATHING_DURATION_MIN = 1200;
const BREATHING_DURATION_MAX = 1800;

export interface IdleAnimationOptions {
  reduceMotion?: boolean;
  isLowEnd?: boolean;
}

// ─── LetterTile class ────────────────────────────────────────────────────────

export class LetterTile extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;
  private tileState: TileState;
  protected readonly tileSize: number;
  /** Combo colours set at select-time; persist through submitAccept. */
  private comboColors: ComboHexColors = getComboHexColors(0);
  /** Hint glow ring overlay — persistent until cleared. */
  private hintGlow: Phaser.GameObjects.Graphics | null = null;
  private hintPulseTween: Phaser.Tweens.Tween | null = null;
  /** Selection glow ring — active while tile is selected. */
  private selectionGlow: Phaser.GameObjects.Graphics | null = null;
  private selectionPulseTween: Phaser.Tweens.Tween | null = null;
  /** Whether idle animations are active (so select/deselect can pause/resume). */
  protected idleActive = false;
  protected idleOptions: IdleAnimationOptions = {};

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    letter: string,
    tileSize: number
  ) {
    super(scene, x, y);

    this.tileSize = tileSize;
    this.tileState = createTileState(letter);

    // make.graphics() does NOT add to scene — correct for Container children
    this.bg = scene.make.graphics({ x: 0, y: 0 });
    this.drawBackground('idle');

    const fontSize = Math.floor(tileSize * FONT_SIZE_RATIO);
    this.label = scene.make.text({
      x: 0,
      y: 0,
      text: letter,
      style: {
        fontSize: `${fontSize}px`,
        fontFamily: "Arial, Helvetica, sans-serif",
        fontStyle: 'bold',
        color: `#${IDLE_COLORS.text.toString(16).padStart(6, '0')}`,
      },
    });
    this.label.setOrigin(0.5, 0.5);

    this.add([this.bg, this.label]);
    this.setSize(tileSize, tileSize);
    scene.add.existing(this);
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  getLetter(): string {
    return this.tileState.letter;
  }

  getStatus(): TileStatus {
    return this.tileState.status;
  }

  /** Select this tile as part of the current word path.
   *  @param index   Position in the path (0-based).
   *  @param comboColors  Active combo palette — used for selected + accept visuals.
   *  @param reduceMotion  Skip pulse and snap animations.
   *  @param pathLength  Current path length — used to intensify snap for longer words. */
  select(index: number, comboColors: ComboHexColors, reduceMotion = false, pathLength = 0): void {
    this.comboColors = comboColors;
    this.tileState = transitionTile(this.tileState, { type: 'select', index });
    this.applyVisualState();
    // Pause idle breathing while selected
    if (this.idleActive) {
      this.scene.tweens.killTweensOf(this);
    }
    this.showSelectionGlow(comboColors.glowColor, reduceMotion);
    if (!reduceMotion) this.playSelectSnap(pathLength);
  }

  deselect(): void {
    this.clearSelectionGlow();
    this.tileState = transitionTile(this.tileState, { type: 'deselect' });
    this.applyVisualState();
    // Resume idle animations
    this.restartIdleTweens();
  }

  submitAccept(): void {
    this.tileState = transitionTile(this.tileState, { type: 'submit-accept' });
    this.applyVisualState();
  }

  submitReject(): void {
    this.tileState = transitionTile(this.tileState, { type: 'submit-reject' });
    this.applyVisualState();
  }

  reset(): void {
    this.clearSelectionGlow();
    this.tileState = transitionTile(this.tileState, { type: 'reset' });
    this.applyVisualState();
  }

  startClearing(): void {
    this.tileState = transitionTile(this.tileState, { type: 'clear' });
    this.applyVisualState();
  }

  /** Show a persistent hint glow ring around this tile (neo-yellow pulse). */
  showHintGlow(reduceMotion = false): void {
    if (this.hintGlow) return; // already showing

    const half = this.tileSize / 2;
    const g = this.scene.make.graphics({ x: 0, y: 0 });
    g.lineStyle(3, HINT_GLOW_COLOR, 0.9);
    g.strokeRoundedRect(-half - 2, -half - 2, this.tileSize + 4, this.tileSize + 4, CORNER_RADIUS + 2);
    this.hintGlow = g;
    this.add(g);

    if (!reduceMotion) {
      this.hintPulseTween = this.scene.tweens.add({
        targets: g,
        alpha: { from: 0.9, to: 0.3 },
        duration: 800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  /** Remove the persistent hint glow. */
  clearHintGlow(): void {
    if (this.hintPulseTween) {
      this.hintPulseTween.destroy();
      this.hintPulseTween = null;
    }
    if (this.hintGlow) {
      this.hintGlow.destroy();
      this.hintGlow = null;
    }
  }

  /** Whether this tile is currently showing hint glow. */
  get isHintHighlighted(): boolean {
    return this.hintGlow !== null;
  }

  // ─── Idle animations ──────────────────────────────────────────────────────

  /** Start idle breathing animation. Call once after tile is placed on grid. */
  startIdleAnimations(options: IdleAnimationOptions = {}): void {
    this.idleOptions = options;
    if (options.reduceMotion) return;
    this.idleActive = true;
    this.startBreathingTween();
  }

  /** Stop all idle tweens (cleanup on destroy or scene transition). */
  stopIdleAnimations(): void {
    this.idleActive = false;
    this.scene.tweens.killTweensOf(this);
  }

  /** Restart idle tweens (called after deselect). Subclasses override to add type-specific. */
  protected restartIdleTweens(): void {
    if (!this.idleActive) return;
    this.startBreathingTween();
  }

  private startBreathingTween(): void {
    const duration = BREATHING_DURATION_MIN +
      Math.random() * (BREATHING_DURATION_MAX - BREATHING_DURATION_MIN);

    this.scene.tweens.add({
      targets: this,
      scaleX: { from: BREATHING_SCALE_MIN, to: BREATHING_SCALE_MAX },
      scaleY: { from: BREATHING_SCALE_MIN, to: BREATHING_SCALE_MAX },
      duration,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  private resolveColors(status: TileStatus): { bg: number; border: number; text: number } {
    switch (status) {
      case 'idle':
        return IDLE_COLORS;
      case 'selected':
      case 'submitted-accept':
        // Use the combo palette stored at select-time
        return {
          bg:     this.comboColors.fillColor,
          border: this.comboColors.borderColor,
          text:   this.comboColors.textColor,
        };
      case 'submitted-reject':
        return REJECT_COLORS;
      case 'clearing':
        return CLEAR_COLORS;
    }
  }

  private drawBackground(status: TileStatus): void {
    const { bg, border } = this.resolveColors(status);
    const half = this.tileSize / 2;

    this.bg.clear();
    // Hard shadow (offset)
    this.bg.fillStyle(0x0d0d0d, 1);
    this.bg.fillRoundedRect(-half + 3, -half + 3, this.tileSize, this.tileSize, CORNER_RADIUS);
    // Fill
    this.bg.fillStyle(bg, 1);
    this.bg.fillRoundedRect(-half, -half, this.tileSize, this.tileSize, CORNER_RADIUS);
    // Border
    this.bg.lineStyle(BORDER_WIDTH, border, 1);
    this.bg.strokeRoundedRect(-half, -half, this.tileSize, this.tileSize, CORNER_RADIUS);
  }

  private applyVisualState(): void {
    const status = this.tileState.status;
    this.drawBackground(status);
    const textHex = this.resolveColors(status).text.toString(16).padStart(6, '0');
    this.label.setColor(`#${textHex}`);
  }

  // ─── Selection glow + snap ──────────────────────────────────────────────────

  /** Combo-colored halo ring around the tile while selected. */
  private showSelectionGlow(glowColor: number, reduceMotion: boolean): void {
    // Avoid duplicate glows
    this.clearSelectionGlow();

    const half = this.tileSize / 2;
    const g = this.scene.make.graphics({ x: 0, y: 0 });
    g.lineStyle(3, glowColor, 0.8);
    g.strokeRoundedRect(-half - 3, -half - 3, this.tileSize + 6, this.tileSize + 6, CORNER_RADIUS + 3);
    this.selectionGlow = g;
    this.add(g);

    if (!reduceMotion) {
      this.selectionPulseTween = this.scene.tweens.add({
        targets: g,
        alpha: { from: 0.4, to: 0.8 },
        duration: 600,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  private clearSelectionGlow(): void {
    if (this.selectionPulseTween) {
      this.selectionPulseTween.destroy();
      this.selectionPulseTween = null;
    }
    if (this.selectionGlow) {
      this.selectionGlow.destroy();
      this.selectionGlow = null;
    }
  }

  /** Snappy squish instead of weak bounce — feels more tactile.
   *  Intensifies 10% at path length 4+ for word building momentum. */
  private playSelectSnap(pathLength: number): void {
    // At path length 4+, squish is 10% more intense
    const intense = pathLength >= 4;
    const squishX = intense ? 0.83 : 0.85;
    const squishY = intense ? 1.17 : 1.15;

    this.scene.tweens.add({
      targets: this,
      scaleX: { from: 1, to: squishX },
      scaleY: { from: 1, to: squishY },
      duration: 60,
      yoyo: true,
      ease: 'Back.easeOut',
    });
  }

  // ─── Dimming ──────────────────────────────────────────────────────────────

  /** Set the dim state of this tile for grid dimming during selection. */
  setDimmed(level: 'dimmed' | 'reachable' | 'none'): void {
    const alphaMap = { dimmed: 0.5, reachable: 0.7, none: 1 };
    this.setAlpha(alphaMap[level]);
  }
}
