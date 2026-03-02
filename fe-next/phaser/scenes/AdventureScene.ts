/**
 * AdventureScene — extends GameScene with adventure tile type visuals.
 *
 * Adds: ice crack overlays, bomb explosion graphics, fire glow, rainbow shimmer.
 * All standard Boggle interaction (path selection, word submit) inherits from GameScene.
 *
 * Tile type data flows via the `grid:update` tileStates field.
 */

import Phaser from 'phaser';
import { GameScene } from './GameScene';
import { GameBridge, type BridgeEvents } from '@/lib/phaser/bridge/GameBridge';
import {
  applyIceMelt,
  applyBombEffect,
  isRainbowTile,
  type AdventureTile,
} from '@/lib/phaser/logic/AdventureTileRules';
import {
  startFireGlow,
  stopFireGlow,
  playFreezeEffect,
  playMeltEffect,
} from '../effects/TileEffects';
import { playAcceptParticles } from '../objects/ParticleManager';
import { BossUIManager } from '../objects/boss';

// ─── Adventure tile overlay colours ──────────────────────────────────────────

const TILE_TYPE_TINTS: Partial<Record<AdventureTile['type'], number>> = {
  ice:      0x88ccff,
  bomb:     0xff6b35,
  gold:     0xffd700,
  rainbow:  0xff1493,
  time:     0x00ffff,
  locked:   0x666666,
};

export class AdventureScene extends GameScene {
  // Map from "row,col" → adventure tile metadata
  private adventureTiles: Map<string, AdventureTile> = new Map();
  // Map from "row,col" → active fire-glow tween (for cleanup)
  private fireGlowTweens: Map<string, Phaser.Tweens.Tween> = new Map();
  // Active rainbow glow timer events (for cleanup on destroy/rebuild)
  private rainbowTimers: Phaser.Time.TimerEvent[] = [];
  // Unsubscribe functions for bridge listeners added in create()
  private bridgeUnsubs: Array<() => void> = [];
  // Boss UI manager — renders all boss battle visuals on canvas
  private bossUI: BossUIManager | null = null;

  constructor() {
    // Register under the same key as GameScene — BootScene always starts 'GameScene',
    // and only one scene variant is in the registry at a time.
    super();
  }

  // ─── Override: grid update ─────────────────────────────────────────────

  protected override handleGridUpdate(payload: BridgeEvents['grid:update']): void {
    // Call parent for standard tile creation
    super.handleGridUpdate(payload);

    // Overlay adventure tile visuals from tileStates
    if (payload.tileStates) {
      this.applyTileTypeOverlays(payload.tileStates);
    }

    // Start rainbow glow timers after tile overlays are applied
    this.initRainbowGlows();

    // Apply fire round glow if active
    if (payload.fireRoundActive) {
      this.startFireRoundGlows();
    } else {
      this.stopAllFireGlows();
    }
  }

  // ─── Adventure tile overlays ───────────────────────────────────────────

  private applyTileTypeOverlays(tileStates: Record<string, string>): void {
    for (const [key, typeStr] of Object.entries(tileStates)) {
      const parts = key.split(',');
      const row = parseInt(parts[0], 10);
      const col = parseInt(parts[1], 10);
      const tileObj = this.tiles.get(key);
      if (!tileObj) continue;

      const type = typeStr as AdventureTile['type'];
      const tint = TILE_TYPE_TINTS[type];

      if (tint !== undefined) {
        (tileObj as unknown as { bg: { setTint?: (t: number) => void } })
          .bg?.setTint?.(tint);
      }

      // Store adventure metadata
      this.adventureTiles.set(key, {
        id: key,
        row,
        col,
        letter: tileObj.getLetter(),
        type,
        isCleared: false,
        isFrozen: type === 'ice',
        bonusTime: 0,
      });

      if (type === 'ice') {
        this.playIceFreezeVisual(row, col);
      }
    }
  }

  // ─── Ice ──────────────────────────────────────────────────────────────

  private playIceFreezeVisual(row: number, col: number): void {
    const tile = this.tiles.get(`${row},${col}`);
    if (!tile) return;
    // Cast to Image-like for freeze effect (LetterTile has alpha)
    playFreezeEffect(this, tile as unknown as Phaser.GameObjects.Image, this.a11y);
  }

