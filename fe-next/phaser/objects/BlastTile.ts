/**
 * BlastTile — extends LetterTile with blast mode special tile visuals.
 *
 * Adds an overlay graphics layer for tile-type tints, border colours,
 * glow effects, and a badge text label (e.g. "3×", "+5").
 * Multi-hit tiles (ice, prism, gem, frozen) show cracked/weakened states.
 */

import Phaser from 'phaser';
import { LetterTile, type IdleAnimationOptions } from './LetterTile';
import {
  getBlastTileTint,
  getBlastTileBorderColor,
  getBlastTileGlowConfig,
  BLAST_TILE_CONFIGS,
} from '@/lib/phaser/logic/BlastTileRules';
import type { BlastTileType } from '@/components/blast/types';

// ─── Clear animation options ────────────────────────────────────────────────

export interface ClearAnimationOptions {
  reduceMotion?: boolean;
  isLowEnd?: boolean;
}

// ─── Constants ───────────────────────────────────────────────────────────────

// ─── Clear animation tuning ─────────────────────────────────────────────────

const STANDARD_PARTICLE_COUNT = 6;
const SPECIAL_PARTICLE_COUNT = 12;
const SQUASH_DURATION = 80;
const CLEAR_DURATION = 200;
const TUMBLE_ANGLE = 45; // degrees

/** Particle color per tile type (use tint color) */
function getClearParticleColor(type: BlastTileType): number {
  return getBlastTileTint(type);
}

function clearParticleCount(type: BlastTileType, isLowEnd: boolean): number {
  const base = type === 'standard' ? STANDARD_PARTICLE_COUNT : SPECIAL_PARTICLE_COUNT;
  return isLowEnd ? Math.ceil(base / 2) : base;
}

/** Create a tiny circle texture for particles (reuses existing if present). */
function ensureClearTexture(scene: Phaser.Scene, key: string, color: number, size = 4): void {
  if (scene.textures.exists(key)) return;
  const g = scene.make.graphics({ x: 0, y: 0 });
  g.fillStyle(color, 1);
  g.fillCircle(size, size, size);
  g.generateTexture(key, size * 2, size * 2);
  g.destroy();
}

// ─── Overlay constants ──────────────────────────────────────────────────────

const OVERLAY_ALPHA = 0.45;
const OVERLAY_ALPHA_CRACKED = 0.25;
const CORNER_RADIUS = 8;
const BADGE_FONT_SIZE_RATIO = 0.22;
const BADGE_OFFSET_RATIO = 0.35; // Position badge at bottom-right
const COMBO_GLOW_PULSE_DURATION = 600;
const COMBO_GLOW_ALPHA_RANGE = 0.1; // oscillation ±0.1

// ─── BlastTile ──────────────────────────────────────────────────────────────

