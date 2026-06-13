// ─── Enhanced Blast Effects ──────────────────────────────────────────
// Leverages custom-pixi-particles effects (Shatter, Dissolve) to add
// high-fidelity tile destruction visuals on top of existing particle bursts.
//
// These effects operate on temporary PixiJS Sprites created at tile positions.
// The sprites are auto-cleaned up when the effect finishes.

import { Container, Graphics, RenderTexture, Sprite, Texture, Ticker, type Application, type TickerCallback } from 'pixi.js';

type TickerUpdatable = Container & { update?: TickerCallback<unknown> };

function removeFromTicker(effect: Container): void {
  const u = (effect as TickerUpdatable).update;
  if (typeof u === 'function') {
    Ticker.shared.remove(u, effect);
  }
}
import {
  ShatterEffect,
  DissolveEffect,
  CrystallizeEffect,
  MeltEffect,
  GlitchEffect,
  PrismRefractionEffect,
  GranularErosionEffect,
  PixelSortEffect,
  SlitScanEffect,
  LiquidMercuryEffect,
  MagneticAssemblyEffect,
  type IShatterEffectOptions,
  type IDissolveEffectOptions,
  type ICrystallizeEffectOptions,
  type IMeltEffectOptions,
  type IPrismRefractionEffectOptions,
  type IGranularErosionEffectOptions,
  type IPixelSortEffectOptions,
  type ISlitScanEffectOptions,
  type ILiquidMercuryEffectOptions,
  type IMagneticAssemblyOptions,
} from 'custom-pixi-particles';

// ─── Color Constants ──────────────────────────────────────────────────

const TILE_COLORS: Record<string, number> = {
  bomb: 0xff4400,
  diamond: 0x88ccff,
  gem: 0xffd700,
  ice: 0xaaddff,
  frozen: 0xccf0ff,
  gold: 0xffcc00,
  prism: 0xff44ff,
  countdown: 0xff6600,
  magnet: 0xa855f6,
  catalyst: 0xffaa00,
  shuffle: 0xff8c00,
  magma: 0xff4500,
  lightning: 0xffee00,
  portal: 0x8844ff,
  rainbow: 0xff44ff,
  mirror: 0xc0c0c0,
  silver: 0xb0b0b0,
};

const TILE_BORDER_COLORS: Record<string, number> = {
  bomb: 0xff2200,
  diamond: 0xeeffff,
  gem: 0xffee44,
  ice: 0xffffff,
  frozen: 0xe0ffff,
  gold: 0xffe088,
  prism: 0xffffff,
  countdown: 0xffee00,
  magnet: 0xe879f9,
  catalyst: 0xffee00,
  shuffle: 0xffbb66,
  magma: 0xff6633,
  lightning: 0xffffaa,
  portal: 0xaa66ff,
  rainbow: 0xffffff,
  mirror: 0xffffff,
  silver: 0xe0e0e0,
};

// ─── Sprite Factory ───────────────────────────────────────────────────

