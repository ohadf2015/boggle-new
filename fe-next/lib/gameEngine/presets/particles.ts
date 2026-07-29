// ─── Particle Effect Presets ──────────────────────────────────────────
// Ready-to-use particle configurations for common game effects.
// All presets are ParticleConfig objects — pass to ParticlePool.burst() or .create().

import type { ParticleConfig } from '../types';

// ─── Tile Clear Explosion ─────────────────────────────────────────────
// Burst of sparks when a tile is cleared. Fast, bright, short-lived.

export const TILE_EXPLOSION: ParticleConfig = {
  maxParticles: 30,
  frequency: 0.001,
  emitterLifetime: 0.1,
  particlesPerWave: 30,
  lifetime: { min: 0.25, max: 0.6 },
  speed: { min: 180, max: 450 },
  gravity: { x: 0, y: 250 },
  scale: { start: 1.5, end: 0 },
  alpha: { start: 1, end: 0 },
  rotationSpeed: { min: -240, max: 240 },
  colors: ['00ffff', 'ffffff', 'bfff00', '88ddff'],
  spawnShape: 'burst',
  spawnConfig: { directions: 16 },
  blendMode: 'add',
};

// ─── Combo Flash ──────────────────────────────────────────────────────
// Radial burst for combo announcements. Larger, more dramatic.

export const COMBO_FLASH: ParticleConfig = {
  maxParticles: 30,
  frequency: 0.001,
  emitterLifetime: 0.15,
  particlesPerWave: 30,
  lifetime: { min: 0.3, max: 0.7 },
  speed: { min: 200, max: 600 },
  gravity: { x: 0, y: 100 },
  scale: { start: 1.5, end: 0.2 },
  alpha: { start: 1, end: 0 },
  rotationSpeed: { min: -90, max: 90 },
  colors: ['00ffff', 'ffffff', 'ff00ff'],
  spawnShape: 'burst',
  spawnConfig: { directions: 16 },
  blendMode: 'add',
};

// ─── Chain Cascade Sparkle ────────────────────────────────────────────
// Gentle upward sparkles during cascade chains. Sustained effect.

export const CASCADE_SPARKLE: ParticleConfig = {
  maxParticles: 40,
  frequency: 0.03,
  emitterLifetime: 0,
  particlesPerWave: 2,
  lifetime: { min: 0.5, max: 1.2 },
  speed: { min: 30, max: 80 },
  gravity: { x: 0, y: -60 },
  scale: { start: 0.8, end: 0 },
  alpha: { start: 0.9, end: 0 },
  rotationSpeed: { min: -45, max: 45 },
  colors: ['88ddff', 'ffffff', 'aaffaa'],
  spawnShape: 'rect',
  spawnConfig: { width: 200, height: 10 },
};

// ─── Word Path Trail ──────────────────────────────────────────────────
// Follows the player's finger during word selection. Small, fast fade.

export const WORD_TRAIL: ParticleConfig = {
  maxParticles: 60,
  frequency: 0.008,
  emitterLifetime: 0,
  particlesPerWave: 2,
  lifetime: { min: 0.2, max: 0.5 },
  speed: { min: 20, max: 60 },
  gravity: { x: 0, y: -20 },
  scale: { start: 1.0, end: 0.1 },
  alpha: { start: 1, end: 0 },
  colors: ['00ffff', 'ffffff', '88ddff'],
  spawnShape: 'circle',
  spawnConfig: { radius: 8 },
  blendMode: 'add',
};

// ─── Score Fly Sparkle ────────────────────────────────────────────────
// Tiny trail behind flying score numbers.

export const SCORE_TRAIL: ParticleConfig = {
  maxParticles: 15,
  frequency: 0.02,
  emitterLifetime: 0,
  particlesPerWave: 1,
  lifetime: { min: 0.1, max: 0.3 },
  speed: { min: 5, max: 20 },
  gravity: { x: 0, y: 30 },
  scale: { start: 0.4, end: 0 },
  alpha: { start: 0.7, end: 0 },
  colors: ['ffff88', 'ffffff'],
  spawnShape: 'point',
  blendMode: 'add',
};

// ─── Board Clear Celebration ──────────────────────────────────────────
// Big celebration burst when a wave is cleared. Multi-color confetti.

