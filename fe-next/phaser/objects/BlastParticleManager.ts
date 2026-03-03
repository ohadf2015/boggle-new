/**
 * BlastParticleManager — unique particle effects per blast tile type.
 *
 * All effects respect config.reduceMotion (skip) and config.isLowEnd (halve).
 * Uses scene.add.particles() to create emitters, auto-destroyed after lifespan.
 * Enhanced effects (shockwaves, bolts, beams) are in BlastEnhancedEffects.ts.
 */

import Phaser from 'phaser';
import { getExplosionColor } from '@/lib/phaser/logic/BlastTileRules';
import * as Enhanced from './BlastEnhancedEffects';

// ─── Config ──────────────────────────────────────────────────────────────────

export interface ParticleConfig {
  reduceMotion: boolean;
  isLowEnd: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function particleCount(base: number, config: ParticleConfig): number {
  return config.isLowEnd ? Math.ceil(base / 2) : base;
}

/** Generate a texture key for a tiny circle particle (creates once, reuses). */
function ensureParticleTexture(scene: Phaser.Scene, key: string, color: number, size = 4): void {
  if (scene.textures.exists(key)) return;

  const g = scene.make.graphics({ x: 0, y: 0 });
  g.fillStyle(color, 1);
  g.fillCircle(size, size, size);
  g.generateTexture(key, size * 2, size * 2);
  g.destroy();
}

/** Generate a rectangle texture (more festive for dust/confetti). */
function ensureRectTexture(scene: Phaser.Scene, key: string, color: number, w = 6, h = 3): void {
  if (scene.textures.exists(key)) return;

  const g = scene.make.graphics({ x: 0, y: 0 });
  g.fillStyle(color, 1);
  g.fillRect(0, 0, w, h);
  g.generateTexture(key, w, h);
  g.destroy();
}

// ─── BlastParticleManager ───────────────────────────────────────────────────

export class BlastParticleManager {

  /** Orange/red radial burst + camera shake. */
  playBombExplosion(scene: Phaser.Scene, x: number, y: number, config: ParticleConfig): void {
    if (config.reduceMotion) return;

    const color = getExplosionColor('bomb');
    const key = 'particle-bomb';
    ensureParticleTexture(scene, key, color);

    scene.add.particles(x, y, key, {
      speed: { min: 50, max: 200 },
      scale: { start: 1, end: 0 },
      lifespan: 600,
      quantity: particleCount(20, config),
      blendMode: Phaser.BlendModes.ADD,
      emitting: false,
    });
  }

  /** Yellow vertical streak down the column. */
  playLightningStrike(scene: Phaser.Scene, x: number, y: number, columnHeight: number, config: ParticleConfig): void {
    if (config.reduceMotion) return;

    const color = getExplosionColor('lightning');
    const key = 'particle-lightning';
    ensureParticleTexture(scene, key, color);

    scene.add.particles(x, y, key, {
      speedY: { min: 100, max: 300 },
      speedX: { min: -20, max: 20 },
      scale: { start: 0.8, end: 0 },
      lifespan: 400,
      quantity: particleCount(15, config),
      emitZone: { type: 'random', source: { getRandomPoint: (p: { x: number; y: number }) => { p.x = 0; p.y = Math.random() * columnHeight; return p; } } },
      blendMode: Phaser.BlendModes.ADD,
      emitting: false,
    });
  }

  /** White/blue crystalline fragments with gravity. */
  playIceShatter(scene: Phaser.Scene, x: number, y: number, config: ParticleConfig): void {
    if (config.reduceMotion) return;

    const key = 'particle-ice';
    ensureParticleTexture(scene, key, 0x96dcff);

    scene.add.particles(x, y, key, {
      speed: { min: 30, max: 120 },
      scale: { start: 0.6, end: 0 },
      lifespan: 500,
      gravityY: 200,
      quantity: particleCount(12, config),
      blendMode: Phaser.BlendModes.ADD,
      emitting: false,
    });
  }

  /** Rainbow cross-shaped refraction. */
  playPrismDetonation(scene: Phaser.Scene, x: number, y: number, w: number, h: number, config: ParticleConfig): void {
    if (config.reduceMotion) return;

    const color = getExplosionColor('prism');
    const key = 'particle-prism';
    ensureParticleTexture(scene, key, color);

    scene.add.particles(x, y, key, {
      speed: { min: 60, max: 180 },
      scale: { start: 0.8, end: 0 },
      lifespan: 700,
      quantity: particleCount(24, config),
      blendMode: Phaser.BlendModes.ADD,
      emitting: false,
    });
  }

  /** Emerald sparkle upward drift. */
  playGemCollect(scene: Phaser.Scene, x: number, y: number, config: ParticleConfig): void {
    if (config.reduceMotion) return;

    const color = getExplosionColor('gem');
    const key = 'particle-gem';
    ensureParticleTexture(scene, key, color);

    scene.add.particles(x, y, key, {
      speedY: { min: -80, max: -30 },
      speedX: { min: -30, max: 30 },
      scale: { start: 0.5, end: 0 },
      lifespan: 800,
      quantity: particleCount(10, config),
      blendMode: Phaser.BlendModes.ADD,
      emitting: false,
    });
  }

  /** Purple trails toward magnet position. */
  playMagnetPull(scene: Phaser.Scene, x: number, y: number, targets: Array<{ x: number; y: number }>, config: ParticleConfig): void {
    if (config.reduceMotion) return;

    const color = getExplosionColor('magnet');
    const key = 'particle-magnet';
    ensureParticleTexture(scene, key, color);

    // One emitter at source, trails toward each target
    scene.add.particles(x, y, key, {
      speed: { min: 40, max: 100 },
      scale: { start: 0.6, end: 0 },
      lifespan: 500,
      quantity: particleCount(8 * targets.length, config),
      blendMode: Phaser.BlendModes.ADD,
      emitting: false,
    });
  }