/** Create a temporary colored square Sprite that mimics a tile at (x, y). */
function createTileProxy(
  app: Application,
  parent: Container,
  x: number,
  y: number,
  size: number,
  tileType: string,
): Sprite {
  const fillColor = TILE_COLORS[tileType] ?? 0x888888;
  const borderColor = TILE_BORDER_COLORS[tileType] ?? 0xffffff;
  const r = Math.round(size * 0.15); // neo-brutalist rounded corners

  const g = new Graphics();
  // Outer glow halo
  g.roundRect(-size * 0.62, -size * 0.62, size * 1.24, size * 1.24, r * 1.4);
  g.fill({ color: fillColor, alpha: 0.2 });
  // Main body
  g.roundRect(-size / 2, -size / 2, size, size, r);
  g.fill({ color: fillColor });
  g.roundRect(-size / 2, -size / 2, size, size, r);
  g.stroke({ color: borderColor, width: 3 });
  // Inner shine — top highlight
  g.roundRect(-size * 0.32, -size * 0.38, size * 0.64, size * 0.28, r * 0.5);
  g.fill({ color: 0xffffff, alpha: 0.35 });
  // Bottom accent
  g.roundRect(-size * 0.25, size * 0.12, size * 0.5, size * 0.18, r * 0.4);
  g.fill({ color: 0x000000, alpha: 0.15 });

  // Guard: renderer may have been destroyed by the time an async effect fires
  if (!app.renderer || (app.renderer as { destroyed?: boolean }).destroyed) {
    g.destroy();
    // Return a sprite with a 1x1 white texture to prevent null texture crashes
    // in effects that read texture.alphaMode or compute colors from texture data
    const fallback = new Sprite(Texture.WHITE);
    fallback.anchor.set(0.5);
    fallback.x = x;
    fallback.y = y;
    fallback.width = size;
    fallback.height = size;
    return fallback;
  }
  const texture = app.renderer.generateTexture({
    target: g,
    resolution: 2,
  });
  g.destroy();

  const sprite = new Sprite(texture);
  sprite.anchor.set(0.5);
  sprite.x = x;
  sprite.y = y;
  sprite.width = size;
  sprite.height = size;
  parent.addChild(sprite);

  return sprite;
}

// ─── Effect Configs ───────────────────────────────────────────────────

const BOMB_SHATTER: IShatterEffectOptions = {
  gridCols: 8,
  gridRows: 8,
  explosionPower: 22,
  friction: 0.96,
  gravity: 500,
  turbulence: 6,
  lifetime: 1.1,
  fadeOutDuration: 0.4,
  mode: 'radial',
  randomizeScale: true,
  enableRotation: true,
  rotationStrength: 14,
  endTint: 0xff2200,
};

const DIAMOND_SHATTER: IShatterEffectOptions = {
  gridCols: 10,
  gridRows: 10,
  explosionPower: 14,
  friction: 0.982,
  gravity: 180,
  turbulence: 4,
  lifetime: 1.3,
  fadeOutDuration: 0.5,
  mode: 'swirl',
  swirlStrength: 7,
  randomizeScale: true,
  enableRotation: true,
  rotationStrength: 8,
  endTint: 0xeeffff,
};

const GEM_SHATTER: IShatterEffectOptions = {
  gridCols: 7,
  gridRows: 7,
  explosionPower: 16,
  friction: 0.97,
  gravity: 350,
  turbulence: 4,
  lifetime: 1.1,
  fadeOutDuration: 0.4,
  mode: 'radial',
  randomizeScale: true,
  enableRotation: true,
  rotationStrength: 10,
  endTint: 0xffee44,
};

const MAGNET_SHATTER: IShatterEffectOptions = {
  gridCols: 8,
  gridRows: 8,
  explosionPower: 20,
  friction: 0.955,
  gravity: 280,
  turbulence: 8,
  lifetime: 0.9,
  fadeOutDuration: 0.3,
  mode: 'swirl',
  swirlStrength: 12,
  randomizeScale: true,
  enableRotation: true,
  rotationStrength: 18,
  endTint: 0xe879f9,
};

const ICE_DISSOLVE: IDissolveEffectOptions = {
  pixelSize: 3,
  edgeSoftness: 0.8,
  driftStrength: 0.5,
  noiseIntensity: 1.0,
  lifetime: 0.8,
  fadeOutDuration: 0.35,
  direction: 'center-out',
};

const FROZEN_DISSOLVE: IDissolveEffectOptions = {
  pixelSize: 2,
  edgeSoftness: 0.9,
  driftStrength: 0.4,
  noiseIntensity: 0.9,
  lifetime: 1.0,
  fadeOutDuration: 0.45,
  direction: 'top-to-bottom',
};

// ─── New Effect Configs ──────────────────────────────────────────────

const DIAMOND_CRYSTALLIZE: ICrystallizeEffectOptions = {
  cellScale: 0.06,
  jitter: 0.6,
  highlightStrength: 0.9,
  edgeSoftness: 0.4,
  tintByCell: true,
  duration: 1.0,
};