export class BlastTile extends LetterTile {
  private overlay: Phaser.GameObjects.Graphics | null = null;
  private badge: Phaser.GameObjects.Text | null = null;
  private comboGlow: Phaser.GameObjects.Graphics | null = null;
  private blastType: BlastTileType;
  private hitsRemaining: number;
  private readonly blastTileSize: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    letter: string,
    tileSize: number,
    type: BlastTileType = 'standard',
    hitsRemaining = 0,
  ) {
    super(scene, x, y, letter, tileSize);

    this.blastType = type;
    this.hitsRemaining = hitsRemaining;
    this.blastTileSize = tileSize;

    if (type !== 'standard') {
      this.createOverlay();
      this.createBadge();
      this.drawOverlay();
    }
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  getTileType(): BlastTileType {
    return this.blastType;
  }

  getHitsRemaining(): number {
    return this.hitsRemaining;
  }

  /** Apply a combo-level glow ring around the tile with pulsing alpha. */
  setComboGlow(color: number, alpha: number): void {
    // Clean up previous glow if any
    if (this.comboGlow) {
      this.scene.tweens.killTweensOf(this.comboGlow);
      this.comboGlow.destroy();
    }

    this.comboGlow = this.scene.make.graphics({ x: 0, y: 0 });
    this.add(this.comboGlow);

    const radius = this.blastTileSize * 0.55;
    this.comboGlow.fillStyle(color, alpha);
    this.comboGlow.fillCircle(0, 0, radius);

    // Pulse animation: alpha oscillates ±COMBO_GLOW_ALPHA_RANGE
    this.scene.tweens.add({
      targets: this.comboGlow,
      alpha: { from: alpha, to: Math.max(0, alpha - COMBO_GLOW_ALPHA_RANGE) },
      duration: COMBO_GLOW_PULSE_DURATION,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });
  }

  /** Remove combo glow and stop its pulse tween. */
  clearComboGlow(): void {
    if (!this.comboGlow) return;
    this.scene.tweens.killTweensOf(this.comboGlow);
    this.comboGlow.destroy();
    this.comboGlow = null;
  }

  /** Update the tile's special type and redraw overlay graphics. */
  updateTileType(type: BlastTileType, hitsRemaining: number): void {
    this.blastType = type;
    this.hitsRemaining = hitsRemaining;

    if (type === 'standard') {
      this.removeOverlay();
      return;
    }

    if (!this.overlay) {
      this.createOverlay();
      this.createBadge();
    }

    this.drawOverlay();
  }

  // ─── Idle animation overrides ──────────────────────────────────────────────

  /** Override to add type-specific idle animation after breathing. */
  override startIdleAnimations(options: IdleAnimationOptions = {}): void {
    super.startIdleAnimations(options);
    if (options.reduceMotion) return;
    if (options.isLowEnd) return;
    this.startTypeSpecificTween();
  }

  /** Restart idle tweens including type-specific. */
  protected override restartIdleTweens(): void {
    super.restartIdleTweens();
    if (this.idleOptions.isLowEnd) return;
    this.startTypeSpecificTween();
  }

  private startTypeSpecificTween(): void {
    if (this.blastType === 'standard') return;

    switch (this.blastType) {
      case 'bomb':
        // Wobble: gentle rotation oscillation
        this.scene.tweens.add({
          targets: this,
          angle: { from: -2, to: 2 },
          duration: 400,
          ease: 'Sine.easeInOut',
          yoyo: true,
          repeat: -1,
          _idleType: 'wobble',
        } as Phaser.Types.Tweens.TweenBuilderConfig & { _idleType: string });
        break;

      case 'ice':
      case 'frozen':
        // Shimmer: overlay alpha pulse
        this.scene.tweens.add({
          targets: this.overlay,
          alpha: { from: 1, to: 0.6 },
          duration: 1000,
          ease: 'Sine.easeInOut',
          yoyo: true,
          repeat: -1,
          _idleType: 'shimmer',
        } as Phaser.Types.Tweens.TweenBuilderConfig & { _idleType: string });
        break;

      case 'prism':
      case 'rainbow':
        // Rainbow color cycling via tween counter
        this.scene.tweens.addCounter({
          from: 0,
          to: 360,
          duration: 2000,
          repeat: -1,
        });
        break;

      case 'gem':
        // Gentle bounce (y offset oscillation)
        this.scene.tweens.add({
          targets: this.badge,
          y: { from: this.blastTileSize * 0.35, to: this.blastTileSize * 0.35 - 3 },
          duration: 600,
          ease: 'Sine.easeInOut',
          yoyo: true,
          repeat: -1,
        });
        break;

      case 'lightning':
        // Flicker: rapid alpha pulse
        this.scene.tweens.add({
          targets: this.overlay,
          alpha: { from: 1, to: 0.3 },
          duration: 200,
          ease: 'Stepped',
          yoyo: true,
          repeat: -1,
          _idleType: 'flicker',
        } as Phaser.Types.Tweens.TweenBuilderConfig & { _idleType: string });
        break;

      case 'magnet':
        // Slow continuous rotation
        this.scene.tweens.add({
          targets: this.badge,
          angle: { from: 0, to: 360 },
          duration: 3000,
          repeat: -1,
          _idleType: 'rotate',
        } as Phaser.Types.Tweens.TweenBuilderConfig & { _idleType: string });
        break;

      case 'gold':
        // Gold: gentle glow pulse on overlay
        this.scene.tweens.add({
          targets: this.overlay,
          alpha: { from: 1, to: 0.7 },
          duration: 800,
          ease: 'Sine.easeInOut',
          yoyo: true,
          repeat: -1,
        });
        break;

      case 'mirror':
        // Reflective shimmer — alpha oscillation on overlay (avoiding scaleX flip for RTL compat)
        this.scene.tweens.add({
          targets: this.overlay,
          alpha: { from: 1, to: 0.4 },
          duration: 1500,
          ease: 'Sine.easeInOut',
          yoyo: true,
          repeat: -1,
          _idleType: 'mirror-shimmer',
        } as Phaser.Types.Tweens.TweenBuilderConfig & { _idleType: string });
        break;

      case 'silver':
        // Metallic gleam — quick alpha flash on overlay
        this.scene.tweens.add({
          targets: this.overlay,
          alpha: { from: 1, to: 0.5 },
          duration: 1200,
          ease: 'Sine.easeInOut',
          yoyo: true,
          repeat: -1,
          _idleType: 'gleam',
        } as Phaser.Types.Tweens.TweenBuilderConfig & { _idleType: string });
        break;

      case 'diamond':
        // Sparkle — scale pulse (slightly larger than breathing)
        this.scene.tweens.add({
          targets: this,
          scaleX: { from: 1, to: 1.06 },
          scaleY: { from: 1, to: 1.06 },
          duration: 2000,
          ease: 'Sine.easeInOut',
          yoyo: true,
          repeat: -1,
          _idleType: 'diamond-sparkle',
        } as Phaser.Types.Tweens.TweenBuilderConfig & { _idleType: string });
        break;
    }
  }

  /** Play a juicy clear animation with squash-stretch, rotation, and particles. */
  playClearAnimation(options: ClearAnimationOptions = {}): Promise<void> {
    const { reduceMotion = false, isLowEnd = false } = options;

    if (reduceMotion) {
      // Simple fade — no squash, rotation, or particles (all types)
      return new Promise<void>((resolve) => {
        this.scene.tweens.add({
          targets: this,
          alpha: { from: 1, to: 0 },
          duration: CLEAR_DURATION,
          ease: 'Quad.easeIn',
          onComplete: () => {
            this.startClearing();
            resolve();
          },
        });
      });
    }

    return this.playClearByType(isLowEnd);
  }

  /** Dispatch per-type death animation. Default is the generic squash+rotate+fade. */
  private playClearByType(isLowEnd: boolean): Promise<void> {
    switch (this.blastType) {
      case 'bomb':
        return this.playExplosiveDeath(isLowEnd);
      case 'ice':
        return this.playShatterDeath(isLowEnd);
      case 'lightning':
        return this.playZapDeath(isLowEnd);
      case 'prism':
        return this.playRefractDeath(isLowEnd);
      case 'rainbow':
        return this.playDissolveDeath(isLowEnd);
      case 'gem':
        return this.playSparkDeath(isLowEnd);
      case 'frozen':
        return this.playMeltDeath(isLowEnd);
      case 'gold':
      case 'silver':
      case 'diamond':
        return this.playGoldBurstDeath(isLowEnd);
      case 'magnet':
        return this.playMagneticPulseDeath(isLowEnd);
      case 'mirror':
        return this.playMirrorShatterDeath(isLowEnd);
      default:
        return this.playGenericDeath(isLowEnd);
    }
  }

  /** Generic squash+rotate+fade — used for standard tiles and unknown types. */
  private playGenericDeath(isLowEnd: boolean): Promise<void> {
    this.emitClearParticles(isLowEnd);
    return new Promise<void>((resolve) => {
      this.scene.tweens.add({
        targets: this,
        scaleX: { from: 1, to: 1.3 },
        scaleY: { from: 1, to: 0.7 },
        duration: SQUASH_DURATION,
        ease: 'Quad.easeOut',
        onComplete: () => {
          this.scene.tweens.add({
            targets: this,
            scaleX: { from: 0.7, to: 1.3 },
            scaleY: { from: 1.3, to: 0.7 },
            alpha: { from: 1, to: 0 },
            angle: { from: 0, to: TUMBLE_ANGLE },
            duration: CLEAR_DURATION,
            ease: 'Quad.easeIn',
            onComplete: () => {
              this.startClearing();
              resolve();
            },
          });
        },
      });
    });
  }

  /** Bomb: explosive burst — large scale expansion (>= 1.5x) + fade. */
  private playExplosiveDeath(isLowEnd: boolean): Promise<void> {
    this.emitClearParticles(isLowEnd);
    return new Promise<void>((resolve) => {
      this.scene.tweens.add({
        targets: this,
        scaleX: { from: 1, to: 1.3 },
        scaleY: { from: 1, to: 0.7 },
        duration: SQUASH_DURATION,
        ease: 'Quad.easeOut',
        onComplete: () => {
          this.scene.tweens.add({
            targets: this,
            scaleX: { from: 0.7, to: 1.8 },
            scaleY: { from: 1.3, to: 1.8 },
            alpha: { from: 1, to: 0 },
            duration: CLEAR_DURATION,
            ease: 'Expo.easeOut',
            onComplete: () => {
              this.startClearing();
              resolve();
            },
          });
        },
      });
    });
  }

  /** Ice: shatter spin — high-angle rotation (>= 90 deg) + fade. */
  private playShatterDeath(isLowEnd: boolean): Promise<void> {
    this.emitClearParticles(isLowEnd);
    return new Promise<void>((resolve) => {
      this.scene.tweens.add({
        targets: this,
        scaleX: { from: 1, to: 1.2 },
        scaleY: { from: 1, to: 0.8 },
        duration: SQUASH_DURATION,
        ease: 'Quad.easeOut',
        onComplete: () => {
          this.scene.tweens.add({
            targets: this,
            alpha: { from: 1, to: 0 },
            angle: { from: 0, to: 120 },
            duration: CLEAR_DURATION,
            ease: 'Quad.easeIn',
            onComplete: () => {
              this.startClearing();
              resolve();
            },
          });
        },
      });
    });
  }

  /** Lightning: zap flash — rapid alpha pulses then fade. */
  private playZapDeath(isLowEnd: boolean): Promise<void> {
    this.emitClearParticles(isLowEnd);
    return new Promise<void>((resolve) => {
      // Flash 1
      this.scene.tweens.add({
        targets: this,
        alpha: { from: 1, to: 0.1 },
        duration: 40,
        ease: 'Stepped',
        onComplete: () => {
          // Flash 2
          this.scene.tweens.add({
            targets: this,
            alpha: { from: 0.1, to: 1 },
            duration: 40,
            ease: 'Stepped',
            onComplete: () => {
              // Flash 3 + fade out
              this.scene.tweens.add({
                targets: this,
                alpha: { from: 1, to: 0 },
                duration: 40,
                ease: 'Stepped',
                onComplete: () => {
                  this.scene.tweens.add({
                    targets: this,
                    alpha: { from: 0, to: 0 },
                    duration: CLEAR_DURATION - 120,
                    onComplete: () => {
                      this.startClearing();
                      resolve();
                    },
                  });
                },
              });
            },
          });
        },
      });
    });
  }

  /** Prism: refraction burst — symmetric scale expansion (both axes >= 1.2x) + fade. */
  private playRefractDeath(isLowEnd: boolean): Promise<void> {
    this.emitClearParticles(isLowEnd);
    return new Promise<void>((resolve) => {
      this.scene.tweens.add({
        targets: this,
        scaleX: { from: 1, to: 0.9 },
        scaleY: { from: 1, to: 0.9 },
        duration: SQUASH_DURATION,
        ease: 'Quad.easeOut',
        onComplete: () => {
          this.scene.tweens.add({
            targets: this,
            scaleX: { from: 0.9, to: 1.4 },
            scaleY: { from: 0.9, to: 1.4 },
            alpha: { from: 1, to: 0 },
            duration: CLEAR_DURATION,
            ease: 'Expo.easeOut',
            onComplete: () => {
              this.startClearing();
              resolve();
            },
          });
        },
      });
    });
  }

  /** Rainbow: dissolve — pure alpha fade, NO rotation. */
  private playDissolveDeath(isLowEnd: boolean): Promise<void> {
    this.emitClearParticles(isLowEnd);
    return new Promise<void>((resolve) => {
      this.scene.tweens.add({
        targets: this,
        alpha: { from: 1, to: 0 },
        duration: CLEAR_DURATION + SQUASH_DURATION,
        ease: 'Sine.easeIn',
        onComplete: () => {
          this.startClearing();
          resolve();
        },
      });
    });
  }

  /** Gem: sparkle burst — small squash + extra particles. */
  private playSparkDeath(isLowEnd: boolean): Promise<void> {
    // Emit standard particles
    this.emitClearParticles(isLowEnd);
    return new Promise<void>((resolve) => {
      this.scene.tweens.add({
        targets: this,
        scaleX: { from: 1, to: 1.1 },
        scaleY: { from: 1, to: 0.9 },
        duration: SQUASH_DURATION,
        ease: 'Quad.easeOut',
        onComplete: () => {
          this.scene.tweens.add({
            targets: this,
            scaleX: { from: 0.9, to: 1.2 },
            scaleY: { from: 1.1, to: 1.2 },
            alpha: { from: 1, to: 0 },
            duration: CLEAR_DURATION,
            ease: 'Quad.easeIn',
            onComplete: () => {
              this.startClearing();
              resolve();
            },
          });
        },
      });
    });
  }

  /** Frozen: icy melt — gentle angle rotation (30deg) + slow alpha fade. */
  private playMeltDeath(isLowEnd: boolean): Promise<void> {
    this.emitClearParticles(isLowEnd);
    return new Promise<void>((resolve) => {
      this.scene.tweens.add({
        targets: this,
        alpha: { from: 1, to: 0 },
        angle: { from: 0, to: 30 },
        duration: CLEAR_DURATION + SQUASH_DURATION,
        ease: 'Sine.easeInOut',
        onComplete: () => {
          this.startClearing();
          resolve();
        },
      });
    });
  }

  /** Gold/Silver/Diamond: medium scale expansion + fade. */
  private playGoldBurstDeath(isLowEnd: boolean): Promise<void> {
    this.emitClearParticles(isLowEnd);
    return new Promise<void>((resolve) => {
      this.scene.tweens.add({
        targets: this,
        scaleX: { from: 1, to: 1.2 },
        scaleY: { from: 1, to: 0.85 },
        duration: SQUASH_DURATION,
        ease: 'Quad.easeOut',
        onComplete: () => {
          this.scene.tweens.add({
            targets: this,
            scaleX: { from: 0.85, to: 1.3 },
            scaleY: { from: 1.2, to: 1.3 },
            alpha: { from: 1, to: 0 },
            duration: CLEAR_DURATION,
            ease: 'Quad.easeIn',
            onComplete: () => {
              this.startClearing();
              resolve();
            },
          });
        },
      });
    });
  }

  /** Magnet: full 360 spin + fade. */
  private playMagneticPulseDeath(isLowEnd: boolean): Promise<void> {
    this.emitClearParticles(isLowEnd);
    return new Promise<void>((resolve) => {
      this.scene.tweens.add({
        targets: this,
        alpha: { from: 1, to: 0 },
        angle: { from: 0, to: 360 },
        duration: CLEAR_DURATION + SQUASH_DURATION,
        ease: 'Quad.easeIn',
        onComplete: () => {
          this.startClearing();
          resolve();
        },
      });
    });
  }

  /** Mirror: scaleX flip shatter — scaleX to -1 then fade. */
  private playMirrorShatterDeath(isLowEnd: boolean): Promise<void> {
    this.emitClearParticles(isLowEnd);
    return new Promise<void>((resolve) => {
      this.scene.tweens.add({
        targets: this,
        scaleX: { from: 1, to: -1 },
        duration: SQUASH_DURATION,
        ease: 'Quad.easeOut',
        onComplete: () => {
          this.scene.tweens.add({
            targets: this,
            scaleX: { from: -1, to: -1.3 },
            alpha: { from: 1, to: 0 },
            duration: CLEAR_DURATION,
            ease: 'Quad.easeIn',
            onComplete: () => {
              this.startClearing();
              resolve();
            },
          });
        },
      });
    });
  }

  /** Emit directional particles colored by tile type. */
  private emitClearParticles(isLowEnd: boolean): void {
    const color = getClearParticleColor(this.blastType);
    const key = `particle-clear-${this.blastType}`;
    ensureClearTexture(this.scene, key, color);

    const qty = clearParticleCount(this.blastType, isLowEnd);

    this.scene.add.particles(this.x, this.y, key, {
      speed: { min: 40, max: 140 },
      scale: { start: 0.6, end: 0 },
      lifespan: 400,
      quantity: qty,
      blendMode: Phaser.BlendModes.ADD,
      emitting: false,
    });
  }

  // ─── Private ───────────────────────────────────────────────────────────────

  private createOverlay(): void {
    this.overlay = this.scene.make.graphics({ x: 0, y: 0 });
    this.add(this.overlay);
  }

  private createBadge(): void {
    const fontSize = Math.floor(this.blastTileSize * BADGE_FONT_SIZE_RATIO);
    this.badge = this.scene.make.text({
      x: this.blastTileSize * BADGE_OFFSET_RATIO,
      y: this.blastTileSize * BADGE_OFFSET_RATIO,
      text: '',
      style: {
        fontSize: `${fontSize}px`,
        fontFamily: "Arial, Helvetica, sans-serif",
        color: '#ffffff',
        fontStyle: 'bold',
      },
    });
    this.badge.setOrigin(0.5, 0.5);
    this.add(this.badge);
  }

  private drawOverlay(): void {
    if (!this.overlay) return;

    const half = this.blastTileSize / 2;
    const tint = getBlastTileTint(this.blastType);
    const borderColor = getBlastTileBorderColor(this.blastType);
    const glow = getBlastTileGlowConfig(this.blastType, this.hitsRemaining);

    // Determine overlay alpha based on cracked state
    const isCracked = this.isCrackedState();
    const overlayAlpha = isCracked ? OVERLAY_ALPHA_CRACKED : OVERLAY_ALPHA;

    this.overlay.clear();

    // Tinted fill overlay
    this.overlay.fillStyle(tint, overlayAlpha);
    this.overlay.fillRoundedRect(-half, -half, this.blastTileSize, this.blastTileSize, CORNER_RADIUS);

    // Border overlay
    this.overlay.lineStyle(2, borderColor, 0.7);
    this.overlay.strokeRoundedRect(-half, -half, this.blastTileSize, this.blastTileSize, CORNER_RADIUS);

    // Glow ring (if tile has glow)
    if (glow.intensity > 0) {
      this.overlay.fillStyle(glow.color, glow.intensity * 0.3);
      this.overlay.fillCircle(0, 0, glow.radius);
    }

    // Update badge text (wildcard is never spawned and has no config entry)
    if (this.badge && this.blastType !== 'standard' && this.blastType !== 'wildcard') {
      const config = BLAST_TILE_CONFIGS[this.blastType];
      this.badge.setText(config.badgeText);
    }
  }

  private isCrackedState(): boolean {
    switch (this.blastType) {
      case 'ice': return this.hitsRemaining <= 1;
      case 'frozen': return this.hitsRemaining <= 2;
      case 'prism': return this.hitsRemaining <= 1;
      case 'gem': return this.hitsRemaining <= 2;
      default: return false;
    }
  }

  private removeOverlay(): void {
    if (this.overlay) {
      this.overlay.clear();
      this.overlay.destroy();
      this.overlay = null;
    }
    if (this.badge) {
      this.badge.destroy();
      this.badge = null;
    }
  }
}