  /** Golden sparkle shower. */
  playGoldSparkle(scene: Phaser.Scene, x: number, y: number, config: ParticleConfig): void {
    if (config.reduceMotion) return;

    const key = 'particle-gold';
    ensureParticleTexture(scene, key, 0xffd700);

    scene.add.particles(x, y, key, {
      speedY: { min: -60, max: -20 },
      speedX: { min: -40, max: 40 },
      scale: { start: 0.5, end: 0 },
      lifespan: 600,
      quantity: particleCount(12, config),
      blendMode: Phaser.BlendModes.ADD,
      emitting: false,
    });
  }

  /** Magenta vertical sweep for cascade. */
  playCascadeExplosion(scene: Phaser.Scene, x: number, y: number, config: ParticleConfig): void {
    if (config.reduceMotion) return;

    const color = getExplosionColor('cascade');
    const key = 'particle-cascade';
    ensureParticleTexture(scene, key, color);

    scene.add.particles(x, y, key, {
      speed: { min: 40, max: 150 },
      scale: { start: 0.7, end: 0 },
      lifespan: 500,
      quantity: particleCount(16, config),
      blendMode: Phaser.BlendModes.ADD,
      emitting: false,
    });
  }

  /** Combo-colored generic word clear burst. */
  playWordClearBurst(scene: Phaser.Scene, x: number, y: number, color: number, intensity: number, config: ParticleConfig): void {
    if (config.reduceMotion) return;

    const key = `particle-word-${color.toString(16)}`;
    ensureParticleTexture(scene, key, color);

    scene.add.particles(x, y, key, {
      speed: { min: 30, max: 100 + intensity * 30 },
      scale: { start: 0.5 + intensity * 0.1, end: 0 },
      lifespan: 400 + intensity * 100,
      quantity: particleCount(8 + intensity * 4, config),
      blendMode: Phaser.BlendModes.ADD,
      emitting: false,
    });
  }

  /**
   * Dust cloud on tile landing after gravity fall.
   * Medium falls (3-4): small cloud (~4 particles).
   * Heavy falls (5+): big cloud (~12 particles).
   * Uses rectangle shapes for a more organic dust feel.
   */
  playLandingDust(scene: Phaser.Scene, x: number, y: number, fallDistance: number, config: ParticleConfig): void {
    if (config.reduceMotion) return;

    const key = 'particle-dust';
    ensureRectTexture(scene, key, 0xc8b88a); // sandy brown dust color

    const baseCount = fallDistance >= 5 ? 12 : 4;

    scene.add.particles(x, y, key, {
      speedX: { min: -40, max: 40 },
      speedY: { min: -30, max: -10 },
      scale: { start: 0.8, end: 0 },
      lifespan: 500,
      gravityY: 150,
      quantity: particleCount(baseCount, config),
      rotate: { min: 0, max: 360 },
      emitting: false,
    });
  }

  /**
   * Confetti burst for wave transitions.
   * Multi-colored rectangles with gravity — festive celebration.
   */
  playConfetti(scene: Phaser.Scene, x: number, y: number, config: ParticleConfig): void {
    if (config.reduceMotion) return;

    const colors = [0xff1493, 0xffe135, 0x00ffff, 0xff6b35, 0x7cfc00, 0xff69b4];
    for (const color of colors) {
      const key = `particle-confetti-${color.toString(16)}`;
      ensureRectTexture(scene, key, color, 8, 4);

      scene.add.particles(x, y, key, {
        speedX: { min: -120, max: 120 },
        speedY: { min: -250, max: -80 },
        scale: { start: 1, end: 0.3 },
        lifespan: 1500,
        gravityY: 200,
        quantity: particleCount(5, config),
        rotate: { min: 0, max: 360 },
        emitting: false,
      });
    }
  }

  // ─── Enhanced effects (delegated to BlastEnhancedEffects.ts) ──────────────

  playBombShockwave(scene: Phaser.Scene, x: number, y: number, config: ParticleConfig, comboLevel = 0): void {
    Enhanced.playBombShockwave(scene, x, y, config, comboLevel);
  }

  playLightningBolt(scene: Phaser.Scene, x: number, y: number, screenHeight: number, config: ParticleConfig, comboLevel = 0): void {
    Enhanced.playLightningBolt(scene, x, y, screenHeight, config, comboLevel);
  }

  playPrismBeams(scene: Phaser.Scene, x: number, y: number, w: number, h: number, config: ParticleConfig, comboLevel = 0): void {
    Enhanced.playPrismBeams(scene, x, y, w, h, config, comboLevel);
  }

  playGemPop(scene: Phaser.Scene, x: number, y: number, config: ParticleConfig, comboLevel = 0): void {
    Enhanced.playGemPop(scene, x, y, config, comboLevel);
  }

  playIceShards(scene: Phaser.Scene, x: number, y: number, variant: 'ice' | 'frozen', config: ParticleConfig, comboLevel = 0): void {
    Enhanced.playIceShards(scene, x, y, variant, config, comboLevel);
  }

  playMagnetFieldPull(scene: Phaser.Scene, x: number, y: number, targets: Array<{ x: number; y: number }>, config: ParticleConfig, comboLevel = 0): void {
    Enhanced.playMagnetFieldPull(scene, x, y, targets, config, comboLevel);
  }

  playGoldMidasWave(scene: Phaser.Scene, x: number, y: number, config: ParticleConfig, comboLevel = 0): void {
    Enhanced.playGoldMidasWave(scene, x, y, config, comboLevel);
  }
}
