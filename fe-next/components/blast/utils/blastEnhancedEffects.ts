// ─── Enhanced Blast Effects ──────────────────────────────────────────
// Leverages custom-pixi-particles effects (Shatter, Dissolve) to add
// high-fidelity tile destruction visuals on top of existing particle bursts.
//
// These effects operate on temporary PixiJS Sprites created at tile positions.
// The sprites are auto-cleaned up when the effect finishes.

import { Container, Graphics, RenderTexture, Sprite, type Application } from 'pixi.js';
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
  type IGlitchEffectOptions,
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
  virus: 0x44ff44,
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
  virus: 0x22ff22,
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
  // Border
  g.roundRect(-size / 2, -size / 2, size, size, r);
  g.fill({ color: fillColor });
  g.roundRect(-size / 2, -size / 2, size, size, r);
  g.stroke({ color: borderColor, width: 2 });
  // Inner highlight
  g.roundRect(-size * 0.3, -size * 0.3, size * 0.6, size * 0.3, r * 0.5);
  g.fill({ color: 0xffffff, alpha: 0.25 });

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
  pixelSize: 4,
  edgeSoftness: 0.6,
  driftStrength: 0.3,
  noiseIntensity: 0.8,
  lifetime: 0.6,
  fadeOutDuration: 0.3,
  direction: 'center-out',
};

const FROZEN_DISSOLVE: IDissolveEffectOptions = {
  pixelSize: 3,
  edgeSoftness: 0.8,
  driftStrength: 0.2,
  noiseIntensity: 0.6,
  lifetime: 0.8,
  fadeOutDuration: 0.4,
  direction: 'top-to-bottom',
};

// ─── New Effect Configs ──────────────────────────────────────────────

const DIAMOND_CRYSTALLIZE: ICrystallizeEffectOptions = {
  cellScale: 0.08,
  jitter: 0.4,
  highlightStrength: 0.7,
  edgeSoftness: 0.3,
  tintByCell: true,
  duration: 0.8,
};

const GOLD_MELT: IMeltEffectOptions = {
  gridCols: 5,
  gridRows: 5,
  gravity: 350,
  viscosity: 0.6,
  horizontalSpread: 0.3,
  duration: 0.9,
};

const VIRUS_GLITCH: IGlitchEffectOptions = {
  slices: 8,
  offsetRange: 12,
  flickerIntensity: 0.7,
  rgbSplit: true,
  rgbOffset: 4,
  duration: 0.5,
  refreshRate: 0.05,
};

const PRISM_REFRACTION: IPrismRefractionEffectOptions = {
  dispersionStrength: 15,
  dispersionAngle: 0,
  duration: 0.7,
  scanSpeed: 2.5,
  fresnelPower: 3,
};

const COUNTDOWN_EROSION: IGranularErosionEffectOptions = {
  erosionProgress: 0.8,
  gravityScale: 1.2,
  windTurbulence: 0.6,
  grainSize: 3,
  duration: 0.7,
};

const LIGHTNING_PIXEL_SORT: IPixelSortEffectOptions = {
  direction: 'vertical',
  sortMode: 'luminance',
  sortOrder: 'descending',
  thresholdLow: 0.2,
  thresholdHigh: 0.8,
  duration: 0.4,
  intensity: 0.9,
};

const PORTAL_SLIT_SCAN: ISlitScanEffectOptions = {
  mode: 'slit-scan',
  speed: 3,
  amplitude: 8,
  frequency: 4,
  direction: 'vertical',
  duration: 0.6,
};

const CATALYST_MERCURY: ILiquidMercuryEffectOptions = {
  viscosity: 0.5,
  reflectivity: 0.8,
  rippleSpeed: 2,
  edgeRoundness: 0.6,
  duration: 0.7,
};

const MIRROR_CRYSTALLIZE: ICrystallizeEffectOptions = {
  cellScale: 0.06,
  jitter: 0.2,
  highlightStrength: 0.9,
  edgeSoftness: 0.15,
  tintByCell: false,
  duration: 0.7,
};

const SILVER_SHATTER: IShatterEffectOptions = {
  gridCols: 7,
  gridRows: 7,
  explosionPower: 9,
  friction: 0.98,
  gravity: 250,
  turbulence: 1.5,
  lifetime: 0.85,
  fadeOutDuration: 0.35,
  mode: 'radial',
  randomizeScale: true,
  enableRotation: true,
  rotationStrength: 4,
  endTint: 0xe0e0e0,
};

