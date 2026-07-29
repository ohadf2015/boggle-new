// ─── Physics World ────────────────────────────────────────────────────
// Wrapper around Matter.js providing gravity, body management, and
// force application for game tile physics.

import Matter from 'matter-js';
import type { PhysicsConfig, PhysicsBodyOptions, PhysicsBodyState, Vector2 } from './types';

const { Engine, Bodies, Body, Composite, Events } = Matter;

export type CollisionCallback = (
  bodyA: PhysicsBodyState,
  bodyB: PhysicsBodyState,
) => void;

/**
 * Matter.js `Engine.update` recommends delta ≤ 1000/60 ms. Above this, the
 * solver normalizes by `delta / _baseDelta`, which squares into position
 * error — fast bodies tunnel through walls and constraints oscillate.
 * We clamp the delta fed to the solver so a stalled frame behaves like
 * slow-motion instead of diverging.
 */
const MAX_SAFE_DELTA_MS = 1000 / 60;

export class PhysicsWorld {
  private engine: Matter.Engine;
  private bodyMap = new Map<number, Matter.Body>();
  private collisionCallbacks: CollisionCallback[] = [];
  private settledCallbacks: Array<() => void> = [];
  private settledThreshold = 0.1;
  private settledFrames = 0;
  private readonly SETTLED_FRAME_COUNT = 10;

  constructor(config: PhysicsConfig) {
    this.engine = Engine.create({
      gravity: {
        x: config.gravity.x,
        y: config.gravity.y,
        scale: config.gravityScale ?? 0.001,
      },
      enableSleeping: config.enableSleeping ?? false,
    });

    Events.on(this.engine, 'collisionStart', (event) => {
      for (const pair of event.pairs) {
        const stateA = this.toBodyState(pair.bodyA);
        const stateB = this.toBodyState(pair.bodyB);
        for (const cb of this.collisionCallbacks) {
          cb(stateA, stateB);
        }
      }
    });
  }

  // ─── Body Management ────────────────────────────────────────────

  createRect(
    x: number,
    y: number,
    width: number,
    height: number,
    options: PhysicsBodyOptions = {},
  ): number {
    const body = Bodies.rectangle(x, y, width, height, {
      isStatic: options.isStatic ?? false,
      isSensor: options.isSensor ?? false,
      restitution: options.restitution ?? 0.3,
      friction: options.friction ?? 0.1,
      frictionAir: options.frictionAir ?? 0.02,
      density: options.density ?? 0.001,
      angle: options.angle ?? 0,
      label: options.label ?? 'body',
      collisionFilter: {
        group: options.collisionGroup ?? 0,
      },
    });

    Composite.add(this.engine.world, body);
    this.bodyMap.set(body.id, body);
    return body.id;
  }

  createCircle(
    x: number,
    y: number,
    radius: number,
    options: PhysicsBodyOptions = {},
  ): number {
    const body = Bodies.circle(x, y, radius, {
      isStatic: options.isStatic ?? false,
      restitution: options.restitution ?? 0.5,
      friction: options.friction ?? 0.05,
      frictionAir: options.frictionAir ?? 0.01,
      label: options.label ?? 'circle',
    });

    Composite.add(this.engine.world, body);
    this.bodyMap.set(body.id, body);
    return body.id;
  }

  /** Create a static wall (floor, ceiling, sides) */
  createWall(x: number, y: number, width: number, height: number): number {
    return this.createRect(x, y, width, height, {
      isStatic: true,
      label: 'wall',
    });
  }

  removeBody(id: number): void {
    const body = this.bodyMap.get(id);
    if (body) {
      Composite.remove(this.engine.world, body);
      this.bodyMap.delete(id);
    }
  }

  removeAllBodies(): void {
    Composite.clear(this.engine.world, false);
    this.bodyMap.clear();
  }

  // ─── Body Manipulation ──────────────────────────────────────────

  setPosition(id: number, pos: Vector2): void {
    const body = this.bodyMap.get(id);
    if (body) Body.setPosition(body, pos);
  }

  setVelocity(id: number, vel: Vector2): void {
    const body = this.bodyMap.get(id);
    if (body) Body.setVelocity(body, vel);
  }

  setStatic(id: number, isStatic: boolean): void {
    const body = this.bodyMap.get(id);
    if (body) Body.setStatic(body, isStatic);
  }