const GOLD_MELT: IMeltEffectOptions = {
  gridCols: 7,
  gridRows: 7,
  gravity: 500,
  viscosity: 0.45,
  horizontalSpread: 0.5,
  duration: 1.1,
};

const SHUFFLE_SHATTER: IShatterEffectOptions = {
  gridCols: 6,
  gridRows: 6,
  explosionPower: 18,
  friction: 0.96,
  gravity: 200,
  turbulence: 8,
  lifetime: 1.0,
  fadeOutDuration: 0.4,
  mode: 'swirl',
  swirlStrength: 10,
  randomizeScale: true,
  enableRotation: true,
  rotationStrength: 16,
  endTint: 0xff8c00,
};

const MAGMA_SHATTER: IShatterEffectOptions = {
  gridCols: 10,
  gridRows: 10,
  explosionPower: 24,
  friction: 0.95,
  gravity: 600,
  turbulence: 5,
  lifetime: 1.2,
  fadeOutDuration: 0.35,
  mode: 'radial',
  randomizeScale: true,
  enableRotation: true,
  rotationStrength: 12,
  endTint: 0xff2200,
};

const PRISM_REFRACTION: IPrismRefractionEffectOptions = {
  dispersionStrength: 25,
  dispersionAngle: 0,
  duration: 0.9,
  scanSpeed: 3.5,
  fresnelPower: 4,
};

const COUNTDOWN_EROSION: IGranularErosionEffectOptions = {
  erosionProgress: 0.95,
  gravityScale: 1.8,
  windTurbulence: 1.0,
  grainSize: 2,
  duration: 0.9,
};

const LIGHTNING_PIXEL_SORT: IPixelSortEffectOptions = {
  direction: 'vertical',
  sortMode: 'luminance',
  sortOrder: 'descending',
  thresholdLow: 0.15,
  thresholdHigh: 0.85,
  duration: 0.5,
  intensity: 1.0,
};

const PORTAL_SLIT_SCAN: ISlitScanEffectOptions = {
  mode: 'slit-scan',
  speed: 5,
  amplitude: 14,
  frequency: 6,
  direction: 'vertical',
  duration: 0.8,
};

const CATALYST_MERCURY: ILiquidMercuryEffectOptions = {
  viscosity: 0.35,
  reflectivity: 1.0,
  rippleSpeed: 3.5,
  edgeRoundness: 0.8,
  duration: 0.9,
};

const RAINBOW_ASSEMBLY: IMagneticAssemblyOptions = {
  gridCols: 8,
  gridRows: 8,
  duration: 0.8,
  scatterRange: 220,
  stagger: 0.03,
  mode: 'vortex',
  startAlpha: 0,
};

// ─── Public API ───────────────────────────────────────────────────────

export interface EnhancedEffectsManager {
  shatterTile(x: number, y: number, tileType: string): void;
  dissolveTile(x: number, y: number, tileType: string): void;
  crystallizeTile(x: number, y: number, tileType: string): void;
  meltTile(x: number, y: number, tileType: string): void;
  glitchTile(x: number, y: number, tileType: string): void;
  prismRefractTile(x: number, y: number, tileType: string): void;
  erodeTile(x: number, y: number, tileType: string): void;
  pixelSortTile(x: number, y: number, tileType: string): void;
  slitScanTile(x: number, y: number, tileType: string): void;
  mercuryTile(x: number, y: number, tileType: string): void;
  assembleTile(x: number, y: number, tileType: string): void;
  destroy(): void;
}

/**
 * Hard ceiling (ms) on a single tile effect's lifetime. Real shatter/dissolve
 * effects finish in well under a second; this only fires when a promise stalls,
 * forcing cleanup so orphaned sprites/particles can't linger forever.
 */
const EFFECT_MAX_LIFETIME_MS = 3000;

