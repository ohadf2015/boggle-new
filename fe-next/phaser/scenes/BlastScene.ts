/**
 * BlastScene — Phaser scene for blast mode grid rendering.
 *
 * Extends GameScene with blast-specific bridge subscriptions:
 * - blast:grid:update → builds grid with BlastTile instances + combo escalation
 * - blast:tiles:clear → clear animations + explosions
 * - blast:gravity:start → gravity tween sequence
 * - blast:cascade:highlight / blast:cascade:clear → cascade visuals + chain text
 * - blast:hint:show / blast:hint:clear
 * - blast:shake → camera shake
 * - blast:wave:transition → wave transition with "WAVE N" overlay
 *
 * Emits blast:anim:complete after each animation phase.
 */

import Phaser from 'phaser';
import { GameBridge, type BridgeEvents } from '@/lib/phaser/bridge/GameBridge';
import { GameScene } from './GameScene';
import { BlastTile } from '../objects/BlastTile';
import { GravityController } from '../objects/GravityController';
import { CascadeHighlightController } from '../objects/CascadeHighlightController';
import { ScorePopupManager } from '../objects/ScorePopupManager';
import { BlastParticleManager } from '../objects/BlastParticleManager';
import { cameraShake, cameraFlash, cameraZoom } from '../effects/CameraEffects';
import { playComboParticles } from '../objects/ParticleManager';
import { playComboLevelUp } from '../effects/ComboEffect';
import { BackgroundLayers } from '../effects/BackgroundLayers';
import { buildGridLayout } from '@/lib/phaser/logic/GridGeometry';
import { getComboHexColors } from '@/lib/phaser/logic/ComboTracker';
import type { BlastTileState } from '@/components/blast/types';

// ─── Shake intensity mapping ─────────────────────────────────────────────────

const SHAKE_MAP: Record<string, 'warning' | 'shaking' | 'fire-round'> = {
  light: 'warning',
  medium: 'shaking',
  heavy: 'fire-round',
};

// ─── Combo escalation thresholds ─────────────────────────────────────────────

const COMBO_RADIAL_THRESHOLD = 8;

// ─── Background gradient config ─────────────────────────────────────────────

const BG_CENTER_COLOR = 0x1a1a2e;
const BG_EDGE_COLOR = 0x0d0d1a;
const BG_GRADIENT_STEPS = 8;
const VIGNETTE_DEFAULT_ALPHA = 0.15;

// ─── Combo milestone labels ─────────────────────────────────────────────────

interface MilestoneConfig {
  minLevel: number;
  label: string;
  glowAlpha: number;
}

const MILESTONES: MilestoneConfig[] = [
  { minLevel: 10, label: 'GODLIKE!', glowAlpha: 1.0 },
  { minLevel: 7, label: 'MYTHIC!', glowAlpha: 0.8 },
  { minLevel: 5, label: 'FIRE!', glowAlpha: 0.6 },
  { minLevel: 3, label: 'NICE!', glowAlpha: 0.4 },
];

function getMilestone(level: number): MilestoneConfig | null {
  return MILESTONES.find((m) => level >= m.minLevel) ?? null;
}

// ─── BlastScene ─────────────────────────────────────────────────────────────

export class BlastScene extends GameScene {
  private particles = new BlastParticleManager();
  private gravityCtrl = new GravityController({ particleManager: this.particles });
  private cascadeHighlight = new CascadeHighlightController();
  private scorePopups = new ScorePopupManager();
  private blastTiles: Map<string, BlastTile> = new Map();

  // Combo level-up tracking (mirrors GameScene pattern)
  private previousBlastCombo: number | null = null;

  // Cascade chain text overlay (cleaned up between phases)
   
  private cascadeText: any = null;
  // Milestone text overlay
   
  private milestoneText: any = null;
  // Background radial glow overlay for high combo
   
  private radialGlow: any = null;

  // ─── Temporal juice state ──────────────────────────────────────────────────
  private isHitStopped = false;
  private isDilated = false;

  // ─── Living background ─────────────────────────────────────────────────────
  private bgLayers: BackgroundLayers | null = null;
   