export const BOARD_CLEAR: ParticleConfig = {
  maxParticles: 60,
  frequency: 0.001,
  emitterLifetime: 0.2,
  particlesPerWave: 60,
  lifetime: { min: 0.8, max: 1.5 },
  speed: { min: 100, max: 500 },
  gravity: { x: 0, y: 400 },
  scale: { start: 1.0, end: 0.5 },
  alpha: { start: 1, end: 0.3 },
  rotationSpeed: { min: -360, max: 360 },
  colors: ['ff4444', 'ffaa00', '44ff44', '4488ff', 'ff44ff', 'ffff44'],
  spawnShape: 'burst',
  spawnConfig: { directions: 24 },
};

// ─── Bomb Explosion ──────────────────────────────────────────────────
// Heavy, fiery explosion for bomb tile activation.

export const BOMB_EXPLOSION: ParticleConfig = {
  maxParticles: 50,
  frequency: 0.001,
  emitterLifetime: 0.12,
  particlesPerWave: 50,
  lifetime: { min: 0.3, max: 0.9 },
  speed: { min: 250, max: 600 },
  gravity: { x: 0, y: 350 },
  scale: { start: 2.5, end: 0 },
  alpha: { start: 1, end: 0 },
  rotationSpeed: { min: -300, max: 300 },
  colors: ['ff2200', 'ff6600', 'ffaa00', 'ffee00', 'ffffff'],
  spawnShape: 'burst',
  spawnConfig: { directions: 24 },
  blendMode: 'add',
};

// ─── Lightning Strike ─────────────────────────────────────────────────
// Vertical column of electric sparks for lightning tile.

export const LIGHTNING_SPARK: ParticleConfig = {
  maxParticles: 45,
  frequency: 0.001,
  emitterLifetime: 0.15,
  particlesPerWave: 45,
  lifetime: { min: 0.15, max: 0.5 },
  speed: { min: 80, max: 350 },
  gravity: { x: 0, y: 0 },
  scale: { start: 1.2, end: 0 },
  alpha: { start: 1, end: 0 },
  rotationSpeed: { min: -400, max: 400 },
  colors: ['00ffff', 'ffffff', '88eeff', 'aaddff', 'ccffff'],
  spawnShape: 'rect',
  spawnConfig: { width: 14, height: 400 },
  blendMode: 'add',
};

// ─── Prism Cross ──────────────────────────────────────────────────────
// Rainbow cross pattern for prism tile activation.

export const PRISM_CROSS: ParticleConfig = {
  maxParticles: 35,
  frequency: 0.001,
  emitterLifetime: 0.15,
  particlesPerWave: 35,
  lifetime: { min: 0.3, max: 0.6 },
  speed: { min: 100, max: 350 },
  gravity: { x: 0, y: 0 },
  scale: { start: 1.0, end: 0.2 },
  alpha: { start: 1, end: 0 },
  colors: ['ff0000', 'ff8800', 'ffff00', '00ff00', '0088ff', '8800ff'],
  spawnShape: 'burst',
  spawnConfig: { directions: 4 },
  blendMode: 'add',
};

const PRISM_RAINBOW = PRISM_CROSS.colors;

// ─── Prism Directional Beams ─────────────────────────────────────────
// 4 directional rainbow beams fired from the prism tile position.

export const PRISM_BEAM_UP: ParticleConfig = {
  maxParticles: 20,
  frequency: 0.001,
  emitterLifetime: 0.12,
  particlesPerWave: 20,
  lifetime: { min: 0.2, max: 0.5 },
  speed: { min: 200, max: 500 },
  gravity: { x: 0, y: 0 },
  scale: { start: 1.2, end: 0 },
  alpha: { start: 1, end: 0 },
  colors: PRISM_RAINBOW,
  spawnShape: 'rect',
  spawnConfig: { width: 6, height: 60 },
  blendMode: 'add',
};

export const PRISM_BEAM_DOWN: ParticleConfig = {
  ...PRISM_BEAM_UP,
  spawnConfig: { width: 6, height: 60 },
};

export const PRISM_BEAM_LEFT: ParticleConfig = {
  ...PRISM_BEAM_UP,
  spawnConfig: { width: 60, height: 6 },
};

export const PRISM_BEAM_RIGHT: ParticleConfig = {
  ...PRISM_BEAM_UP,
  spawnConfig: { width: 60, height: 6 },
};

// ─── Gem Shatter ──────────────────────────────────────────────────────
// Crystalline shatter when gem tile completes 3 hits.

