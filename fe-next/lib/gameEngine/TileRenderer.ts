// ─── Tile Renderer ────────────────────────────────────────────────────
// Manages a grid of PixiJS Graphics-based tiles with animations.
// Each tile is a Container with a background shape + text label.
// Provides methods for selection highlighting, clearing animations,
// and physics-based gravity when tiles need to fall.

import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { GlowFilter } from 'pixi-filters';
import type { TileRenderConfig, TileData, Vector2 } from './types';
import { DEFAULT_THEMES, TILE_INDICATORS, type TileTheme } from './tileThemes';

// ─── Tile Sprite ──────────────────────────────────────────────────────

interface TileSprite {
  container: Container;
  bg: Graphics;
  text: Text;
  indicator: Text | null;
  data: TileData;
  /** Target position for smooth animation */
  targetX: number;
  targetY: number;
  /** Animation state */
  animState: 'idle' | 'appearing' | 'clearing' | 'falling' | 'landing' | 'swapping';
  animProgress: number;
  /** Origin position for fall animation */
  fallFromY?: number;
  /** Origin position for swap animation */
  swapFromX?: number;
  swapFromY?: number;
  /** Glow filter for special tiles */
  glow: GlowFilter | null;
}

// ─── Renderer ─────────────────────────────────────────────────────────

export class TileRenderer {
  readonly container: Container;
  private tiles = new Map<string, TileSprite>();
  private config: TileRenderConfig;
  private themes: Record<string, TileTheme>;
  private textStyle: TextStyle;
  private _destroyed = false;

  constructor(
    parent: Container,
    config: TileRenderConfig,
    customThemes?: Record<string, TileTheme>,
  ) {
    this.config = config;
    this.themes = { ...DEFAULT_THEMES, ...customThemes };
    this.container = new Container();
    parent.addChild(this.container);

    this.textStyle = new TextStyle({
      fontFamily: 'Fredoka, Rubik, sans-serif',
      fontSize: config.tileSize * 0.45,
      fontWeight: 'bold',
      fill: 0xffffff,
      align: 'center',
    });
  }

  // ─── Grid Position Helpers ──────────────────────────────────────

  tileToPixel(row: number, col: number): Vector2 {
    const { tileSize, gap } = this.config;
    return {
      x: col * (tileSize + gap) + tileSize / 2,
      y: row * (tileSize + gap) + tileSize / 2,
    };
  }

  pixelToTile(x: number, y: number): { row: number; col: number } | null {
    const { tileSize, gap, rows, cols } = this.config;
    const col = Math.floor(x / (tileSize + gap));
    const row = Math.floor(y / (tileSize + gap));
    if (row < 0 || row >= rows || col < 0 || col >= cols) return null;
    return { row, col };
  }

  get gridWidth(): number {
    const { tileSize, gap, cols } = this.config;
    return cols * tileSize + (cols - 1) * gap;
  }

  get gridHeight(): number {
    const { tileSize, gap, rows } = this.config;
    return rows * tileSize + (rows - 1) * gap;
  }

  // ─── Tile Management ────────────────────────────────────────────

  /** Set or update all tiles. Handles additions, removals, and moves. */
  setTiles(tiles: TileData[]): void {
    const newIds = new Set(tiles.map((t) => t.id));

    // Remove tiles no longer present — but keep tiles mid-clearing animation
    for (const [id, sprite] of this.tiles) {
      if (!newIds.has(id) && sprite.animState !== 'clearing') {
        this.container.removeChild(sprite.container);
        sprite.container.destroy({ children: true });
        this.tiles.delete(id);
      }
    }

    // Add or update tiles
    for (const data of tiles) {
      const existing = this.tiles.get(data.id);
      const pos = this.tileToPixel(data.row, data.col);

      if (existing) {
        // Update existing tile
        existing.data = data;
        existing.targetX = pos.x;
        existing.targetY = pos.y;

        // Check if position changed (tile fell) — allow from idle or appearing
        if (
          Math.abs(existing.container.y - pos.y) > 1 &&
          (existing.animState === 'idle' || existing.animState === 'appearing')
        ) {
          existing.fallFromY = existing.container.y;
          existing.animState = 'falling';
          existing.animProgress = 0;
          existing.container.scale.set(1);
          existing.container.alpha = 1;
        }

        this.drawTile(existing);
      } else {
        // Create new tile
        const sprite = this.createTileSprite(data, pos);
        this.tiles.set(data.id, sprite);
      }
    }
  }