  private backgroundGradient: any = null;
   
  private ambientEmitter: any = null;
   
  private vignetteOverlay: any = null;

  // Stored bound handlers for cleanup
  private readonly blastHandlers = {
    onBlastGridUpdate: (p: BridgeEvents['blast:grid:update']) => this.handleBlastGridUpdate(p),
    onTilesClear: (p: BridgeEvents['blast:tiles:clear']) => this.handleTilesClear(p),
    onGravityStart: (p: BridgeEvents['blast:gravity:start']) => this.handleGravityStart(p),
    onCascadeHighlight: (p: BridgeEvents['blast:cascade:highlight']) => this.handleCascadeHighlight(p),
    onCascadeClear: (p: BridgeEvents['blast:cascade:clear']) => this.handleCascadeClear(p),
    onHintShow: (p: BridgeEvents['blast:hint:show']) => this.handleHintShow(p),
    onHintClear: () => this.handleHintClear(),
    onShake: (p: BridgeEvents['blast:shake']) => this.handleShake(p),
    onWaveTransition: (p: BridgeEvents['blast:wave:transition']) => this.handleWaveTransition(p),
    onWordFeedback: (p: BridgeEvents['word:feedback']) => this.handleBlastWordFeedback(p),
  };

  constructor() {
    super('BlastScene');
  }

  // ─── Lifecycle ─────────────────────────────────────────────────────────────

  create(): void {
    this.unsubscribeBlastBridge();
    this.subscribeBlastBridge();
    super.create();
    this.createBackgroundLayers();
  }

  // ─── Public accessors (for testing) ─────────────────────────────────────────

  /** Number of tiles currently in the grid. */
  getTileCount(): number {
    return this.tiles.size;
  }

  // ─── Bridge subscriptions ──────────────────────────────────────────────────

  private subscribeBlastBridge(): void {
    GameBridge.on('blast:grid:update', this.blastHandlers.onBlastGridUpdate);
    GameBridge.on('blast:tiles:clear', this.blastHandlers.onTilesClear);
    GameBridge.on('blast:gravity:start', this.blastHandlers.onGravityStart);
    GameBridge.on('blast:cascade:highlight', this.blastHandlers.onCascadeHighlight);
    GameBridge.on('blast:cascade:clear', this.blastHandlers.onCascadeClear);
    GameBridge.on('blast:hint:show', this.blastHandlers.onHintShow);
    GameBridge.on('blast:hint:clear', this.blastHandlers.onHintClear);
    GameBridge.on('blast:shake', this.blastHandlers.onShake);
    GameBridge.on('blast:wave:transition', this.blastHandlers.onWaveTransition);
    GameBridge.on('word:feedback', this.blastHandlers.onWordFeedback);
  }

  private unsubscribeBlastBridge(): void {
    GameBridge.off('blast:grid:update', this.blastHandlers.onBlastGridUpdate);
    GameBridge.off('blast:tiles:clear', this.blastHandlers.onTilesClear);
    GameBridge.off('blast:gravity:start', this.blastHandlers.onGravityStart);
    GameBridge.off('blast:cascade:highlight', this.blastHandlers.onCascadeHighlight);
    GameBridge.off('blast:cascade:clear', this.blastHandlers.onCascadeClear);
    GameBridge.off('blast:hint:show', this.blastHandlers.onHintShow);
    GameBridge.off('blast:hint:clear', this.blastHandlers.onHintClear);
    GameBridge.off('blast:shake', this.blastHandlers.onShake);
    GameBridge.off('blast:wave:transition', this.blastHandlers.onWaveTransition);
    GameBridge.off('word:feedback', this.blastHandlers.onWordFeedback);
  }

  // ─── Blast-specific handlers ───────────────────────────────────────────────

  private handleBlastGridUpdate({ grid, tileStates, comboLevel }: BridgeEvents['blast:grid:update']): void {
    const prevLevel = this.previousBlastCombo;
    this.previousBlastCombo = comboLevel;

    this.buildBlastGrid(grid, tileStates);

    // Combo level-up detection: skip first update to avoid false positive on load
    if (prevLevel !== null && comboLevel > prevLevel) {
      this.onBlastComboLevelUp(comboLevel);
    }
  }

