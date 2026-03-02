/**
 * GameScene — main Phaser scene owning all grid rendering and interaction.
 *
 * Architecture: React owns all text/UI/state; this scene owns canvas rendering.
 * All data flows through GameBridge (never captured from React props/closures).
 *
 * Input: full-canvas pointerdown/move/up (not per-tile) for performance.
 */

import Phaser from 'phaser';
import { GameBridge, type BridgeEvents } from '@/lib/phaser/bridge/GameBridge';
import {
  buildGridLayout,
  getTileAtPoint,
  isAdjacentCell,
  type GridLayout,
} from '@/lib/phaser/logic/GridGeometry';
import { getPathWord } from '@/lib/phaser/logic/PathValidator';
import { getComboHexColors } from '@/lib/phaser/logic/ComboTracker';
import { LetterTile } from '../objects/LetterTile';
import { WordPathTrail } from '../objects/WordPathTrail';
import { ComboRing } from '../objects/ComboRing';
import { playAccepted, playRejected, playDuplicate } from '../effects/SubmitEffect';
import { cameraShake, cameraZoom } from '../effects/CameraEffects';
import { playComboLevelUp } from '../effects/ComboEffect';
import {
  playEarthquakeWarning,
  playEarthquakeShake,
  playFireRoundTransition,
} from '../effects/EarthquakeEffect';
import {
  startFireRoundAmbient,
  stopFireRoundAmbient,
  type FireRoundHandle,
} from '../effects/FireRoundEffect';

type PathCell = { row: number; col: number; letter: string };

interface AccessibilityConfig {
  reduceMotion: boolean;
  disableFireRoundLights: boolean;
  disableEarthquakeEffects: boolean;
  isLowEnd: boolean;
  isRTL: boolean;
}

export class GameScene extends Phaser.Scene {
  protected tiles: Map<string, LetterTile> = new Map();
  protected pathTrail!: WordPathTrail;
  protected comboRing!: ComboRing;
  protected fireRoundHandle: FireRoundHandle | null = null;

  private currentPath: PathCell[] = [];
  private isDragging = false;
  protected layout!: GridLayout;
  private comboLevel = 0;
  private previousComboLevel: number | null = null; // null = no previous update yet
  /** Center of the last submitted word path — used for effects that fire after path is cleared. */
  private lastSubmitCenter: { x: number; y: number } | null = null;
  /** Whether camera vibration is active from word building momentum. */
  private momentumVibrating = false;
  protected a11y: AccessibilityConfig = {
    reduceMotion: false,
    disableFireRoundLights: false,
    disableEarthquakeEffects: false,
    isLowEnd: false,
    isRTL: false,
  };

  // Stored bound handlers so GameBridge.off() can remove the exact same reference
  private readonly handlers = {
    onGridUpdate: (p: BridgeEvents['grid:update']) => this.handleGridUpdate(p),
    onWordFeedback: (p: BridgeEvents['word:feedback']) => this.handleWordFeedback(p),
    onEarthquake: (p: BridgeEvents['effect:earthquake']) => this.handleEarthquake(p),
    onA11y: (p: BridgeEvents['accessibility:update']) => this.handleA11y(p),
    onDestroy: () => this.cleanup(),
  };

  constructor(key = 'GameScene') {
    super({ key });
  }

  // ─── Lifecycle ─────────────────────────────────────────────────────────────