  /** Mark tiles as clearing (triggers animation) */
  clearTiles(ids: string[]): void {
    for (const id of ids) {
      const sprite = this.tiles.get(id);
      if (sprite) {
        sprite.animState = 'clearing';
        sprite.animProgress = 0;
      }
    }
  }

  /** Animate two tiles swapping positions */
  swapTiles(idA: string, idB: string): void {
    const spriteA = this.tiles.get(idA);
    const spriteB = this.tiles.get(idB);
    if (!spriteA || !spriteB) return;

    // Store current positions as swap origins
    spriteA.swapFromX = spriteA.container.x;
    spriteA.swapFromY = spriteA.container.y;
    spriteB.swapFromX = spriteB.container.x;
    spriteB.swapFromY = spriteB.container.y;

    // Swap targets
    const tempX = spriteA.targetX;
    const tempY = spriteA.targetY;
    spriteA.targetX = spriteB.targetX;
    spriteA.targetY = spriteB.targetY;
    spriteB.targetX = tempX;
    spriteB.targetY = tempY;

    spriteA.animState = 'swapping';
    spriteA.animProgress = 0;
    spriteB.animState = 'swapping';
    spriteB.animProgress = 0;
  }

  /** Get the pixel center of a tile by ID */
  getTilePosition(id: string): Vector2 | null {
    const sprite = this.tiles.get(id);
    if (!sprite) return null;
    return { x: sprite.container.x, y: sprite.container.y };
  }

  // ─── Animation Update ──────────────────────────────────────────