  /** Combo level-up — ring burst, particles, milestone text, and escalation visuals. */
  private onBlastComboLevelUp(level: number): void {
    if (this.a11y.reduceMotion) return;

    const colors = getComboHexColors(level);
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;

    // Full combo celebration (shockwave + text + particles + light rays)
    playComboLevelUp(this, { x: cx, y: cy }, level, {
      reduceMotion: this.a11y.reduceMotion,
      isLowEnd: this.a11y.isLowEnd,
    });

    // Combo glow on all tiles (intensity scales with level)
    const milestone = getMilestone(level);
    if (milestone) {
      this.applyComboGlowToTiles(colors.glowColor, milestone.glowAlpha);
      this.showMilestoneText(milestone.label, colors.glowColor);

      // Camera flash at milestones (zoom handled by playComboLevelUp)
      cameraFlash(this.cameras.main, colors.glowColor, 200, this.a11y.reduceMotion);
    }

    // Background radial pulse at combo 8+
    if (level >= COMBO_RADIAL_THRESHOLD) {
      this.playRadialPulse(colors.glowColor);
    }

    // Time dilation at milestone thresholds (skip on low-end)
    if (!this.a11y.isLowEnd) {
      this.applyTimeDilation(level);
    }
  }

  /** Apply combo glow to all blast tiles via setComboGlow. */
  private applyComboGlowToTiles(color: number, alpha: number): void {
    this.blastTiles.forEach((tile) => {
      tile.setComboGlow(color, alpha);
    });
  }

  /** Show large milestone text that scales in and fades out. */
  private showMilestoneText(label: string, color: number): void {
    this.cleanupMilestoneText();

    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;
    const colorHex = `#${color.toString(16).padStart(6, '0')}`;

    this.milestoneText = this.add.text(cx, cy, label, {
      fontSize: '48px',
      fontFamily: "'Fredoka', 'Rubik', sans-serif",
      color: colorHex,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 5,
    });
    this.milestoneText.setOrigin(0.5, 0.5);
    this.milestoneText.setDepth(40);
    this.milestoneText.setAlpha(1);

    // Scale from 2.0→1.0 with Back.easeOut, then fade after 1s
    this.tweens.add({
      targets: this.milestoneText,
      scaleX: { from: 2.0, to: 1.0 },
      scaleY: { from: 2.0, to: 1.0 },
      duration: 400,
      ease: 'Back.easeOut',
      onComplete: () => {
        // Fade after brief hold
        this.time.delayedCall(600, () => {
          if (!this.milestoneText) return;
          this.tweens.add({
            targets: this.milestoneText,
            alpha: 0,
            duration: 400,
            onComplete: () => this.cleanupMilestoneText(),
          });
        });
      },
    });
  }

  private cleanupMilestoneText(): void {
    if (this.milestoneText) {
      this.milestoneText.destroy();
      this.milestoneText = null;
    }
  }