  create(): void {
    // Disable default right-click / context menu on canvas
    this.game.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    // Touch: prevent scroll while interacting with the canvas
    this.game.canvas.style.touchAction = 'none';

    this.pathTrail = new WordPathTrail(this);
    this.comboRing = new ComboRing(this);

    this.setupInput();
    this.subscribeToBridge();

    // ResizeObserver for responsive layout
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => this.onResize());
      ro.observe(this.game.canvas.parentElement ?? this.game.canvas);
      this.events.once('shutdown', () => ro.disconnect());
    }

    GameBridge.emit('scene:ready', undefined);
  }

  // ─── Bridge subscriptions ──────────────────────────────────────────────────

  private subscribeToBridge(): void {
    GameBridge.on('grid:update', this.handlers.onGridUpdate);
    GameBridge.on('word:feedback', this.handlers.onWordFeedback);
    GameBridge.on('effect:earthquake', this.handlers.onEarthquake);
    GameBridge.on('accessibility:update', this.handlers.onA11y);
    GameBridge.on('scene:destroy', this.handlers.onDestroy);
  }

  private unsubscribeFromBridge(): void {
    GameBridge.off('grid:update', this.handlers.onGridUpdate);
    GameBridge.off('word:feedback', this.handlers.onWordFeedback);
    GameBridge.off('effect:earthquake', this.handlers.onEarthquake);
    GameBridge.off('accessibility:update', this.handlers.onA11y);
    GameBridge.off('scene:destroy', this.handlers.onDestroy);
  }

  // ─── Bridge handlers ───────────────────────────────────────────────────────

  protected handleGridUpdate({ grid, comboLevel, fireRoundActive }: BridgeEvents['grid:update']): void {
    const prevLevel = this.previousComboLevel;
    this.previousComboLevel = comboLevel;
    this.comboLevel = comboLevel;
    this.buildGrid(grid);

    // Combo level-up detection: fire ring burst + particles when level increases.
    // Skip the very first update (prevLevel === null) to avoid false positives on load.
    if (prevLevel !== null && comboLevel > prevLevel) {
      this.onComboLevelUp(comboLevel);
    }

    // Fire round ambient lifecycle
    if (fireRoundActive && !this.fireRoundHandle) {
      this.fireRoundHandle = startFireRoundAmbient(this, {
        reduceMotion: this.a11y.reduceMotion,
        disableFireRoundLights: this.a11y.disableFireRoundLights,
        isLowEnd: this.a11y.isLowEnd,
      });
    } else if (!fireRoundActive && this.fireRoundHandle) {
      stopFireRoundAmbient(this, this.fireRoundHandle);
      this.fireRoundHandle = null;
    }
  }

  private onComboLevelUp(level: number): void {
    // Use the last submitted word's center for positional accuracy;
    // fallback to canvas center if no word was submitted yet.
    const center = this.lastSubmitCenter ?? {
      x: this.scale.width / 2,
      y: this.scale.height / 2,
    };

    playComboLevelUp(this, center, level, {
      reduceMotion: this.a11y.reduceMotion,
      isLowEnd: this.a11y.isLowEnd,
    });
  }

  private handleWordFeedback({ type, word, score }: BridgeEvents['word:feedback']): void {
    // Use stored submit center — currentPath is already cleared by onPointerUp
    const center = this.lastSubmitCenter ?? this.getPathCenter();
    const colors = getComboHexColors(this.comboLevel);

    switch (type) {
      case 'accepted': {
        this.tiles.forEach((tile) => tile.submitAccept());
        playAccepted(this, center, colors.glowColor, {
          reduceMotion: this.a11y.reduceMotion,
          isLowEnd: this.a11y.isLowEnd,
        });
        // Subtle zoom-in punch on accepted words
        cameraZoom(this.cameras.main, 1.03, 300, this.a11y.reduceMotion);
        break;
      }
      case 'rejected':
        this.tiles.forEach((tile) => {
          if (tile.getStatus() === 'selected') tile.submitReject();
        });
        playRejected(this, center, {
          reduceMotion: this.a11y.reduceMotion,
          isLowEnd: this.a11y.isLowEnd,
        });
        break;
      case 'duplicate':
      case 'foundByOther':
        this.tiles.forEach((tile) => {
          if (tile.getStatus() === 'selected') tile.submitReject();
        });
        playDuplicate(this, {
          reduceMotion: this.a11y.reduceMotion,
          isLowEnd: this.a11y.isLowEnd,
        });
        break;
    }

    // Reset tiles after animation window
    const resetDelay = this.a11y.reduceMotion ? 0 : 400;
    this.time.delayedCall(resetDelay, () => this.resetAllTiles());

    void word; void score; // used by subclass (AdventureScene)
  }

  private handleEarthquake({ intensity }: BridgeEvents['effect:earthquake']): void {
    if (this.a11y.disableEarthquakeEffects) return;
    cameraShake(this.cameras.main, intensity, this.a11y.reduceMotion);

    // Visual ground effects require layout + tiles
    if (!this.layout) return;

    const a11y = {
      reduceMotion: this.a11y.reduceMotion,
      disableEarthquakeEffects: this.a11y.disableEarthquakeEffects,
      isLowEnd: this.a11y.isLowEnd,
    };

    switch (intensity) {
      case 'warning':
        playEarthquakeWarning(this, this.tiles, this.layout, a11y);
        break;
      case 'shaking':
        playEarthquakeShake(this, this.tiles, this.layout, a11y);
        break;
      case 'fire-round':
        playFireRoundTransition(this, this.tiles, this.layout, a11y);
        break;
    }
  }

  private handleA11y(config: BridgeEvents['accessibility:update']): void {
    this.a11y = config;
  }

  // ─── Grid construction ────────────────────────────────────────────────────

  protected buildGrid(grid: string[][]): void {
    // Destroy existing tiles
    this.tiles.forEach((tile) => tile.destroy());
    this.tiles.clear();

    this.layout = buildGridLayout(
      grid.length,
      this.scale.width,
      this.scale.height
    );

    for (let row = 0; row < grid.length; row++) {
      for (let col = 0; col < (grid[row]?.length ?? 0); col++) {
        const letter = grid[row][col] ?? '';
        const pos = this.layout.tiles.find((t) => t.row === row && t.col === col);
        if (!pos) continue;

        const tile = new LetterTile(this, pos.x, pos.y, letter, this.layout.tileSize);
        this.tiles.set(`${row},${col}`, tile);
      }
    }
  }

  // ─── Input ────────────────────────────────────────────────────────────────

  private setupInput(): void {
    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown, this);
    this.input.on(Phaser.Input.Events.POINTER_MOVE, this.onPointerMove, this);
    this.input.on(Phaser.Input.Events.POINTER_UP, this.onPointerUp, this);
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    if (!this.layout) return;

    this.isDragging = true;
    this.currentPath = [];
    this.pathTrail.clear();
    // Immediately reset any tiles still in selected/submitted state from the
    // previous word (e.g. waiting for the 400ms reset-after-feedback timer).
    // This prevents "stuck" highlights when the user starts a new drag before
    // the delayed reset fires.
    this.resetAllTiles();

    const hit = getTileAtPoint(pointer.x, pointer.y, this.layout);
    if (hit) this.selectTile(hit.row, hit.col);
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (!this.isDragging || !this.layout) return;

    const hit = getTileAtPoint(pointer.x, pointer.y, this.layout);
    if (!hit) return;

    const alreadyInPath = this.currentPath.some(
      (c) => c.row === hit.row && c.col === hit.col
    );
    if (alreadyInPath) return;

    const last = this.currentPath[this.currentPath.length - 1];
    if (last && !isAdjacentCell(last, hit)) return;

    this.selectTile(hit.row, hit.col);
  }

  private onPointerUp(): void {
    if (!this.isDragging) return;
    this.isDragging = false;
    this.clearGridDimming();
    this.clearWordMomentum();

    if (this.currentPath.length > 0) {
      // Store path center before clearing — used by word:feedback and combo effects
      this.lastSubmitCenter = this.getPathCenter();
      const word = getPathWord(this.currentPath);
      GameBridge.emit('word:submit', { word, path: this.currentPath });
    }

    this.currentPath = [];
    this.pathTrail.clear();
  }

  private selectTile(row: number, col: number): void {
    const tile = this.tiles.get(`${row},${col}`);
    if (!tile || tile.getStatus() !== 'idle') return;

    const idx = this.currentPath.length;
    const letter = tile.getLetter();

    const colors = getComboHexColors(this.comboLevel);

    this.currentPath.push({ row, col, letter });
    tile.select(idx, colors, this.a11y.reduceMotion, this.currentPath.length);
    this.pathTrail.updatePath(this.currentPath, this.layout, colors.glowColor);
    this.updateGridDimming();
    this.updateWordMomentum();

    // Emit live word preview to React
    GameBridge.emit('word:change', {
      word: getPathWord(this.currentPath),
      letterCount: this.currentPath.length,
      path: this.currentPath,
    });

    // Emit selection state for React UI (e.g. tile highlight overlays)
    GameBridge.emit('selection:change', { cells: [...this.currentPath] });
  }

  // ─── Grid dimming ────────────────────────────────────────────────────────

  /** Dim non-selected tiles; highlight adjacent-to-last as reachable. */
  private updateGridDimming(): void {
    if (this.currentPath.length === 0) return;

    const last = this.currentPath[this.currentPath.length - 1];
    const selectedKeys = new Set(this.currentPath.map(c => `${c.row},${c.col}`));

    this.tiles.forEach((tile, key) => {
      if (selectedKeys.has(key)) {
        // Selected tiles stay at full brightness
        tile.setDimmed('none');
        return;
      }

      // Parse row,col from key
      const [rowStr, colStr] = key.split(',');
      const row = parseInt(rowStr, 10);
      const col = parseInt(colStr, 10);

      if (isAdjacentCell(last, { row, col })) {
        tile.setDimmed('reachable');
      } else {
        tile.setDimmed('dimmed');
      }
    });
  }

  /** Restore all tiles to full alpha. */
  private clearGridDimming(): void {
    this.tiles.forEach((tile) => tile.setDimmed('none'));
  }

  // ─── Word building momentum ─────────────────────────────────────────────

  /** Escalate game intensity as the player builds longer words. */
  private updateWordMomentum(): void {
    if (this.a11y.reduceMotion) return;

    const len = this.currentPath.length;

    // Path length 5+: subtle continuous camera vibration
    if (len >= 5 && !this.momentumVibrating) {
      this.momentumVibrating = true;
      this.cameras.main.shake(99999, 0.001);
    }
  }

  /** Stop all momentum effects (called on pointer up / reset). */
  private clearWordMomentum(): void {
    this.momentumVibrating = false;
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private getPathCenter(): { x: number; y: number } {
    if (!this.layout || this.currentPath.length === 0) {
      return { x: this.scale.width / 2, y: this.scale.height / 2 };
    }
    const xs = this.currentPath.map((c) => {
      const t = this.layout.tiles.find((tile) => tile.row === c.row && tile.col === c.col);
      return t?.x ?? 0;
    });
    const ys = this.currentPath.map((c) => {
      const t = this.layout.tiles.find((tile) => tile.row === c.row && tile.col === c.col);
      return t?.y ?? 0;
    });
    return {
      x: xs.reduce((a, b) => a + b, 0) / xs.length,
      y: ys.reduce((a, b) => a + b, 0) / ys.length,
    };
  }

  protected resetAllTiles(): void {
    this.clearGridDimming();
    this.tiles.forEach((tile) => tile.reset());
  }

  private onResize(): void {
    // Rebuild layout so tiles reposition for new canvas size.
    // Only if we have an existing grid (layout already set).
    if (!this.layout) return;
    const newLayout = buildGridLayout(
      this.layout.rows,
      this.scale.width,
      this.scale.height
    );
    this.layout = newLayout;
    newLayout.tiles.forEach(({ row, col, x, y }) => {
      const tile = this.tiles.get(`${row},${col}`);
      if (tile) tile.setPosition(x, y);
    });
  }

  private cleanup(): void {
    // Stop fire round ambient before unsubscribing
    if (this.fireRoundHandle) {
      stopFireRoundAmbient(this, this.fireRoundHandle);
      this.fireRoundHandle = null;
    }
    this.unsubscribeFromBridge();
    this.tiles.forEach((tile) => tile.destroy());
    this.tiles.clear();
  }

  // Called by Phaser when the scene is shut down (scene.stop() or game.destroy())
  destroy(): void {
    this.cleanup();
  }
}