  /** Called when an ice tile is included in an accepted word. */
  triggerIceMelt(row: number, col: number): void {
    const key = `${row},${col}`;
    const adv = this.adventureTiles.get(key);
    if (!adv || adv.type !== 'ice') return;

    const melted = applyIceMelt(adv);
    this.adventureTiles.set(key, melted);

    const tile = this.tiles.get(key);
    if (!tile) return;

    playMeltEffect(this, tile as unknown as Phaser.GameObjects.Image, this.a11y);

    // Crack graphics overlay
    this.drawIceCrack(tile.x, tile.y, this.layout?.tileSize ?? 60);

    // Notify React
    GameBridge.emit('tile:activated', { row, col, tileType: 'ice', effect: 'melt' });
  }

  private drawIceCrack(x: number, y: number, size: number): void {
    const g = this.add.graphics();
    g.setDepth(15);
    g.lineStyle(2, 0xffffff, 0.7);

    const half = size / 2;
    // Radial crack lines from center
    const angles = [0, 60, 120, 180, 240, 300];
    angles.forEach((angle) => {
      const rad = (angle * Math.PI) / 180;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + Math.cos(rad) * half * 0.8, y + Math.sin(rad) * half * 0.8);
      g.strokePath();
    });

    // Fade out and destroy
    this.tweens.add({
      targets: g,
      alpha: 0,
      duration: this.a11y.reduceMotion ? 0 : 600,
      ease: 'Linear',
      onComplete: () => g.destroy(),
    });
  }

  // ─── Bomb ─────────────────────────────────────────────────────────────

  /** Called when a bomb tile is collected. Clears the row. */
  triggerBombExplosion(row: number, col: number): void {
    const allTiles = Array.from(this.adventureTiles.values());
    const updated = applyBombEffect(allTiles, row, col);

    // Update internal state
    updated.forEach((tile) => {
      if (tile.row === row) {
        this.adventureTiles.set(`${tile.row},${tile.col}`, tile);
      }
    });

    // Shake row + expand circle visual
    this.drawBombExplosion(row);

    GameBridge.emit('tile:activated', { row, col, tileType: 'bomb', effect: 'explode' });
  }

  private drawBombExplosion(row: number): void {
    const rowTiles = Array.from(this.tiles.entries())
      .filter(([key]) => key.startsWith(`${row},`))
      .map(([, tile]) => tile);

    if (rowTiles.length === 0 || !this.layout) return;

    const firstPos = this.layout.tiles.find((t) => t.row === row && t.col === 0);
    if (!firstPos) return;

    const cx = this.scale.width / 2;
    const cy = firstPos.y;

    // Expanding circle
    const g = this.add.graphics();
    g.setDepth(25);
    g.lineStyle(4, 0xff6b35, 0.9);
    g.strokeCircle(cx, cy, 10);

    const targetRadius = (this.layout.tileSize + this.layout.gap) * (rowTiles.length / 2) + 20;

    this.tweens.add({
      targets: { r: 10 },
      r: targetRadius,
      duration: this.a11y.reduceMotion ? 0 : 400,
      ease: 'Quad.easeOut',
      onUpdate: (tween) => {
        const val = tween.getValue() as number;
        g.clear();
        g.lineStyle(4, 0xff6b35, 1 - tween.progress);
        g.strokeCircle(cx, cy, val);
      },
      onComplete: () => g.destroy(),
    });

    // Shake the row tiles
    rowTiles.forEach((tile) => {
      this.tweens.add({
        targets: tile,
        x: { from: tile.x - 4, to: tile.x + 4 },
        duration: this.a11y.reduceMotion ? 0 : 60,
        yoyo: true,
        repeat: 3,
        ease: 'Linear',
        onComplete: () => tile.setPosition(tile.x, tile.y),
      });
    });

    // Particle burst
    playAcceptParticles(this, cx, cy, 0xff6b35, {
      reduceMotion: this.a11y.reduceMotion,
      isLowEnd: this.a11y.isLowEnd,
    });
  }

  // ─── Rainbow tile ──────────────────────────────────────────────────────

  /** Rainbow tiles glow with a cycling tint. */
  private startRainbowGlow(row: number, col: number): void {
    if (this.a11y.reduceMotion) return;
    const tile = this.tiles.get(`${row},${col}`);
    if (!tile) return;

    const colors = [0xff1493, 0xff6b35, 0xffe135, 0xb8ff00, 0x00ffff, 0x9b59b6];
    let idx = 0;

    const timer = this.time.addEvent({
      delay: 300,
      repeat: -1,
      callback: () => {
        (tile as unknown as { bg: { setTint?: (t: number) => void } })
          .bg?.setTint?.(colors[idx % colors.length]);
        idx++;
      },
    });
    this.rainbowTimers.push(timer as unknown as Phaser.Time.TimerEvent);
  }

  // ─── Fire round glows ──────────────────────────────────────────────────

  private startFireRoundGlows(): void {
    this.tiles.forEach((tile, key) => {
      if (this.fireGlowTweens.has(key)) return;
      const tween = startFireGlow(this, tile as unknown as { alpha: number } & Phaser.GameObjects.GameObject, this.a11y);
      if (tween) this.fireGlowTweens.set(key, tween);
    });
  }

  private stopAllFireGlows(): void {
    this.tiles.forEach((tile) => stopFireGlow(this, tile));
    this.fireGlowTweens.clear();
  }

  // ─── Hint highlight ────────────────────────────────────────────────────

  /** Keys of tiles currently showing hint glow, for diff-based updates. */
  private hintedTileKeys: Set<string> = new Set();

  /**
   * Show persistent hint glow on the given cells.
   * Clears previous hint glows that are no longer in the set.
   */
  highlightHintTiles(cells: Array<{ row: number; col: number }>): void {
    const newKeys = new Set(cells.map(({ row, col }) => `${row},${col}`));

    // Clear tiles that are no longer hinted
    Array.from(this.hintedTileKeys).forEach((key) => {
      if (!newKeys.has(key)) {
        this.tiles.get(key)?.clearHintGlow();
      }
    });

    // Show glow on newly hinted tiles
    Array.from(newKeys).forEach((key) => {
      const tile = this.tiles.get(key);
      if (tile && !tile.isHintHighlighted) {
        tile.showHintGlow(this.a11y.reduceMotion);
      }
    });

    this.hintedTileKeys = newKeys;
  }

  /** Clear all hint glows. */
  clearHintHighlights(): void {
    Array.from(this.hintedTileKeys).forEach((key) => {
      this.tiles.get(key)?.clearHintGlow();
    });
    this.hintedTileKeys.clear();
  }

  // ─── Rainbow timer cleanup ───────────────────────────────────────────

  private cleanupRainbowTimers(): void {
    this.rainbowTimers.forEach((timer) => this.time.removeEvent(timer));
    this.rainbowTimers = [];
  }

  // ─── Lifecycle ─────────────────────────────────────────────────────────

  override create(): void {
    super.create();
    // Initialize boss UI manager (subscribes to boss:* bridge events)
    this.bossUI = new BossUIManager(this);
    this.bossUI.init();
    // Subscribe to hint events and track unsubs for cleanup
    this.bridgeUnsubs.push(
      GameBridge.on('selection:highlight', ({ cells }) => {
        if (cells.length === 0) {
          this.clearHintHighlights();
        } else {
          this.highlightHintTiles(cells);
        }
      }),
      GameBridge.on('scene:destroy', () => this.cleanupAdventure()),
    );
  }

  /** Clean up all adventure-specific resources. */
  private cleanupAdventure(): void {
    this.cleanupRainbowTimers();
    this.bossUI?.destroy();
    this.bossUI = null;
    this.bridgeUnsubs.forEach((unsub) => unsub());
    this.bridgeUnsubs = [];
  }

  override destroy(): void {
    this.cleanupAdventure();
    super.destroy();
  }

  // ─── Rainbow overlay on all rainbow tiles after grid build ────────────

  protected override buildGrid(grid: string[][]): void {
    // Clean up previous grid visuals before rebuilding
    this.cleanupRainbowTimers();
    this.hintedTileKeys.clear(); // tiles are destroyed; stale keys must go
    super.buildGrid(grid);
  }

  /** Start rainbow glow timers for all rainbow-type adventure tiles. */
  private initRainbowGlows(): void {
    this.adventureTiles.forEach((adv, key) => {
      if (isRainbowTile(adv)) {
        const [rStr, cStr] = key.split(',');
        this.startRainbowGlow(parseInt(rStr, 10), parseInt(cStr, 10));
      }
    });
  }
}