export const GEM_SHATTER: ParticleConfig = {
  maxParticles: 25,
  frequency: 0.001,
  emitterLifetime: 0.1,
  particlesPerWave: 25,
  lifetime: { min: 0.4, max: 0.9 },
  speed: { min: 100, max: 300 },
  gravity: { x: 0, y: 250 },
  scale: { start: 1.2, end: 0.3 },
  alpha: { start: 1, end: 0.2 },
  rotationSpeed: { min: -300, max: 300 },
  colors: ['88ffff', 'ffffff', 'cc88ff', '88ff88'],
  spawnShape: 'burst',
  spawnConfig: { directions: 10 },
};

// ─── Background Ambient ───────────────────────────────────────────────
// Slow floating bokeh dots for background energy.

export const AMBIENT_BOKEH: ParticleConfig = {
  maxParticles: 20,
  frequency: 0.3,
  emitterLifetime: 0,
  particlesPerWave: 1,
  lifetime: { min: 3, max: 6 },
  speed: { min: 5, max: 15 },
  gravity: { x: 0, y: -8 },
  scale: { start: 0.3, end: 0.6 },
  alpha: { start: 0, end: 0.15 },
  colors: ['4488ff', '8844ff', '44ffaa'],
  spawnShape: 'rect',
  spawnConfig: { width: 400, height: 600 },
};

// ─── Vortex Pull ──────────────────────────────────────────────────────
// Inward spiral for vortex tile activation.

export const VORTEX_PULL: ParticleConfig = {
  maxParticles: 30,
  frequency: 0.015,
  emitterLifetime: 0.6,
  particlesPerWave: 4,
  lifetime: { min: 0.3, max: 0.7 },
  speed: { min: 80, max: 200 },
  gravity: { x: 0, y: 0 },
  scale: { start: 1.0, end: 0 },
  alpha: { start: 0.9, end: 0 },
  rotationSpeed: { min: -360, max: 360 },
  colors: ['a855f6', '8b5cf6', 'c084fc', 'e879f9', 'ffffff'],
  spawnShape: 'circle',
  spawnConfig: { radius: 90 },
  blendMode: 'add',
  shape: 'ring-3',
};

// ─── Vortex Explosion ────────────────────────────────────────────────
// Radial burst after magnet pull completes. Higher force than bomb.

export const VORTEX_EXPLOSION: ParticleConfig = {
  maxParticles: 40,
  frequency: 0.001,
  emitterLifetime: 0.12,
  particlesPerWave: 40,
  lifetime: { min: 0.3, max: 0.8 },
  speed: { min: 300, max: 700 },
  gravity: { x: 0, y: 200 },
  scale: { start: 2.0, end: 0 },
  alpha: { start: 1, end: 0 },
  rotationSpeed: { min: -400, max: 400 },
  colors: ['a855f6', '8b5cf6', 'e879f9', 'ffffff', 'f0abfc'],
  spawnShape: 'burst',
  spawnConfig: { directions: 20 },
  blendMode: 'add',
  shape: 'star',
};

// ─── Tile Explosion Variations ───────────────────────────────────────
// Alternate burst patterns for standard tile clears — picked randomly.

/** Tight implosion then outward pop */
export const TILE_IMPLOSION: ParticleConfig = {
  ...TILE_EXPLOSION,
  speed: { min: 60, max: 200 },
  scale: { start: 0.3, end: 2.0 },
  lifetime: { min: 0.15, max: 0.4 },
  colors: ['ffffff', 'bfff00', '00ffff'],
  spawnConfig: { directions: 8 },
};

/** Spiraling sparks that corkscrew outward */
export const TILE_SPIRAL: ParticleConfig = {
  ...TILE_EXPLOSION,
  rotationSpeed: { min: -600, max: 600 },
  speed: { min: 100, max: 300 },
  lifetime: { min: 0.3, max: 0.8 },
  colors: ['00ffff', 'ff88cc', 'ffffff', 'bfff00'],
  spawnShape: 'circle',
  spawnConfig: { radius: 6 },
};

/** Heavy debris with gravity — shards rain down */
export const TILE_SHRAPNEL: ParticleConfig = {
  ...TILE_EXPLOSION,
  gravity: { x: 0, y: 500 },
  speed: { min: 250, max: 550 },
  scale: { start: 2.0, end: 0.4 },
  lifetime: { min: 0.4, max: 0.9 },
  colors: ['ffcc00', 'ffffff', '88ddff'],
  shape: 'rect',
};

/** All tile explosion variants for random selection */
export const TILE_EXPLOSION_VARIANTS: readonly ParticleConfig[] = [
  TILE_EXPLOSION, TILE_EXPLOSION, TILE_IMPLOSION, TILE_SPIRAL, TILE_SHRAPNEL,
];