  update(deltaSec: number): string[] {
    const cleared: string[] = [];
    // Bail if a parent.destroy({children:true}) tore us down before our own
    // destroy() ran — a queued rAF tick must not touch a nulled context.
    if (this._destroyed || this.container?.destroyed) return cleared;

    for (const [id, sprite] of this.tiles) {
      if (sprite.container.destroyed || !sprite.container.position) {
        this.tiles.delete(id);
        continue;
      }
      switch (sprite.animState) {
        case 'appearing': {
          sprite.animProgress += deltaSec / 0.2; // 200ms appear
          const t = Math.min(sprite.animProgress, 1);
          // Elastic overshoot
          const ease = t < 1 ? 1 - Math.pow(1 - t, 3) * Math.cos(t * Math.PI * 0.5) : 1;
          sprite.container.scale.set(ease);
          sprite.container.alpha = t;
          if (t >= 1) {
            sprite.animState = 'idle';
            sprite.container.scale.set(1);
            sprite.container.alpha = 1;
          }
          break;
        }

        case 'clearing': {
          sprite.animProgress += deltaSec / 0.25; // 250ms clear
          const t = Math.min(sprite.animProgress, 1);
          // Scale up + fade out + slight rotation
          sprite.container.scale.set(1 + t * 0.3);
          sprite.container.alpha = 1 - t;
          sprite.container.rotation = t * 0.15 * (Math.random() > 0.5 ? 1 : -1);
          if (t >= 1) {
            cleared.push(id);
            this.container.removeChild(sprite.container);
            sprite.container.destroy({ children: true });
            this.tiles.delete(id);
          }
          break;
        }

        case 'falling': {
          sprite.animProgress += deltaSec / 0.3; // 300ms fall
          const t = Math.min(sprite.animProgress, 1);
          // Cubic ease-out with slight bounce
          const ease = t < 0.9
            ? 1 - Math.pow(1 - t / 0.9, 3)
            : 1 + Math.sin((t - 0.9) / 0.1 * Math.PI) * 0.03;

          const fromY = sprite.fallFromY ?? sprite.container.y;
          sprite.container.y = fromY + (sprite.targetY - fromY) * ease;

          if (t >= 1) {
            sprite.container.y = sprite.targetY;
            sprite.animState = 'landing';
            sprite.animProgress = 0;
          }
          break;
        }

        case 'landing': {
          sprite.animProgress += deltaSec / 0.12; // 120ms squish
          const t = Math.min(sprite.animProgress, 1);
          // Squash and stretch
          const squish = 1 - Math.sin(t * Math.PI) * 0.08;
          const stretch = 1 + Math.sin(t * Math.PI) * 0.08;
          sprite.container.scale.set(stretch, squish);
          if (t >= 1) {
            sprite.container.scale.set(1, 1);
            sprite.animState = 'idle';
          }
          break;
        }

        case 'swapping': {
          sprite.animProgress += deltaSec / 0.2; // 200ms swap
          const t = Math.min(sprite.animProgress, 1);
          // Ease-out-back for satisfying overshoot
          const c = 1.2;
          const ease = 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
          const fromX = sprite.swapFromX ?? sprite.container.x;
          const fromY = sprite.swapFromY ?? sprite.container.y;
          sprite.container.x = fromX + (sprite.targetX - fromX) * ease;
          sprite.container.y = fromY + (sprite.targetY - fromY) * ease;
          // Slight scale bump at midpoint
          const scaleBump = 1 + Math.sin(t * Math.PI) * 0.08;
          sprite.container.scale.set(scaleBump);
          if (t >= 1) {
            sprite.container.x = sprite.targetX;
            sprite.container.y = sprite.targetY;
            sprite.container.scale.set(1);
            sprite.animState = 'idle';
          }
          break;
        }

        case 'idle': {
          // Smoothly lerp to target position
          const dx = sprite.targetX - sprite.container.x;
          const dy = sprite.targetY - sprite.container.y;
          if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
            sprite.container.x += dx * 0.15;
            sprite.container.y += dy * 0.15;
          }

          // Idle animations for special tiles + selected tiles
          sprite.animProgress += deltaSec;
          const t2 = sprite.animProgress;
          const variant = sprite.data.variant;

          // Pulse glow filter on special tiles
          if (sprite.glow) {
            sprite.glow.outerStrength = 2 + Math.sin(t2 * 3) * 1.5;
          }

          if (sprite.data.selected) {
            // Selected: gentle pulse + bright glow
            const pulse = 1 + Math.sin(t2 * 6) * 0.04;
            sprite.container.scale.set(pulse);
            if (sprite.glow) sprite.glow.outerStrength = 4;
          } else if (variant === 'bomb') {
            // Bomb: slow threatening pulse
            const pulse = 1 + Math.sin(t2 * 3) * 0.03;
            sprite.container.scale.set(pulse);
          } else if (variant === 'lightning') {
            // Lightning: quick flicker
            const flicker = 1 + Math.sin(t2 * 12) * 0.015;
            sprite.container.scale.set(flicker);
          } else if (variant === 'prism') {
            // Prism: slow rotation wobble
            sprite.container.rotation = Math.sin(t2 * 2) * 0.03;
          } else if (variant === 'gem') {
            // Gem: shimmer (scale Y)
            const shimmer = 1 + Math.sin(t2 * 4) * 0.02;
            sprite.container.scale.set(1, shimmer);
          } else if (variant === 'gold' || variant === 'diamond') {
            // Gold/Diamond: gentle glow pulse
            const glowPulse = 1 + Math.sin(t2 * 2.5) * 0.02;
            sprite.container.scale.set(glowPulse);
          } else if (variant === 'magnet') {
            // Magnet: slow rotation
            sprite.container.rotation = Math.sin(t2 * 1.5) * 0.05;
          }
          break;
        }
      }
    }

