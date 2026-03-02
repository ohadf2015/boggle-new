/**
 * GravityController — Candy Crush-style gravity physics for blast mode.
 *
 * Key behaviors:
 * 1. Acceleration fall: Cubic.easeIn (starts slow, ends fast)
 * 2. Elastic landing bounce: squash/stretch with volume conservation
 * 3. Column stagger: leftmost first, 30ms per column (RTL: rightmost first)
 * 4. Compression wave: tiles below heavy landings briefly squash
 * 5. Grid settle: entire grid micro-bounces after all falls
 * 6. New tiles from above: spawn at y = -tileSize, same fall physics
 * 7. Motion stretch during fall: scaleY 1.05, scaleX 0.97
 * 8. Landing flash: 30ms white tint on impact
 */

import Phaser from 'phaser';
import {
  calcFallTweenParams,
  calcAppearParams,
  getLandingSquashScale,
  COLUMN_STAGGER_MS,
  BOUNCE_DURATION,
  BOUNCE_EASE,
  GRID_SETTLE_SCALE_Y,
  GRID_SETTLE_DURATION,
  MOTION_STRETCH_SCALE_Y,
  MOTION_STRETCH_SCALE_X,
  COMPRESSION_SCALE_Y,
  COMPRESSION_DURATION,
  COMPRESSION_THRESHOLD,
} from '@/lib/phaser/logic/BlastGravityAnimator';
import type { BlastTile } from './BlastTile';
import { BlastParticleManager, type ParticleConfig } from './BlastParticleManager';

// ─── Landing impact constants ────────────────────────────────────────────────

/** Minimum fall distance to trigger dust particles */
const DUST_THRESHOLD = 3;

/** Minimum simultaneous landings to trigger camera micro-shake */
const CAMERA_SHAKE_TILE_THRESHOLD = 3;
const CAMERA_SHAKE_DURATION = 100;
const CAMERA_SHAKE_INTENSITY = 0.003;

/** Landing flash duration in ms */
const LANDING_FLASH_MS = 30;

// ─── Types ───────────────────────────────────────────────────────────────────

interface FallingTileData {
  row: number;
  col: number;
  fromRow: number;
  fallDistance: number;
}

interface NewTileData {
  row: number;
  col: number;
  letter: string;
  type: string;
}

interface GravityControllerOptions {
  reduceMotion?: boolean;
  isRTL?: boolean;
  particleManager?: BlastParticleManager;
}

// ─── GravityController ──────────────────────────────────────────────────────

export class GravityController {
  private readonly reduceMotion: boolean;
  private readonly isRTL: boolean;
  private readonly particles: BlastParticleManager | null;

  constructor(options: GravityControllerOptions = {}) {
    this.reduceMotion = options.reduceMotion ?? false;
    this.isRTL = options.isRTL ?? false;
    this.particles = options.particleManager ?? null;
  }