// ─── Bomb Explosion Variations ──────────────────────────────────────

/** Slow-mo nuclear flash — big scale, long lifetime */
export const BOMB_NUCLEAR: ParticleConfig = {
  ...BOMB_EXPLOSION,
  maxParticles: 60,
  particlesPerWave: 60,
  scale: { start: 3.5, end: 0 },
  lifetime: { min: 0.5, max: 1.2 },
  speed: { min: 150, max: 400 },
  colors: ['ffffff', 'ffee00', 'ff6600', 'ff2200'],
};

/** Fragmentation burst — many small fast pieces */
export const BOMB_FRAG: ParticleConfig = {
  ...BOMB_EXPLOSION,
  maxParticles: 70,
  particlesPerWave: 70,
  scale: { start: 0.8, end: 0 },
  speed: { min: 400, max: 800 },
  lifetime: { min: 0.15, max: 0.4 },
  colors: ['ff4400', 'ffaa00', 'ffffff'],
  spawnConfig: { directions: 32 },
  shape: 'rect',
};

export const BOMB_EXPLOSION_VARIANTS: readonly ParticleConfig[] = [
  BOMB_EXPLOSION, BOMB_EXPLOSION, BOMB_NUCLEAR, BOMB_FRAG,
];

// ─── Combo Flash Variations (PixiJS layer) ──────────────────────────

/** Tight star-burst with fewer, brighter particles */
export const COMBO_FLASH_TIGHT: ParticleConfig = {
  ...COMBO_FLASH,
  maxParticles: 16,
  particlesPerWave: 16,
  speed: { min: 350, max: 800 },
  lifetime: { min: 0.15, max: 0.4 },
  scale: { start: 2.0, end: 0 },
  spawnConfig: { directions: 8 },
  shape: 'star',
};

/** Wide ring expansion */
export const COMBO_FLASH_RING: ParticleConfig = {
  ...COMBO_FLASH,
  scale: { start: 0.5, end: 2.5 },
  speed: { min: 100, max: 250 },
  lifetime: { min: 0.4, max: 0.9 },
  colors: ['ff1493', 'bfff00', '00ffff', 'ffffff'],
  shape: 'ring-3',
};

export const COMBO_FLASH_VARIANTS: readonly ParticleConfig[] = [
  COMBO_FLASH, COMBO_FLASH, COMBO_FLASH_TIGHT, COMBO_FLASH_RING,
];

// ═══════════════════════════════════════════════════════════════════════
// Shape-Based Presets — use the new particle shape system
// ═══════════════════════════════════════════════════════════════════════

// ─── Confetti Burst ──────────────────────────────────────────────────
// Colorful rectangles for celebrations — wave clears, high combos.

export const CONFETTI_BURST: ParticleConfig = {
  maxParticles: 50,
  frequency: 0.001,
  emitterLifetime: 0.15,
  particlesPerWave: 50,
  lifetime: { min: 1.0, max: 2.5 },
  speed: { min: 150, max: 500 },
  gravity: { x: 0, y: 300 },
  scale: { start: 1.2, end: 0.4 },
  alpha: { start: 1, end: 0.5 },
  rotationSpeed: { min: -540, max: 540 },
  colors: ['ff4444', 'ffaa00', '44ff44', '4488ff', 'ff44ff', 'ffff44', '00ffff'],
  spawnShape: 'burst',
  spawnConfig: { directions: 20 },
  shape: 'rect',
};

// ─── Fire Embers ─────────────────────────────────────────────────────
// Glowing star-shaped embers that float upward — bomb aftermath.

export const FIRE_EMBERS: ParticleConfig = {
  maxParticles: 25,
  frequency: 0.03,
  emitterLifetime: 0.8,
  particlesPerWave: 3,
  lifetime: { min: 0.5, max: 1.5 },
  speed: { min: 20, max: 80 },
  gravity: { x: 0, y: -60 },
  scale: { start: 0.8, end: 0 },
  alpha: { start: 1, end: 0 },
  rotationSpeed: { min: -120, max: 120 },
  colors: ['ff2200', 'ff6600', 'ffaa00', 'ffee00'],
  spawnShape: 'circle',
  spawnConfig: { radius: 30 },
  blendMode: 'add',
  shape: 'star',
};

// ─── Frost Crystals ──────────────────────────────────────────────────
// Diamond-shaped ice crystals for ice/frozen tile effects.