    return cleared;
  }

  // ─── Cleanup ────────────────────────────────────────────────────

  destroy(): void {
    this._destroyed = true;
    for (const sprite of this.tiles.values()) {
      sprite.container.destroy({ children: true });
    }
    this.tiles.clear();
    this.container.destroy({ children: true });
  }

  // ─── Internal ───────────────────────────────────────────────────

  private createTileSprite(data: TileData, pos: Vector2): TileSprite {
    const tileContainer = new Container();
    tileContainer.x = pos.x;
    tileContainer.y = pos.y - 50; // Start above for appear animation
    tileContainer.scale.set(0);
    tileContainer.alpha = 0;
    tileContainer.pivot.set(0, 0);

    const bg = new Graphics();
    const text = new Text({
      text: data.letter.toUpperCase(),
      style: this.textStyle,
    });
    text.anchor.set(0.5);

    tileContainer.addChild(bg, text);

    // Add indicator emoji for special tiles
    const indicatorChar = TILE_INDICATORS[data.variant];
    let indicator: Text | null = null;
    if (indicatorChar) {
      indicator = new Text({
        text: indicatorChar,
        style: new TextStyle({
          fontSize: this.config.tileSize * 0.22,
          align: 'center',
        }),
      });
      indicator.anchor.set(0.5);
      const half = this.config.tileSize / 2;
      indicator.x = half - this.config.tileSize * 0.15;
      indicator.y = -half + this.config.tileSize * 0.15;
      tileContainer.addChild(indicator);
    }

    this.container.addChild(tileContainer);

    // Enable interaction
    tileContainer.eventMode = 'static';
    tileContainer.cursor = 'pointer';

    // Apply glow filter to special tiles
    let glow: GlowFilter | null = null;
    const glowColors: Record<string, number> = {
      bomb: 0xff2200, lightning: 0xffee00, prism: 0xbb66ff,
      gem: 0x22dd88, gold: 0xffcc00, diamond: 0x55ddff,
      magnet: 0x9944ff, rainbow: 0xff6699,
    };
    if (glowColors[data.variant]) {
      glow = new GlowFilter({
        color: glowColors[data.variant],
        outerStrength: 2,
        innerStrength: 0.5,
        quality: 0.5,
      });
      tileContainer.filters = [glow];
    }

    const sprite: TileSprite = {
      container: tileContainer,
      bg,
      text,
      indicator,
      data,
      targetX: pos.x,
      targetY: pos.y,
      animState: 'appearing',
      animProgress: 0,
      glow,
    };

    this.drawTile(sprite);
    return sprite;
  }

  private drawTile(sprite: TileSprite): void {
    // A state-change redraw can land after teardown destroyed this tile's
    // Graphics (nulled context) — guard before .clear() (Sentry 1CW/1CK/1KM).
    if (this._destroyed || sprite.bg?.destroyed) return;
    const { tileSize, cornerRadius } = this.config;
    const theme = this.themes[sprite.data.variant] ?? this.themes.standard;
    const selected = sprite.data.selected ?? false;
    const variant = sprite.data.variant;
    const half = tileSize / 2;
    const fg = selected ? theme.selectedText : theme.text;
    const fill = selected ? theme.selectedBg : theme.bg;
    const r = cornerRadius ?? 4;

    sprite.bg.clear();

    // ─── Selected glow ring (drawn first, behind tile) ───────────
    if (selected) {
      // Outer glow
      sprite.bg
        .roundRect(-half - 5, -half - 5, tileSize + 10, tileSize + 10, r + 3)
        .fill({ color: 0x00ffff, alpha: 0.15 });
      // Inner ring
      sprite.bg
        .roundRect(-half - 3, -half - 3, tileSize + 6, tileSize + 6, r + 2)
        .stroke({ color: 0x00ffff, width: 3, alpha: 0.9 });
    }

    // ─── Hard shadow (neo-brutalist) ─────────────────────────────
    sprite.bg
      .roundRect(-half + 3, -half + 3, tileSize, tileSize, r)
      .fill({ color: 0x000000, alpha: 0.5 });

    // ─── Chunky border ───────────────────────────────────────────
    const borderColor = selected ? 0x00ffff : theme.borderColor;
    sprite.bg
      .roundRect(-half - 1, -half - 1, tileSize + 2, tileSize + 2, r + 1)
      .fill({ color: borderColor });

    // ─── Main fill ───────────────────────────────────────────────
    sprite.bg
      .roundRect(-half, -half, tileSize, tileSize, r)
      .fill({ color: fill });

    // ─── Inner shine (top-left highlight for 3D candy feel) ──────
    const shineAlpha = variant === 'standard' ? 0.25 : 0.35;
    sprite.bg
      .roundRect(-half + 2, -half + 2, tileSize * 0.55, tileSize * 0.35, r - 1)
      .fill({ color: 0xffffff, alpha: shineAlpha });

    // ─── Special tile decorations ────────────────────────────────
    switch (variant) {
      case 'bomb': {
        // Red radial warning stripes
        const stripe = tileSize * 0.12;
        sprite.bg.roundRect(-half + stripe, -half + stripe, tileSize - stripe * 2, tileSize - stripe * 2, r - 1)
          .stroke({ color: 0xff0000, width: 2, alpha: 0.6 });
        // Inner glow
        sprite.bg.circle(0, 0, tileSize * 0.25).fill({ color: 0xff6600, alpha: 0.4 });
        break;
      }
      case 'lightning': {
        // Electric glow lines
        sprite.bg.rect(-1, -half + 4, 2, tileSize - 8).fill({ color: 0xffff00, alpha: 0.5 });
        sprite.bg.rect(-half + 4, -1, tileSize - 8, 2).fill({ color: 0x88ffff, alpha: 0.3 });
        break;
      }
      case 'prism': {
        // Rainbow corner accents
        const cs = tileSize * 0.15;
        sprite.bg.rect(-half + 2, -half + 2, cs, cs).fill({ color: 0xff0000, alpha: 0.5 });
        sprite.bg.rect(half - 2 - cs, -half + 2, cs, cs).fill({ color: 0x00ff00, alpha: 0.5 });
        sprite.bg.rect(-half + 2, half - 2 - cs, cs, cs).fill({ color: 0x0088ff, alpha: 0.5 });
        sprite.bg.rect(half - 2 - cs, half - 2 - cs, cs, cs).fill({ color: 0xff00ff, alpha: 0.5 });
        break;
      }
      case 'gold': {
        // Sparkle dots
        sprite.bg.circle(-half * 0.4, -half * 0.4, 2).fill({ color: 0xffffff, alpha: 0.7 });
        sprite.bg.circle(half * 0.3, -half * 0.2, 1.5).fill({ color: 0xffffff, alpha: 0.5 });
        break;
      }
      case 'diamond': {
        // Diamond facet lines
        sprite.bg.moveTo(0, -half + 6).lineTo(half - 6, 0).stroke({ color: 0xffffff, width: 1, alpha: 0.4 });
        sprite.bg.moveTo(0, -half + 6).lineTo(-half + 6, 0).stroke({ color: 0xffffff, width: 1, alpha: 0.4 });
        break;
      }
      case 'gem': {
        // Emerald inner glow
        sprite.bg.circle(0, 0, tileSize * 0.22).fill({ color: 0x00ff88, alpha: 0.3 });
        break;
      }
      case 'magnet': {
        // Spiral suggestion (concentric arcs)
        sprite.bg.circle(0, 0, tileSize * 0.3).stroke({ color: 0xaa44ff, width: 1.5, alpha: 0.4 });
        sprite.bg.circle(0, 0, tileSize * 0.18).stroke({ color: 0xff44aa, width: 1, alpha: 0.3 });
        break;
      }
    }

    // ─── Letter text ─────────────────────────────────────────────
    sprite.text.text = sprite.data.letter.toUpperCase();
    sprite.text.style.fill = fg;
    // Bold text shadow for readability on special tiles
    if (variant !== 'standard') {
      sprite.text.style.dropShadow = {
        color: 0x000000,
        distance: 1,
        alpha: 0.5,
        angle: Math.PI / 4,
        blur: 0,
      };
    } else {
      sprite.text.style.dropShadow = false;
    }

    if (sprite.data.tint !== undefined) {
      sprite.container.tint = sprite.data.tint;
    }
  }
}
