// ─── Game Engine ──────────────────────────────────────────────────────
// Reusable 2D game infrastructure powered by PixiJS v8 + Matter.js.
// Provides physics, particles, screen shake, tile rendering, tweens,
// and score fly animations — all behind a clean React context.
//
// Usage:
//   import { GameCanvas, useGameEngine } from '@/lib/gameEngine';
//   import { TILE_EXPLOSION } from '@/lib/gameEngine/presets/particles';

// Core systems
export { PhysicsWorld } from './PhysicsWorld';
export type { CollisionCallback } from './PhysicsWorld';

export { ParticleEmitter, ParticlePool } from './ParticleSystem';

export { ScreenShake } from './ScreenShake';

export { ScreenFlash } from './ScreenFlash';
export type { FlashConfig } from './ScreenFlash';

export { TrailRenderer } from './TrailRenderer';
export type { TrailConfig } from './TrailRenderer';

export { PhysicsDebris } from './PhysicsDebris';
export type { DebrisConfig } from './PhysicsDebris';

export { TimeDilation } from './TimeDilation';

export { TileRenderer } from './TileRenderer';
export type { TileTheme } from './tileThemes';

export { TweenManager, Easing } from './Tween';

export { ScoreFlyManager } from './ScoreFly';

// React integration
export { GameCanvas, useGameEngine } from './GameCanvas';
export type { GameEngineContext } from './GameCanvas';

// Types
export type {
  Vector2,
  Bounds,
  PhysicsConfig,
  PhysicsBodyOptions,
  PhysicsBodyState,
  ParticleConfig,
  ParticleShape,
  ActiveParticle,
  ShakeConfig,
  TileRenderConfig,
  TileData,
  GameCanvasConfig,
  GameEvent,
  GameEventType,
  GameEventHandler,
} from './types';