export const FROST_CRYSTALS: ParticleConfig = {
  maxParticles: 20,
  frequency: 0.001,
  emitterLifetime: 0.1,
  particlesPerWave: 20,
  lifetime: { min: 0.4, max: 1.0 },
  speed: { min: 60, max: 200 },
  gravity: { x: 0, y: 150 },
  scale: { start: 1.0, end: 0.2 },
  alpha: { start: 0.9, end: 0 },
  rotationSpeed: { min: -180, max: 180 },
  colors: ['aaddff', 'ffffff', '88eeff', 'ccf0ff'],
  spawnShape: 'burst',
  spawnConfig: { directions: 12 },
  shape: 'diamond',
};

// ─── Electric Rings ──────────────────────────────────────────────────
// Expanding ring particles for lightning tile chain reactions.

export const ELECTRIC_RINGS: ParticleConfig = {
  maxParticles: 15,
  frequency: 0.02,
  emitterLifetime: 0.3,
  particlesPerWave: 3,
  lifetime: { min: 0.2, max: 0.5 },
  speed: { min: 100, max: 300 },
  gravity: { x: 0, y: 0 },
  scale: { start: 0.5, end: 2.0 },
  alpha: { start: 0.9, end: 0 },
  colors: ['88ccff', 'ffffff', 'ffff88'],
  spawnShape: 'burst',
  spawnConfig: { directions: 8 },
  blendMode: 'add',
  shape: 'ring-3',
};

// ─── Gold Stars ──────────────────────────────────────────────────────
// Star-shaped particles for gold/diamond tile rewards.

export const GOLD_STARS: ParticleConfig = {
  maxParticles: 20,
  frequency: 0.001,
  emitterLifetime: 0.1,
  particlesPerWave: 20,
  lifetime: { min: 0.5, max: 1.2 },
  speed: { min: 80, max: 250 },
  gravity: { x: 0, y: -30 },
  scale: { start: 1.2, end: 0 },
  alpha: { start: 1, end: 0.3 },
  rotationSpeed: { min: -200, max: 200 },
  colors: ['ffcc00', 'ffee44', 'ffffff', 'ffe088'],
  spawnShape: 'burst',
  spawnConfig: { directions: 12 },
  blendMode: 'add',
  shape: 'star',
};

// ─── Gem Shard Burst ─────────────────────────────────────────────────
// Small emerald shard burst on each gem hit (not final). Few particles.

export const GEM_SHARD_BURST: ParticleConfig = {
  maxParticles: 8,
  frequency: 0.001,
  emitterLifetime: 0.08,
  particlesPerWave: 8,
  lifetime: { min: 0.2, max: 0.5 },
  speed: { min: 80, max: 200 },
  gravity: { x: 0, y: 180 },
  scale: { start: 0.8, end: 0 },
  alpha: { start: 1, end: 0.2 },
  rotationSpeed: { min: -200, max: 200 },
  colors: ['50c878', '34d399', '7dffb3', 'a7f3d0'],
  spawnShape: 'burst',
  spawnConfig: { directions: 8 },
  shape: 'diamond',
};

// ─── Gem Golden Explosion ────────────────────────────────────────────
// Dramatic golden sparkle explosion on gem final hit.

export const GEM_GOLDEN_EXPLOSION: ParticleConfig = {
  maxParticles: 35,
  frequency: 0.001,
  emitterLifetime: 0.12,
  particlesPerWave: 35,
  lifetime: { min: 0.4, max: 1.0 },
  speed: { min: 120, max: 400 },
  gravity: { x: 0, y: 200 },
  scale: { start: 1.8, end: 0.2 },
  alpha: { start: 1, end: 0 },
  rotationSpeed: { min: -300, max: 300 },
  colors: ['ffd700', 'ffee44', 'ffffff', 'ffe088', 'ffcc00'],
  spawnShape: 'burst',
  spawnConfig: { directions: 16 },
  blendMode: 'add',
  shape: 'star',
};

// ─── Frost Mist ──────────────────────────────────────────────────────
// Subtle slow-drifting white particles for ice tile hit feedback.

export const FROST_MIST: ParticleConfig = {
  maxParticles: 12,
  frequency: 0.04,
  emitterLifetime: 0.6,
  particlesPerWave: 2,
  lifetime: { min: 0.5, max: 1.2 },
  speed: { min: 10, max: 40 },
  gravity: { x: 0, y: -25 },
  scale: { start: 0.6, end: 1.2 },
  alpha: { start: 0.4, end: 0 },
  colors: ['ffffff', 'e0ffff', 'ccf0ff'],
  spawnShape: 'circle',
  spawnConfig: { radius: 15 },
};

