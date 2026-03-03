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
  // Active rainbow glow timer events (for cleanup on destroy/rebuild)
  private rainbowTimers: Phaser.Time.TimerEvent[] = [];
  // Unsubscribe functions for bridge listeners added in create()
  private bridgeUnsubs: Array<() => void> = [];
  // Boss UI manager — renders all boss battle visuals on canvas
  private bossUI: BossUIManager | null = null;
  // Set of locked tile keys ("row,col") — tiles made unselectable by boss abilities
  private lockedTileKeys: Set<string> = new Set();
  // Lock icon overlays for locked tiles
  private lockOverlays: Map<string, Phaser.GameObjects.Graphics> = new Map();
  // World-themed edge decoration graphics (cleaned up on destroy/rebuild)
  private edgeDecorations: Phaser.GameObjects.Graphics | null = null;
  // Current world ID for theming (default 1)
  private worldId = 1;

  constructor() {
    // Register under the same key as GameScene — BootScene always starts 'GameScene',
    // and only one scene variant is in the registry at a time.
    super();
  }

  // ─── Override: grid update ─────────────────────────────────────────────

  protected override handleGridUpdate(payload: BridgeEvents['grid:update']): void {
    // Call parent for standard tile creation
    super.handleGridUpdate(payload);

    // Set worldId from payload for edge decoration theming
    if (payload.worldId !== undefined) {
      this.worldId = payload.worldId;
    }

    // Overlay adventure tile visuals from tileStates
    if (payload.tileStates) {
      this.applyTileTypeOverlays(payload.tileStates);
    }

    // Start rainbow glow timers after tile overlays are applied
    this.initRainbowGlows();

    // Draw world-themed edge decorations around the grid
    this.drawEdgeDecorations();
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

  // ─── Locked tiles (boss abilities) ────────────────────────────────────

  /** Handle tiles:lock bridge event — dim and make tiles unselectable. */
  private handleTilesLock({ lockedIndices, gridSize }: { lockedIndices: number[]; gridSize: number }): void {
    // Clear previous locks
    this.clearLockedTiles();

    for (const idx of lockedIndices) {
      const row = Math.floor(idx / gridSize);
      const col = idx % gridSize;
      const key = `${row},${col}`;
      const tile = this.tiles.get(key);
      if (!tile) continue;

      this.lockedTileKeys.add(key);
      // Dim tile to indicate locked state
      tile.setDimmed('dimmed');

      // Draw lock icon overlay
      const lockG = this.add.graphics();
      lockG.setDepth(20);
      const size = this.layout?.tileSize ?? 60;
      const iconSize = size * 0.3;

      // Semi-transparent dark overlay
      lockG.fillStyle(0x000000, 0.3);
      lockG.fillRoundedRect(tile.x - size / 2, tile.y - size / 2, size, size, 8);

      // Lock icon: padlock body + shackle
      const cx = tile.x;
      const cy = tile.y;
      lockG.fillStyle(0x666666, 0.9);
      lockG.fillRoundedRect(cx - iconSize / 2, cy - iconSize * 0.1, iconSize, iconSize * 0.7, 3);
      lockG.lineStyle(2, 0x666666, 0.9);
      lockG.beginPath();
      lockG.arc(cx, cy - iconSize * 0.1, iconSize * 0.3, Math.PI, 0, false);
      lockG.strokePath();

      this.lockOverlays.set(key, lockG);
    }
  }

  /** Clear all locked tile visual indicators and restore selectability. */
  private clearLockedTiles(): void {
    this.lockedTileKeys.forEach((key) => {
      this.tiles.get(key)?.setDimmed('none');
    });
    this.lockOverlays.forEach((g) => g.destroy());
    this.lockOverlays.clear();
    this.lockedTileKeys.clear();
  }

  /** Check if a tile is locked (called by selectTile override). */
  isTileLocked(row: number, col: number): boolean {
    return this.lockedTileKeys.has(`${row},${col}`);
  }

  // ─── World-themed edge decorations ──────────────────────────────────

  /** Set the world ID for edge decorations. Called from React via bridge or props. */
  setWorldId(worldId: number): void {
    this.worldId = worldId;
    // Redraw decorations if layout exists
    if (this.layout) {
      this.drawEdgeDecorations();
    }
  }

  /** Draw subtle world-themed border glow around the grid area. */
  private drawEdgeDecorations(): void {
    // Clean up previous decorations
    this.edgeDecorations?.destroy();

    if (!this.layout) return;

    const g = this.add.graphics();
    g.setDepth(1); // Behind tiles (tiles are at depth 10+)

    // Calculate grid bounding box from layout
    const tilePositions = this.layout.tiles;
    if (tilePositions.length === 0) return;

    const halfTile = this.layout.tileSize / 2;
    const padding = 8;
    const minX = Math.min(...tilePositions.map(t => t.x)) - halfTile - padding;
    const maxX = Math.max(...tilePositions.map(t => t.x)) + halfTile + padding;
    const minY = Math.min(...tilePositions.map(t => t.y)) - halfTile - padding;
    const maxY = Math.max(...tilePositions.map(t => t.y)) + halfTile + padding;
    const w = maxX - minX;
    const h = maxY - minY;

    // World-specific colour palettes for edge glow
    const worldColors: Record<number, { primary: number; secondary: number; alpha: number }> = {
      1: { primary: 0xbeff00, secondary: 0x88cc00, alpha: 0.15 }, // Meadows — green
      2: { primary: 0x00ffff, secondary: 0x0088cc, alpha: 0.15 }, // Springs — cyan
      3: { primary: 0x9b59b6, secondary: 0x6b3fa0, alpha: 0.15 }, // Caverns — purple
      4: { primary: 0xff6b35, secondary: 0xcc4400, alpha: 0.15 }, // Volcano — orange
      5: { primary: 0xffd700, secondary: 0xccaa00, alpha: 0.15 }, // Desert — gold
      6: { primary: 0x4488ff, secondary: 0x2266cc, alpha: 0.15 }, // Tundra — blue
      7: { primary: 0xff1493, secondary: 0xcc1177, alpha: 0.15 }, // Mystic — pink
      8: { primary: 0x00ff88, secondary: 0x00cc66, alpha: 0.15 }, // Jungle — emerald
      9: { primary: 0xff4444, secondary: 0xcc2222, alpha: 0.15 }, // Inferno — red
      10: { primary: 0xffffff, secondary: 0xccccff, alpha: 0.12 }, // Celestial — white
    };

    const colors = worldColors[this.worldId] ?? worldColors[1];

    // Outer glow border — two stroked rectangles at different alphas
    g.lineStyle(3, colors.primary, colors.alpha * 2);
    g.strokeRoundedRect(minX, minY, w, h, 12);

    g.lineStyle(6, colors.secondary, colors.alpha);
    g.strokeRoundedRect(minX - 3, minY - 3, w + 6, h + 6, 14);

    // Corner accents — small filled circles at each corner
    const cornerRadius = 6;
    const corners = [
      { x: minX, y: minY },
      { x: maxX, y: minY },
      { x: minX, y: maxY },
      { x: maxX, y: maxY },
    ];

    corners.forEach(({ x, y }) => {
      g.fillStyle(colors.primary, colors.alpha * 3);
      g.fillCircle(x, y, cornerRadius);
    });

    this.edgeDecorations = g;
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
    // Subscribe to hint events, tile lock events, and track unsubs for cleanup
    this.bridgeUnsubs.push(
      GameBridge.on('selection:highlight', ({ cells }) => {
        if (cells.length === 0) {
          this.clearHintHighlights();
        } else {
          this.highlightHintTiles(cells);
        }
      }),
      GameBridge.on('tiles:lock', (payload) => this.handleTilesLock(payload)),
      GameBridge.on('scene:destroy', () => this.cleanupAdventure()),
    );
  }

  /** Clean up all adventure-specific resources. */
  private cleanupAdventure(): void {
    this.cleanupRainbowTimers();
    this.clearLockedTiles();
    this.edgeDecorations?.destroy();
    this.edgeDecorations = null;
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
    this.clearLockedTiles();
    this.edgeDecorations?.destroy();
    this.edgeDecorations = null;
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