const RAINBOW_ASSEMBLY: IMagneticAssemblyOptions = {
  gridCols: 6,
  gridRows: 6,
  duration: 0.6,
  scatterRange: 150,
  stagger: 0.05,
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
  mirrorCrystallizeTile(x: number, y: number, tileType: string): void;
  silverShatterTile(x: number, y: number, tileType: string): void;
  destroy(): void;
}

/** Create an enhanced effects manager bound to a PixiJS app and container. */
export function createEnhancedEffects(
  app: Application,
  camera: Container,
  cellSize: number,
): EnhancedEffectsManager {
  const activeEffects = new Set<Container>();
  let destroyed = false;

  function shatterTile(x: number, y: number, tileType: string): void {
    if (destroyed) return;
    const sprite = createTileProxy(app, camera, x, y, cellSize * 0.9, tileType);
    const configMap: Record<string, IShatterEffectOptions> = {
      bomb: BOMB_SHATTER,
      diamond: DIAMOND_SHATTER,
      gem: GEM_SHATTER,
      magnet: MAGNET_SHATTER,
    };
    const config = configMap[tileType] ?? BOMB_SHATTER;
    const effect = new ShatterEffect(sprite, { ...config, explosionOrigin: { x: 0.5, y: 0.5 } });
    trackEffect(effect, sprite, effect.Explode());
  }

  function dissolveTile(x: number, y: number, tileType: string): void {
    if (destroyed) return;
    const sprite = createTileProxy(app, camera, x, y, cellSize * 0.9, tileType);
    const config = tileType === 'frozen' ? FROZEN_DISSOLVE : ICE_DISSOLVE;
    try {
      const effect = new DissolveEffect(sprite, config);
      trackEffect(effect, sprite, effect.dissolve());
    } catch {
      // RenderTexture has no canvas resource — fall back: remove + destroy
      try { if (sprite.parent) sprite.parent.removeChild(sprite); } catch { /* */ }
      if (sprite.texture && sprite.texture !== RenderTexture.EMPTY) {
        try { sprite.texture.destroy(true); } catch { /* */ }
      }
      try { sprite.destroy(); } catch { /* already cleaned */ }
    }
  }

  /** Helper: track a promise-based effect and clean up when done. */
  function trackEffect(effect: Container, sprite: Sprite, promise: Promise<void>): void {
    // Hide the proxy sprite immediately — the effect container renders the visuals.
    // Without this, the colored rect stays visible behind/after the effect.
    sprite.visible = false;

    camera.addChild(effect);
    activeEffects.add(effect);

    const cleanup = () => {
      activeEffects.delete(effect);
      // Remove effect container from scene graph, then destroy
      try { if (effect.parent) effect.parent.removeChild(effect); } catch { /* */ }
      try { effect.destroy({ children: true }); } catch { /* already cleaned */ }
      // Remove proxy sprite from scene graph, destroy texture, then sprite
      try { if (sprite.parent) sprite.parent.removeChild(sprite); } catch { /* */ }
      if (sprite.texture && sprite.texture !== RenderTexture.EMPTY) {
        try { sprite.texture.destroy(true); } catch { /* */ }
      }
      try { sprite.destroy(); } catch { /* */ }
    };

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
    const effect = new GlitchEffect(sprite, VIRUS_GLITCH);
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

  function mirrorCrystallizeTile(x: number, y: number, tileType: string): void {
    if (destroyed) return;
    const sprite = createTileProxy(app, camera, x, y, cellSize * 0.9, tileType);
    const effect = new CrystallizeEffect(sprite, MIRROR_CRYSTALLIZE);
    trackEffect(effect, sprite, effect.play());
  }

  function silverShatterTile(x: number, y: number, tileType: string): void {
    if (destroyed) return;
    const sprite = createTileProxy(app, camera, x, y, cellSize * 0.9, tileType);
    const effect = new ShatterEffect(sprite, { ...SILVER_SHATTER, explosionOrigin: { x: 0.5, y: 0.5 } });
    trackEffect(effect, sprite, effect.Explode());
  }

  function destroy(): void {
    destroyed = true;
    for (const effect of activeEffects) {
      try { if (effect.parent) effect.parent.removeChild(effect); } catch { /* */ }
      try { effect.destroy({ children: true }); } catch { /* */ }
    }
    activeEffects.clear();
  }

  return {
    shatterTile, dissolveTile, crystallizeTile, meltTile,
    glitchTile, prismRefractTile, erodeTile, pixelSortTile,
    slitScanTile, mercuryTile, assembleTile,
    mirrorCrystallizeTile, silverShatterTile, destroy,
  };
}