  setAngle(id: number, angle: number): void {
    const body = this.bodyMap.get(id);
    if (body) Body.setAngle(body, angle);
  }

  /** Apply impulse force (cleared after one tick) */
  applyForce(id: number, force: Vector2, point?: Vector2): void {
    const body = this.bodyMap.get(id);
    if (body) {
      Body.applyForce(body, point ?? body.position, force);
    }
  }

  /** Apply explosion force radiating from a point */
  applyExplosion(center: Vector2, forceMagnitude: number, radius: number): void {
    for (const body of this.bodyMap.values()) {
      if (body.isStatic) continue;
      const dx = body.position.x - center.x;
      const dy = body.position.y - center.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist === 0 || dist > radius) continue;

      // Inverse-square falloff within radius
      const strength = forceMagnitude * (1 - dist / radius);
      const nx = dx / dist;
      const ny = dy / dist;
      Body.applyForce(body, body.position, {
        x: nx * strength,
        y: ny * strength,
      });
    }
  }

  // ─── State Reading ──────────────────────────────────────────────

  getBodyState(id: number): PhysicsBodyState | null {
    const body = this.bodyMap.get(id);
    if (!body) return null;
    return this.toBodyState(body);
  }

  getAllBodyStates(): PhysicsBodyState[] {
    const states: PhysicsBodyState[] = [];
    for (const body of this.bodyMap.values()) {
      states.push(this.toBodyState(body));
    }
    return states;
  }

  /** Check if all dynamic bodies have settled (velocity < threshold) */
  isSettled(): boolean {
    for (const body of this.bodyMap.values()) {
      if (body.isStatic) continue;
      const speed = Math.sqrt(
        body.velocity.x * body.velocity.x + body.velocity.y * body.velocity.y,
      );
      if (speed > this.settledThreshold) return false;
    }
    return true;
  }

  // ─── Gravity Control ────────────────────────────────────────────

  setGravity(gravity: Vector2, scale?: number): void {
    this.engine.gravity.x = gravity.x;
    this.engine.gravity.y = gravity.y;
    if (scale !== undefined) this.engine.gravity.scale = scale;
  }

  disableGravity(): void {
    this.engine.gravity.scale = 0;
  }

  enableGravity(): void {
    this.engine.gravity.scale = 0.001;
  }

  // ─── Events ─────────────────────────────────────────────────────

  onCollision(callback: CollisionCallback): () => void {
    this.collisionCallbacks.push(callback);
    return () => {
      const idx = this.collisionCallbacks.indexOf(callback);
      if (idx >= 0) this.collisionCallbacks.splice(idx, 1);
    };
  }

  onSettled(callback: () => void): () => void {
    this.settledCallbacks.push(callback);
    return () => {
      const idx = this.settledCallbacks.indexOf(callback);
      if (idx >= 0) this.settledCallbacks.splice(idx, 1);
    };
  }

  // ─── Update Loop ────────────────────────────────────────────────

  /** Call each frame from the PixiJS ticker. delta in ms. */
  update(deltaMs: number): void {
    // Clamp to matter-js's recommended max (1000/60 ms). Large deltas (tab
    // stalls, long GC pauses) would otherwise destabilize the solver.
    const safeDelta =
      deltaMs > MAX_SAFE_DELTA_MS ? MAX_SAFE_DELTA_MS : deltaMs;
    Engine.update(this.engine, safeDelta);

    // Check settled state
    if (this.settledCallbacks.length > 0) {
      if (this.isSettled()) {
        this.settledFrames++;
        if (this.settledFrames === this.SETTLED_FRAME_COUNT) {
          for (const cb of this.settledCallbacks) cb();
        }
      } else {
        this.settledFrames = 0;
      }
    }
  }

  // ─── Cleanup ────────────────────────────────────────────────────

  destroy(): void {
    this.collisionCallbacks = [];
    this.settledCallbacks = [];
    this.removeAllBodies();
    Engine.clear(this.engine);
  }

  // ─── Internal ───────────────────────────────────────────────────

  private toBodyState(body: Matter.Body): PhysicsBodyState {
    return {
      id: body.id,
      position: { x: body.position.x, y: body.position.y },
      angle: body.angle,
      velocity: { x: body.velocity.x, y: body.velocity.y },
      label: body.label,
    };
  }
}