// ─── Ice Shatter ─────────────────────────────────────────────────────
// Sharp angular crystalline fragments for ice tile clear.

export const ICE_SHATTER: ParticleConfig = {
  maxParticles: 25,
  frequency: 0.001,
  emitterLifetime: 0.1,
  particlesPerWave: 25,
  lifetime: { min: 0.3, max: 0.8 },
  speed: { min: 100, max: 350 },
  gravity: { x: 0, y: 220 },
  scale: { start: 1.3, end: 0.2 },
  alpha: { start: 0.9, end: 0 },
  rotationSpeed: { min: -400, max: 400 },
  colors: ['b4e6ff', 'ffffff', '88eeff', 'ccf0ff', 'e0ffff'],
  spawnShape: 'burst',
  spawnConfig: { directions: 14 },
  shape: 'diamond',
};

// ─── Frost Crack ─────────────────────────────────────────────────────
// White crack lines radiating from center on frozen tile first hit.

export const FROST_CRACK: ParticleConfig = {
  maxParticles: 12,
  frequency: 0.001,
  emitterLifetime: 0.08,
  particlesPerWave: 12,
  lifetime: { min: 0.3, max: 0.6 },
  speed: { min: 60, max: 180 },
  gravity: { x: 0, y: 0 },
  scale: { start: 0.6, end: 0.1 },
  alpha: { start: 0.9, end: 0 },
  colors: ['ffffff', 'e8f4ff', 'ccddff'],
  spawnShape: 'burst',
  spawnConfig: { directions: 8 },
  blendMode: 'add',
};

// ─── Diamond Shards ──────────────────────────────────────────────────
// Prismatic diamond shards for diamond tile shatter.

export const DIAMOND_SHARDS: ParticleConfig = {
  maxParticles: 30,
  frequency: 0.001,
  emitterLifetime: 0.1,
  particlesPerWave: 30,
  lifetime: { min: 0.3, max: 0.8 },
  speed: { min: 120, max: 400 },
  gravity: { x: 0, y: 200 },
  scale: { start: 1.5, end: 0.3 },
  alpha: { start: 1, end: 0.2 },
  rotationSpeed: { min: -400, max: 400 },
  colors: ['aaeeff', 'ffffff', '88ccff', 'eeffff', 'ddddff'],
  spawnShape: 'burst',
  spawnConfig: { directions: 16 },
  shape: 'diamond',
};

// ─── Blast V2: Letter Pop Shockwave ──────────────────────────────────
// White-hot star burst that lands on top of the per-tile clear FX. Very
// short-lived, additive-blended — gives each clear a snappy "hit" feel
// without overpowering the theme-color sparks.

export const BLAST_LETTER_POP: ParticleConfig = {
  maxParticles: 14,
  frequency: 0.001,
  emitterLifetime: 0.05,
  particlesPerWave: 14,
  lifetime: { min: 0.12, max: 0.28 },
  speed: { min: 280, max: 520 },
  gravity: { x: 0, y: 0 },
  scale: { start: 1.6, end: 0 },
  alpha: { start: 1, end: 0 },
  rotationSpeed: { min: -180, max: 180 },
  colors: ['ffffff', 'fffce0', 'ffffff'],
  spawnShape: 'burst',
  spawnConfig: { directions: 14 },
  blendMode: 'add',
  shape: 'star',
};

// ─── Blast V2: Comet Trail ───────────────────────────────────────────
// Long-lived directional streaks for chain depth ≥ 2. Mimics a comet
// shower across the screen — fewer particles, longer life, slight drag.

export const BLAST_COMET_TRAIL: ParticleConfig = {
  maxParticles: 24,
  frequency: 0.001,
  emitterLifetime: 0.15,
  particlesPerWave: 12,
  lifetime: { min: 0.55, max: 1.1 },
  speed: { min: 320, max: 720 },
  gravity: { x: 0, y: 60 },
  scale: { start: 2.0, end: 0.1 },
  alpha: { start: 0.95, end: 0 },
  rotationSpeed: { min: -90, max: 90 },
  colors: ['ffee88', 'ffffff', 'ffcc00', 'fff2b0'],
  spawnShape: 'burst',
  spawnConfig: { directions: 6 },
  blendMode: 'add',
  shape: 'rect',
};
