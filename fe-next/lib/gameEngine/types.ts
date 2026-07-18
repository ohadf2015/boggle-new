// ─── Game Engine Core Types ───────────────────────────────────────────
// Framework-agnostic types for 2D game rendering with physics and particles.

export interface Vector2 {
  x: number;
  y: number;
}

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ─── Physics ──────────────────────────────────────────────────────────

export interface PhysicsConfig {
  gravity: Vector2;
  /** Gravity scaling factor (Matter.js default: 0.001) */
  gravityScale?: number;
  /** Enable sleeping for idle bodies */
  enableSleeping?: boolean;
}

export interface PhysicsBodyOptions {
  isStatic?: boolean;
  isSensor?: boolean;
  restitution?: number;
  friction?: number;
  frictionAir?: number;
  density?: number;
  angle?: number;
  label?: string;
  /** Collision filter group (positive = always collide, negative = never) */
  collisionGroup?: number;
}

export interface PhysicsBodyState {
  id: number;
  position: Vector2;
  angle: number;
  velocity: Vector2;
  label: string;
}

// ─── Particles ────────────────────────────────────────────────────────

/** Shape drawn for each particle. Default: 'circle'. */
export type ParticleShape = 'circle' | 'star' | 'diamond' | 'rect' | 'ring-3';

export interface ParticleConfig {
  /** Max concurrent particles */
  maxParticles: number;
  /** Seconds between emission waves (0.001 = near-continuous) */
  frequency: number;
  /** How long emitter runs in seconds (0 = infinite) */
  emitterLifetime: number;
  /** Particles per wave */
  particlesPerWave: number;
  /** Particle lifetime range in seconds */
  lifetime: { min: number; max: number };
  /** Speed range (pixels/sec) */
  speed: { min: number; max: number };
  /** Gravity applied to particles */
  gravity?: Vector2;
  /** Scale over lifetime [start, end] */
  scale: { start: number; end: number };
  /** Alpha over lifetime [start, end] */
  alpha: { start: number; end: number };
  /** Rotation speed in degrees/sec */
  rotationSpeed?: { min: number; max: number };
  /** Color stops: hex strings without # */
  colors: string[];
  /** Spawn shape */
  spawnShape: 'point' | 'burst' | 'circle' | 'rect';
  /** For burst: number of directions. For circle: radius. For rect: {w, h} */
  spawnConfig?: {
    radius?: number;
    width?: number;
    height?: number;
    directions?: number;
  };
  /** Blend mode ('normal' | 'add' | 'screen') */
  blendMode?: string;
  /** Particle shape. Default: 'circle'. */
  shape?: ParticleShape;
}

export interface ActiveParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  maxAge: number;
  scale: number;
  alpha: number;
  rotation: number;
  rotationSpeed: number;
  color: number;
  startScale: number;
  endScale: number;
  startAlpha: number;
  endAlpha: number;
}

// ─── Screen Shake ─────────────────────────────────────────────────────

export interface ShakeConfig {
  /** Intensity in pixels */
  intensity: number;
  /** Duration in seconds */
  duration: number;
  /** Decay curve: 'linear' | 'exponential' */
  decay?: 'linear' | 'exponential';
  /** Shake frequency (oscillations per second) */
  frequency?: number;
  /** Optional directional bias in pixels (e.g. {x: -1}) pulled toward during decay. */
  bias?: Vector2;
}

// ─── Tile Renderer ────────────────────────────────────────────────────

export interface TileRenderConfig {
  /** Tile size in pixels */
  tileSize: number;
  /** Gap between tiles */
  gap: number;
  /** Grid dimensions */
  cols: number;
  rows: number;
  /** Corner radius for tile shapes */
  cornerRadius?: number;
}

export interface TileData {
  id: string;
  row: number;
  col: number;
  letter: string;
  /** Visual variant for styling */
  variant: string;
  /** Whether tile is currently selected */
  selected?: boolean;
  /** Whether tile is being cleared */
  clearing?: boolean;
  /** Custom tint color (hex) */
  tint?: number;
}

// ─── Game Canvas ──────────────────────────────────────────────────────

export interface GameCanvasConfig {
  width: number;
  height: number;
  background: number;
  /** Target FPS (default: 60) */
  fps?: number;
  /** Enable antialiasing */
  antialias?: boolean;
  /** Device pixel ratio */
  resolution?: number;
  /** Background alpha (0 = transparent, 1 = opaque). Default: 1 */
  backgroundAlpha?: number;
}

// ─── Events ───────────────────────────────────────────────────────────

export type GameEventType =
  | 'tile:tap'
  | 'tile:drag-start'
  | 'tile:drag-move'
  | 'tile:drag-end'
  | 'tile:clear'
  | 'combo:trigger'
  | 'physics:collision'
  | 'physics:settled';

export interface GameEvent {
  type: GameEventType;
  data: Record<string, unknown>;
  timestamp: number;
}

export type GameEventHandler = (event: GameEvent) => void;