/** Create an enhanced effects manager bound to a PixiJS app and container. */
export function createEnhancedEffects(
  app: Application,
  camera: Container,
  cellSize: number,
): EnhancedEffectsManager {
  const activeEffects = new Set<Container>();
  const effectTimers = new Set<ReturnType<typeof setTimeout>>();
  let destroyed = false;

  function shatterTile(x: number, y: number, tileType: string): void {
    if (destroyed) return;
    const sprite = createTileProxy(app, camera, x, y, cellSize * 0.9, tileType);
    const configMap: Record<string, IShatterEffectOptions> = {
      bomb: BOMB_SHATTER,
      diamond: DIAMOND_SHATTER,
      gem: GEM_SHATTER,
      magnet: MAGNET_SHATTER,
      shuffle: SHUFFLE_SHATTER,
      magma: MAGMA_SHATTER,
    };
    const config = configMap[tileType] ?? BOMB_SHATTER;
    const effect = new ShatterEffect(sprite, { ...config, explosionOrigin: { x: 0.5, y: 0.5 } });
    trackEffect(effect, sprite, effect.Explode());
  }

  function dissolveTile(x: number, y: number, tileType: string): void {
    if (destroyed) return;
    const sprite = createTileProxy(app, camera, x, y, cellSize * 0.9, tileType);

    // DissolveEffect samples per-pixel colors by drawing texture.source.resource
    // (an HTMLCanvas/Image/ImageBitmap) onto a 2D canvas. createTileProxy builds the
    // proxy from app.renderer.generateTexture(), which yields a GPU RenderTexture with
    // NO cpu-readable source.resource. In that case DissolveEffect.prepare() bails with
    // a "Could not find valid resource on texture.source." console warning and produces
    // zero fragments — a dead, noisy no-op. (The old try/catch here never fired:
    // prepare() warns + returns, it does not throw.) Detect the unreadable texture up
    // front, skip the effect, and clean up the orphaned proxy instead.
    const source = (sprite.texture as { source?: { resource?: unknown } } | undefined)?.source;
    if (!source?.resource) {
      try { if (sprite.parent) sprite.parent.removeChild(sprite); } catch { /* */ }
      if (sprite.texture && sprite.texture !== RenderTexture.EMPTY) {
        try { sprite.texture.destroy(true); } catch { /* */ }
      }
      try { sprite.destroy(); } catch { /* already cleaned */ }
      return;
    }

    const config = tileType === 'frozen' ? FROZEN_DISSOLVE : ICE_DISSOLVE;
    const effect = new DissolveEffect(sprite, config);
    trackEffect(effect, sprite, effect.dissolve());
  }

  /** Helper: track a promise-based effect and clean up when done. */
  function trackEffect(effect: Container, sprite: Sprite, promise: Promise<void>): void {
    // Hide the proxy sprite immediately — the effect container renders the visuals.
    // Without this, the colored rect stays visible behind/after the effect.
    sprite.visible = false;

    camera.addChild(effect);
    activeEffects.add(effect);

    let settled = false;
    let backstop: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      // Run exactly once — whichever of (promise settle, timeout backstop) wins.
      if (settled) return;
      settled = true;
      if (backstop !== null) { clearTimeout(backstop); effectTimers.delete(backstop); backstop = null; }
      activeEffects.delete(effect);
      // If manager was already destroyed, containers were cleaned up in destroy()
      if (destroyed) return;
      // Remove effect container from scene graph, then destroy
      try { if (effect.parent) effect.parent.removeChild(effect); } catch { /* */ }
      try { removeFromTicker(effect); } catch { /* already removed */ }
      try { effect.destroy({ children: true }); } catch { /* already cleaned */ }
      // Remove proxy sprite from scene graph, destroy texture, then sprite
      try { if (sprite.parent) sprite.parent.removeChild(sprite); } catch { /* */ }
      if (sprite.texture && sprite.texture !== RenderTexture.EMPTY) {
        try { sprite.texture.destroy(true); } catch { /* */ }
      }
      try { sprite.destroy(); } catch { /* */ }
    };

    // Backstop: if the custom-pixi-particles promise never settles (renderer torn
    // down mid-animation, ticker callback dropped), force cleanup after a hard
    // ceiling so orphaned proxies + red bomb shards can't linger on camera forever.
    backstop = setTimeout(cleanup, EFFECT_MAX_LIFETIME_MS);
    effectTimers.add(backstop);

    promise.then(cleanup).catch(cleanup);
  }

  function crystallizeTile(x: number, y: number, tileType: string): void {
    if (destroyed) return;
    const sprite = createTileProxy(app, camera, x, y, cellSize * 0.9, tileType);
    const effect = new CrystallizeEffect(sprite, DIAMOND_CRYSTALLIZE);
    trackEffect(effect, sprite, effect.play());
  }

  function meltTile(x: number, y: number, tileType: string): void {
    if (destroyed) return;
    const sprite = createTileProxy(app, camera, x, y, cellSize * 0.9, tileType);
    const effect = new MeltEffect(sprite, GOLD_MELT);
    trackEffect(effect, sprite, effect.melt());
  }

  function glitchTile(x: number, y: number, tileType: string): void {
    if (destroyed) return;
    const sprite = createTileProxy(app, camera, x, y, cellSize * 0.9, tileType);
    const effect = new GlitchEffect(sprite, { slices: 10, offsetRange: 16, flickerIntensity: 0.8, rgbSplit: true, rgbOffset: 6, duration: 0.5, refreshRate: 0.04 });
    trackEffect(effect, sprite, effect.glitch());
  }

  function prismRefractTile(x: number, y: number, tileType: string): void {
    if (destroyed) return;
    const sprite = createTileProxy(app, camera, x, y, cellSize * 0.9, tileType);
    const effect = new PrismRefractionEffect(sprite, PRISM_REFRACTION);
    trackEffect(effect, sprite, effect.play());
  }

  function erodeTile(x: number, y: number, tileType: string): void {
    if (destroyed) return;
    const sprite = createTileProxy(app, camera, x, y, cellSize * 0.9, tileType);
    const effect = new GranularErosionEffect(sprite, COUNTDOWN_EROSION);
    trackEffect(effect, sprite, effect.play());
  }

  function pixelSortTile(x: number, y: number, tileType: string): void {
    if (destroyed) return;
    const sprite = createTileProxy(app, camera, x, y, cellSize * 0.9, tileType);
    const effect = new PixelSortEffect(sprite, LIGHTNING_PIXEL_SORT);
    trackEffect(effect, sprite, effect.pixelSort());
  }

  function slitScanTile(x: number, y: number, tileType: string): void {
    if (destroyed) return;
    const sprite = createTileProxy(app, camera, x, y, cellSize * 0.9, tileType);
    const effect = new SlitScanEffect(sprite, PORTAL_SLIT_SCAN);
    trackEffect(effect, sprite, effect.play());
  }

  function mercuryTile(x: number, y: number, tileType: string): void {
    if (destroyed) return;
    const sprite = createTileProxy(app, camera, x, y, cellSize * 0.9, tileType);
    const effect = new LiquidMercuryEffect(sprite, CATALYST_MERCURY);
    trackEffect(effect, sprite, effect.play());
  }

  function assembleTile(x: number, y: number, tileType: string): void {
    if (destroyed) return;
    const sprite = createTileProxy(app, camera, x, y, cellSize * 0.9, tileType);
    const effect = new MagneticAssemblyEffect(sprite, RAINBOW_ASSEMBLY);
    trackEffect(effect, sprite, effect.assemble());
  }

  function destroy(): void {
    destroyed = true;
    // Cancel pending backstop timers so none fires a late cleanup after teardown.
    for (const timer of effectTimers) clearTimeout(timer);
    effectTimers.clear();
    for (const effect of activeEffects) {
      try { if (effect.parent) effect.parent.removeChild(effect); } catch { /* */ }
      try { removeFromTicker(effect); } catch { /* already removed */ }
      try { effect.destroy({ children: true }); } catch { /* */ }
    }
    activeEffects.clear();
  }

  return {
    shatterTile, dissolveTile, crystallizeTile, meltTile,
    glitchTile, prismRefractTile, erodeTile, pixelSortTile,
    slitScanTile, mercuryTile, assembleTile, destroy,
  };
}