  /** Radial glow pulse from center for very high combos. */
  private playRadialPulse(color: number): void {
    if (!this.radialGlow) {
      this.radialGlow = this.make.graphics({ x: 0, y: 0 });
      this.add.existing(this.radialGlow);
      this.radialGlow.setDepth(0);
    }

    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;
    const radius = Math.max(this.scale.width, this.scale.height) * 0.4;

    this.radialGlow.clear();
    this.radialGlow.setPosition(cx, cy);
    this.radialGlow.fillStyle(color, 0.15);
    this.radialGlow.fillCircle(0, 0, radius);
    this.radialGlow.setAlpha(1);

    this.tweens.add({
      targets: this.radialGlow,
      alpha: 0,
      scaleX: { from: 0.5, to: 1.5 },
      scaleY: { from: 0.5, to: 1.5 },
      duration: 600,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.radialGlow?.clear();
        this.radialGlow?.setScale(1);
      },
    });
  }

  // ─── Temporal juice ──────────────────────────────────────────────────────

  /** Hit-stop: freeze all tweens on accepted word of 4+ letters. */
  private handleBlastWordFeedback({ type, word }: BridgeEvents['word:feedback']): void {
    if (type !== 'accepted' || this.a11y.reduceMotion || this.isHitStopped) return;

    const len = word.length;
    if (len < 4) return;

    // Scale freeze duration with word length
    const freezeMs = len >= 8 ? 150 : len >= 6 ? 120 : 80;

    this.isHitStopped = true;
    this.tweens.pauseAll();

    this.time.delayedCall(freezeMs, () => {
      this.tweens.resumeAll();
      this.isHitStopped = false;
    });

    // Extra camera zoom for very long words (8+)
    if (len >= 8) {
      cameraZoom(this.cameras.main, 1.05, 300, this.a11y.reduceMotion);
    }
  }

  /** Time dilation: slow tweens at combo milestones for dramatic effect. */
  private applyTimeDilation(level: number): void {
    if (this.isDilated) return; // Don't stack

    let targetScale: number;
    let duration: number;

    if (level >= 10) {
      targetScale = 0.3;
      duration = 600;
      cameraZoom(this.cameras.main, 1.08, duration, this.a11y.reduceMotion);
    } else if (level >= 8) {
      targetScale = 0.4;
      duration = 500;
    } else if (level >= 5) {
      targetScale = 0.6;
      duration = 400;
    } else {
      return; // Below threshold
    }

    this.isDilated = true;
    this.tweens.timeScale = targetScale;

    // Smooth ramp-back to normal speed
    this.time.delayedCall(duration, () => {
      this.rampBackTimeScale();
    });
  }

  /** Gradually restore timeScale: current → 0.5 → 0.7 → 1.0 over 200ms. */
  private rampBackTimeScale(): void {
    const steps = [0.5, 0.7, 1.0];
    const stepMs = 67; // ~200ms / 3 steps

    steps.forEach((scale, i) => {
      this.time.delayedCall(stepMs * (i + 1), () => {
        this.tweens.timeScale = scale;
        if (scale >= 1.0) {
          this.isDilated = false;
        }
      });
    });
  }

  private handleTilesClear(
    { clearedPositions, explosions, scorePopups }: BridgeEvents['blast:tiles:clear'],
    { skipCameraEffects = false } = {},
  ): void {
    const clearPromises: Promise<void>[] = [];
    const clearOpts = { reduceMotion: this.a11y.reduceMotion, isLowEnd: this.a11y.isLowEnd };

    for (const pos of clearedPositions) {
      const tile = this.blastTiles.get(`${pos.row},${pos.col}`);
      if (tile) {
        clearPromises.push(tile.playClearAnimation(clearOpts));
      }
    }

    // Camera flash + zoom punch on direct word clear (not cascade — cascade has its own effects)
    if (!skipCameraEffects && clearedPositions.length > 0) {
      const comboLevel = this.previousBlastCombo ?? 0;
      const colors = getComboHexColors(comboLevel);
      cameraFlash(this.cameras.main, colors.glowColor, 200, this.a11y.reduceMotion);
      cameraZoom(this.cameras.main, 1.03, 300, this.a11y.reduceMotion);
    }

    // Show score popups with tile type color coding and stagger
    for (let i = 0; i < scorePopups.length; i++) {
      const popup = scorePopups[i];
      const tile = this.blastTiles.get(`${popup.row},${popup.col}`);
      if (tile) {
        this.scorePopups.showPopup(this, tile.x, tile.y, popup.score, {
          tileType: popup.tileType ?? 'standard',
          staggerIndex: i,
          reduceMotion: this.a11y.reduceMotion,
        });
      }
    }

    // Play explosion particles
    const particleConfig = { reduceMotion: this.a11y.reduceMotion, isLowEnd: this.a11y.isLowEnd };
    for (const exp of explosions) {
      const tile = this.blastTiles.get(`${exp.row},${exp.col}`);
      if (!tile) continue;
      this.playExplosionForType(exp.type, tile.x, tile.y, particleConfig);
    }

    // Emit completion after all clear animations
    Promise.all(clearPromises).then(() => {
      GameBridge.emit('blast:anim:complete', { phase: 'clear' });
    });
  }

  private handleGravityStart({ fallingTiles, newTiles }: BridgeEvents['blast:gravity:start']): void {
    this.gravityCtrl.playGravitySequence(
      this, fallingTiles, newTiles, this.blastTiles, this.layout?.tileSize ?? 60
    ).then(() => {
      GameBridge.emit('blast:anim:complete', { phase: 'gravity' });
    });
  }

  private handleCascadeHighlight({ words }: BridgeEvents['blast:cascade:highlight']): void {
    if (this.layout) {
      this.cascadeHighlight.showHighlight(this, words, this.layout);
    }

    // Show "CASCADE ×N" text for chain level > 1
    const maxChainLevel = words.reduce((max, w) => Math.max(max, w.chainLevel), 0);
    if (maxChainLevel > 1 && !this.a11y.reduceMotion) {
      this.showCascadeChainText(maxChainLevel);
    }

    GameBridge.emit('blast:anim:complete', { phase: 'cascade-highlight' });
  }

  private handleCascadeClear(payload: BridgeEvents['blast:cascade:clear']): void {
    this.cascadeHighlight.clearHighlight();
    this.cleanupCascadeText();

    // Camera flash for chain level > 1
    const chainLevel = payload.chainLevel ?? 0;
    if (chainLevel > 1) {
      cameraFlash(this.cameras.main, 0xffffff, 200, this.a11y.reduceMotion);
    }

    // Reuse same clear logic but skip camera effects (cascade has its own above)
    this.handleTilesClear(
      {
        clearedPositions: payload.clearedPositions,
        explosions: payload.explosions,
        scorePopups: payload.scorePopups,
      },
      { skipCameraEffects: true },
    );
  }

  /** Show growing "CASCADE ×N!" text at center of canvas. */
  private showCascadeChainText(chainLevel: number): void {
    this.cleanupCascadeText();

    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;

    this.cascadeText = this.add.text(cx, cy, `CASCADE \u00D7${chainLevel}!`, {
      fontSize: '32px',
      fontFamily: "'Fredoka', 'Rubik', sans-serif",
      color: '#ff1493',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
    });
    this.cascadeText.setOrigin(0.5, 0.5);
    this.cascadeText.setDepth(30);
    this.cascadeText.setAlpha(0);

    this.tweens.add({
      targets: this.cascadeText,
      alpha: 1,
      scaleX: { from: 0.5, to: 1.2 },
      scaleY: { from: 0.5, to: 1.2 },
      duration: 400,
      ease: 'Back.easeOut',
    });
  }

  private cleanupCascadeText(): void {
    if (this.cascadeText) {
      this.cascadeText.destroy();
      this.cascadeText = null;
    }
  }

  private handleHintShow({ path }: BridgeEvents['blast:hint:show']): void {
    // Blink tiles in the hint path (3 cycles, 300ms each)
    for (const cell of path) {
      const tile = this.blastTiles.get(`${cell.row},${cell.col}`);
      if (tile) {
        this.tweens.add({
          targets: tile,
          alpha: 0.4,
          duration: 300,
          yoyo: true,
          repeat: 2,
          ease: 'Sine.easeInOut',
        });
      }
    }
  }

  private handleHintClear(): void {
    // Reset alpha on all tiles
    this.blastTiles.forEach((tile) => {
      tile.setAlpha(1);
    });
  }

  private handleShake({ intensity }: BridgeEvents['blast:shake']): void {
    const mapped = SHAKE_MAP[intensity] ?? 'warning';
    cameraShake(this.cameras.main, mapped, this.a11y.reduceMotion);
  }

  private handleWaveTransition({ waveNumber, score }: BridgeEvents['blast:wave:transition']): void {
    const tiles = Array.from(this.blastTiles.values());
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;
    const particleConfig = { reduceMotion: this.a11y.reduceMotion, isLowEnd: this.a11y.isLowEnd };

    // 1. Confetti burst
    this.particles.playConfetti(this, cx, cy, particleConfig);

    // 2. Score summary text (if score provided)
    if (score !== undefined) {
      this.showWaveScoreText(waveNumber, score);
    }

    // 3. Show "WAVE N" text with overshoot
    this.showWaveText(waveNumber);

    // 4. Red pulse for wave 3+ (danger warning)
    if (waveNumber >= 3 && !this.a11y.reduceMotion) {
      cameraFlash(this.cameras.main, 0xff0000, 300, this.a11y.reduceMotion);
    }

    if (tiles.length === 0) {
      this.time.delayedCall(800, () => {
        this.cleanupWaveText();
        this.cleanupWaveScoreText();
        GameBridge.emit('blast:anim:complete', { phase: 'wave-transition' });
      });
      return;
    }

    if (this.a11y.reduceMotion) {
      this.blastTiles.forEach(t => t.destroy());
      this.blastTiles.clear();
      this.tiles.clear();
      this.time.delayedCall(400, () => {
        this.cleanupWaveText();
        this.cleanupWaveScoreText();
        GameBridge.emit('blast:anim:complete', { phase: 'wave-transition' });
      });
      return;
    }

    // 5. Staggered fly-out with rotation
    let completed = 0;
    tiles.forEach((tile, i) => {
      const randomAngle = (Math.random() - 0.5) * 360; // ±180 degrees
      this.tweens.add({
        targets: tile,
        scaleX: 0,
        scaleY: 0,
        alpha: 0,
        angle: randomAngle,
        duration: 200,
        delay: i * 20,
        ease: 'Back.easeIn',
        onComplete: () => {
          completed++;
          if (completed >= tiles.length) {
            this.blastTiles.forEach(t => t.destroy());
            this.blastTiles.clear();
            this.tiles.clear();
            // 6. 200ms breathing room before new grid
            this.time.delayedCall(200, () => {
              this.cleanupWaveText();
              this.cleanupWaveScoreText();
              GameBridge.emit('blast:anim:complete', { phase: 'wave-transition' });
            });
          }
        },
      });
    });
  }

  /** Show "WAVE N" text centered on canvas. */
  private showWaveText(waveNumber: number): void {
    this.cleanupWaveText();

    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;

    this.waveText = this.add.text(cx, cy, `WAVE ${waveNumber}`, {
      fontSize: '48px',
      fontFamily: "'Fredoka', 'Rubik', sans-serif",
      color: '#ffe135',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 6,
    });
    this.waveText.setOrigin(0.5, 0.5);
    this.waveText.setDepth(50);

    if (!this.a11y.reduceMotion) {
      this.waveText.setAlpha(0);
      this.waveText.setScale(0);
      // Overshoot bounce: scale 0 -> 1.5 -> 1.0
      this.tweens.add({
        targets: this.waveText,
        alpha: 1,
        scaleX: { from: 0, to: 1.5 },
        scaleY: { from: 0, to: 1.5 },
        duration: 300,
        ease: 'Back.easeOut',
        onComplete: () => {
          if (this.waveText) {
            this.tweens.add({
              targets: this.waveText,
              scaleX: 1,
              scaleY: 1,
              duration: 200,
              ease: 'Sine.easeInOut',
            });
          }
        },
      });
    }
  }

  /** Show score summary before wave text. */
  private showWaveScoreText(waveNumber: number, score: number): void {
    this.cleanupWaveScoreText();

    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2 - 50;

    this.waveScoreText = this.add.text(cx, cy, `Wave ${waveNumber} Complete! +${score} pts`, {
      fontSize: '24px',
      fontFamily: "'Fredoka', 'Rubik', sans-serif",
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    });
    this.waveScoreText.setOrigin(0.5, 0.5);
    this.waveScoreText.setDepth(50);

    if (!this.a11y.reduceMotion) {
      this.waveScoreText.setAlpha(0);
      this.tweens.add({
        targets: this.waveScoreText,
        alpha: 1,
        duration: 300,
        ease: 'Sine.easeOut',
      });
    }
  }

  // Wave text references
   
  private waveText: any = null;
   
  private waveScoreText: any = null;

  private cleanupWaveText(): void {
    if (this.waveText) {
      this.waveText.destroy();
      this.waveText = null;
    }
  }

  private cleanupWaveScoreText(): void {
    if (this.waveScoreText) {
      this.waveScoreText.destroy();
      this.waveScoreText = null;
    }
  }

  // ─── Grid construction (override) ──────────────────────────────────────────

  private buildBlastGrid(grid: string[][], tileStates: BlastTileState[][]): void {
    // Destroy existing tiles
    this.tiles.forEach((tile) => tile.destroy());
    this.tiles.clear();
    this.blastTiles.clear();

    this.layout = buildGridLayout(
      grid.length,
      this.scale.width,
      this.scale.height,
    );

    for (let row = 0; row < grid.length; row++) {
      for (let col = 0; col < (grid[row]?.length ?? 0); col++) {
        const letter = grid[row][col] ?? '';
        const state = tileStates[row]?.[col];
        const type = state?.type ?? 'standard';
        const hitsRemaining = state?.hitsRemaining ?? 0;
        const pos = this.layout.tiles.find((t) => t.row === row && t.col === col);
        if (!pos) continue;

        const tile = new BlastTile(this, pos.x, pos.y, letter, this.layout.tileSize, type, hitsRemaining);
        const key = `${row},${col}`;
        this.tiles.set(key, tile);
        this.blastTiles.set(key, tile);
      }
    }
  }

  // ─── Particle dispatch ─────────────────────────────────────────────────────

  private playExplosionForType(
    type: string,
    x: number,
    y: number,
    config: { reduceMotion: boolean; isLowEnd: boolean },
  ): void {
    switch (type) {
      case 'bomb':
        this.particles.playBombExplosion(this, x, y, config);
        break;
      case 'lightning':
        this.particles.playLightningStrike(this, x, y, this.scale.height, config);
        break;
      case 'prism':
        this.particles.playPrismDetonation(this, x, y, this.scale.width, this.scale.height, config);
        break;
      case 'gem':
        this.particles.playGemCollect(this, x, y, config);
        break;
      case 'magnet':
        this.particles.playMagnetPull(this, x, y, [], config);
        break;
      case 'cascade':
        this.particles.playCascadeExplosion(this, x, y, config);
        break;
      default:
        this.particles.playWordClearBurst(this, x, y, 0xffe135, 1, config);
        break;
    }
  }

  // ─── Living background ─────────────────────────────────────────────────────

  private createBackgroundLayers(): void {
    this.createBackgroundGradient();

    if (!this.a11y.reduceMotion && !this.a11y.isLowEnd) {
      this.createAmbientParticles();
    }

    if (!this.a11y.reduceMotion) {
      this.createVignette();
    }
  }

  /** Radial gradient: dark navy center → darker edges using concentric circles. */
  private createBackgroundGradient(): void {
    this.backgroundGradient = this.make.graphics({ x: 0, y: 0 });
    this.add.existing(this.backgroundGradient);
    this.backgroundGradient.setDepth(-2);

    this.drawGradient();
  }

  private drawGradient(): void {
    if (!this.backgroundGradient) return;

    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;
    const maxRadius = Math.max(this.scale.width, this.scale.height) * 0.8;

    this.backgroundGradient.clear();

    // Draw from outer (dark) to inner (lighter) — concentric filled circles
    for (let i = BG_GRADIENT_STEPS; i >= 0; i--) {
      const t = i / BG_GRADIENT_STEPS;
      const radius = maxRadius * t;

      // Interpolate color from edge to center
      const r = lerp((BG_EDGE_COLOR >> 16) & 0xff, (BG_CENTER_COLOR >> 16) & 0xff, 1 - t);
      const g = lerp((BG_EDGE_COLOR >> 8) & 0xff, (BG_CENTER_COLOR >> 8) & 0xff, 1 - t);
      const b = lerp(BG_EDGE_COLOR & 0xff, BG_CENTER_COLOR & 0xff, 1 - t);
      const color = (r << 16) | (g << 8) | b;

      this.backgroundGradient.fillStyle(color, 0.2);
      this.backgroundGradient.fillCircle(cx, cy, radius);
    }
  }

  /** Tiny white dots drifting upward — subtle and ambient. */
  private createAmbientParticles(): void {
    const w = this.scale.width;
    const h = this.scale.height;

    this.ambientEmitter = this.add.particles(0, 0, 'tile-base', {
      speed: { min: 10, max: 25 },
      angle: { min: 250, max: 290 },
      scale: { start: 0.08, end: 0 },
      alpha: { start: 0.2, end: 0 },
      lifespan: 5000,
      tint: 0xffffff,
      quantity: 1,
      frequency: 400,
      blendMode: 1, // ADD
      emitZone: {
        type: 'random',
        source: {
          getRandomPoint: (p: { x: number; y: number }) => {
            p.x = Math.random() * w;
            p.y = h * 0.2 + Math.random() * h * 0.8;
            return p;
          },
        },
      },
    }) as unknown as typeof this.ambientEmitter;

    // Set depth behind tiles but above gradient
    if (this.ambientEmitter && 'setDepth' in this.ambientEmitter) {
      (this.ambientEmitter as unknown as { setDepth: (d: number) => void }).setDepth(-1);
    }
  }

  /** Darkened edges vignette — intensifies during danger, lightens during high combo. */
  private createVignette(): void {
    this.vignetteOverlay = this.make.graphics({ x: 0, y: 0 });
    this.add.existing(this.vignetteOverlay);
    this.vignetteOverlay.setDepth(100);
    this.vignetteOverlay.setAlpha(VIGNETTE_DEFAULT_ALPHA);

    this.drawVignette();
  }

  private drawVignette(): void {
    if (!this.vignetteOverlay) return;

    const w = this.scale.width;
    const h = this.scale.height;

    this.vignetteOverlay.clear();

    // Draw darkened corners using filled rectangles with alpha gradient
    const cornerSize = Math.max(w, h) * 0.4;

    // Top-left
    this.vignetteOverlay.fillStyle(0x000000, 0.4);
    this.vignetteOverlay.fillRect(0, 0, cornerSize, cornerSize);
    // Top-right
    this.vignetteOverlay.fillRect(w - cornerSize, 0, cornerSize, cornerSize);
    // Bottom-left
    this.vignetteOverlay.fillRect(0, h - cornerSize, cornerSize, cornerSize);
    // Bottom-right
    this.vignetteOverlay.fillRect(w - cornerSize, h - cornerSize, cornerSize, cornerSize);
  }

  /** Update background state based on gameplay — combo level, fire round, cascade. */
  updateBackgroundState(comboLevel: number, isFireRound: boolean, _isCascading: boolean): void {
    // Vignette reactivity
    if (this.vignetteOverlay && !this.a11y.reduceMotion) {
      let targetAlpha = VIGNETTE_DEFAULT_ALPHA;
      if (isFireRound) targetAlpha = 0.3;
      else if (comboLevel >= 7) targetAlpha = 0.05;

      this.tweens.add({
        targets: this.vignetteOverlay,
        alpha: targetAlpha,
        duration: 300,
        ease: 'Sine.easeInOut',
      });
    }
  }

  private cleanupBackgroundLayers(): void {
    if (this.backgroundGradient) {
      this.backgroundGradient.destroy();
      this.backgroundGradient = null;
    }
    if (this.ambientEmitter) {
      this.ambientEmitter.destroy();
      this.ambientEmitter = null;
    }
    if (this.vignetteOverlay) {
      this.vignetteOverlay.destroy();
      this.vignetteOverlay = null;
    }
  }

  // ─── Cleanup ───────────────────────────────────────────────────────────────

  destroy(): void {
    this.unsubscribeBlastBridge();
    this.cascadeHighlight.clearHighlight();
    this.scorePopups.cleanup();
    this.cleanupCascadeText();
    this.cleanupWaveText();
    this.cleanupWaveScoreText();
    this.cleanupMilestoneText();
    this.cleanupBackgroundLayers();
    if (this.radialGlow) {
      this.radialGlow.destroy();
      this.radialGlow = null;
    }
    this.blastTiles.clear();
    super.destroy();
  }
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function lerp(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}