  /**
   * Animate gravity: falling tiles drop down, new tiles appear from above.
   * Returns when all animations (including grid settle) complete.
   */
  playGravitySequence(
    scene: Phaser.Scene,
    fallingTiles: FallingTileData[],
    newTiles: NewTileData[],
    tileMap: Map<string, BlastTile>,
    tileSize: number,
  ): Promise<void> {
    if (fallingTiles.length === 0 && newTiles.length === 0) {
      return Promise.resolve();
    }

    if (this.reduceMotion) {
      this.instantReposition(fallingTiles, newTiles, tileMap, tileSize);
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      let pendingBounces = 0;
      let landedCount = 0;
      let cameraShook = false;

      const particleConfig: ParticleConfig = { reduceMotion: false, isLowEnd: false };

      // Compute column stagger offsets
      const maxCol = this.getMaxCol(fallingTiles, newTiles);

      const onAllBouncesComplete = () => {
        // Grid settle: entire grid micro-bounces after all falls
        this.playGridSettle(scene, tileMap, resolve);
      };

      const onBounceComplete = () => {
        pendingBounces--;
        if (pendingBounces <= 0) {
          onAllBouncesComplete();
        }
      };

      // Phase 1: Falling tiles with column stagger + motion stretch
      for (const data of fallingTiles) {
        const tile = tileMap.get(`${data.fromRow},${data.col}`);
        if (!tile) continue;

        const params = calcFallTweenParams(data.fallDistance, tileSize);
        const squashScale = getLandingSquashScale(data.fallDistance);
        const colDelay = this.getColumnDelay(data.col, maxCol);

        pendingBounces++;
        scene.tweens.add({
          targets: tile,
          y: tile.y + params.targetDeltaY,
          scaleY: MOTION_STRETCH_SCALE_Y,
          scaleX: MOTION_STRETCH_SCALE_X,
          duration: params.duration,
          delay: colDelay,
          ease: params.ease,
          onComplete: () => {
            this.onTileLand(scene, tile, data, squashScale, tileMap, particleConfig, onBounceComplete);

            // Track simultaneous landings for camera shake
            landedCount++;
            if (landedCount >= CAMERA_SHAKE_TILE_THRESHOLD && !cameraShook) {
              cameraShook = true;
              scene.cameras.main.shake(CAMERA_SHAKE_DURATION, CAMERA_SHAKE_INTENSITY);
            }
          },
        });
      }

      // Phase 2: New tiles from above (slightly delayed after existing falls)
      const existingFallDelay = fallingTiles.length > 0 ? 50 : 0;
      for (let i = 0; i < newTiles.length; i++) {
        const data = newTiles[i];
        const tile = tileMap.get(`${data.row},${data.col}`);
        if (!tile) continue;

        const params = calcAppearParams(i, tileSize);
        const colDelay = this.getColumnDelay(data.col, maxCol);
        const squashScale = getLandingSquashScale(1); // 1-row equivalent

        pendingBounces++;
        scene.tweens.add({
          targets: tile,
          y: { from: tile.y - tileSize, to: tile.y },
          alpha: { from: 0, to: 1 },
          scaleY: MOTION_STRETCH_SCALE_Y,
          scaleX: MOTION_STRETCH_SCALE_X,
          duration: params.duration,
          delay: params.delay + existingFallDelay + colDelay,
          ease: params.ease,
          onComplete: () => {
            this.onNewTileLand(scene, tile, squashScale, onBounceComplete);
          },
        });
      }

      // If no tweens created (tiles not in map), resolve immediately
      if (pendingBounces === 0) resolve();
    });
  }

  // ─── Landing effects ────────────────────────────────────────────────────────

  /** Handle a falling tile landing: flash, bounce, dust, compression wave. */
  private onTileLand(
    scene: Phaser.Scene,
    tile: BlastTile,
    data: FallingTileData,
    squashScale: number,
    tileMap: Map<string, BlastTile>,
    particleConfig: ParticleConfig,
    onBounceComplete: () => void,
  ): void {
    // Landing flash: briefly tint white
    this.playLandingFlash(scene, tile);

    // Elastic landing bounce with volume conservation
    scene.tweens.add({
      targets: tile,
      scaleY: { from: squashScale, to: 1 },
      scaleX: { from: 1 / squashScale, to: 1 },
      duration: BOUNCE_DURATION,
      ease: BOUNCE_EASE,
      onComplete: onBounceComplete,
    });

    // Dust particles for medium+ falls
    if (data.fallDistance >= DUST_THRESHOLD && this.particles) {
      this.particles.playLandingDust(scene, tile.x, tile.y, data.fallDistance, particleConfig);
    }

    // Compression wave: tiles below heavy landings briefly squash
    if (data.fallDistance >= COMPRESSION_THRESHOLD) {
      this.playCompressionWave(scene, data.row, data.col, tileMap);
    }
  }

  /** Handle a new tile landing: flash + bounce. */
  private onNewTileLand(
    scene: Phaser.Scene,
    tile: BlastTile,
    squashScale: number,
    onBounceComplete: () => void,
  ): void {
    this.playLandingFlash(scene, tile);

    scene.tweens.add({
      targets: tile,
      scaleY: { from: squashScale, to: 1 },
      scaleX: { from: 1 / squashScale, to: 1 },
      duration: BOUNCE_DURATION,
      ease: BOUNCE_EASE,
      onComplete: onBounceComplete,
    });
  }

  /** Brief white tint flash on landing impact. */
  private playLandingFlash(scene: Phaser.Scene, tile: BlastTile): void {
    (tile as unknown as { setTint: (c: number) => void }).setTint(0xffffff);
    scene.time.delayedCall(LANDING_FLASH_MS, () => {
      (tile as unknown as { clearTint: () => void }).clearTint();
    });
  }

  // ─── Compression wave ───────────────────────────────────────────────────────

  /** When a heavy tile lands, tiles directly below briefly squash. */
  private playCompressionWave(
    scene: Phaser.Scene,
    landingRow: number,
    col: number,
    tileMap: Map<string, BlastTile>,
  ): void {
    // Check tile directly below the landing position
    const belowKey = `${landingRow + 1},${col}`;
    const belowTile = tileMap.get(belowKey);
    if (!belowTile) return;

    scene.tweens.add({
      targets: belowTile,
      scaleY: { from: COMPRESSION_SCALE_Y, to: 1 },
      scaleX: { from: 1 / COMPRESSION_SCALE_Y, to: 1 },
      duration: COMPRESSION_DURATION,
      ease: 'Sine.easeOut',
    });
  }

  // ─── Grid settle ──────────────────────────────────────────────────────────

  /** After all bounces complete, the entire grid does a micro-bounce. */
  private playGridSettle(
    scene: Phaser.Scene,
    tileMap: Map<string, BlastTile>,
    resolve: () => void,
  ): void {
    const allTiles = Array.from(tileMap.values());
    if (allTiles.length === 0) {
      resolve();
      return;
    }

    scene.tweens.add({
      targets: allTiles,
      scaleY: { from: GRID_SETTLE_SCALE_Y, to: 1.0 },
      scaleX: { from: 1 / GRID_SETTLE_SCALE_Y, to: 1.0 },
      duration: GRID_SETTLE_DURATION,
      ease: 'Sine.easeOut',
      onComplete: resolve,
    });
  }

  // ─── Column stagger ─────────────────────────────────────────────────────────

  private getMaxCol(fallingTiles: FallingTileData[], newTiles: NewTileData[]): number {
    let max = 0;
    for (const t of fallingTiles) max = Math.max(max, t.col);
    for (const t of newTiles) max = Math.max(max, t.col);
    return max;
  }

  /** Calculate column stagger delay. Leftmost first (RTL: rightmost first). */
  private getColumnDelay(col: number, maxCol: number): number {
    if (this.isRTL) {
      return (maxCol - col) * COLUMN_STAGGER_MS;
    }
    return col * COLUMN_STAGGER_MS;
  }

  // ─── Reduce motion ───────────────────────────────────────────────────────────

  /** Instant repositioning for reduced motion. */
  private instantReposition(
    fallingTiles: FallingTileData[],
    newTiles: NewTileData[],
    tileMap: Map<string, BlastTile>,
    tileSize: number,
  ): void {
    for (const data of fallingTiles) {
      const tile = tileMap.get(`${data.fromRow},${data.col}`);
      if (!tile) continue;

      const params = calcFallTweenParams(data.fallDistance, tileSize);
      tile.setPosition(tile.x, tile.y + params.targetDeltaY);
    }

    for (const data of newTiles) {
      const tile = tileMap.get(`${data.row},${data.col}`);
      if (!tile) continue;
      tile.setAlpha(1);
    }
  }
}
