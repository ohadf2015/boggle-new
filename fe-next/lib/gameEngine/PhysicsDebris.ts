// ─── Physics Debris ───────────────────────────────────────────────────
// Spawns small colored rectangles as Matter.js physics bodies that tumble
// and fall after tile clears. Renders each body as a PixiJS Graphics rect
// synced to the physics position/rotation each frame.

import { Container, Graphics } from 'pixi.js';
import type { PhysicsWorld } from './PhysicsWorld';

export interface DebrisConfig {
  /** Y coordinate of the floor boundary */
  floorY: number;
  /** Maximum active debris pieces (default: 60) */
  maxDebris?: number;
  /** Time until debris fades out in seconds (default: 2) */
  maxAge?: number;
  /** Base size of debris pieces in pixels (default: 6) */
  pieceSize?: number;
}

interface DebrisPiece {
  bodyId: number;
  graphics: Graphics;
  color: number;
  age: number;
  maxAge: number;
}

export class PhysicsDebris {
  private pieces: DebrisPiece[] = [];
  private parent: Container;
  private physics: PhysicsWorld;
  private config: Required<DebrisConfig>;

  constructor(parent: Container, physics: PhysicsWorld, config: DebrisConfig) {
    this.parent = parent;
    this.physics = physics;
    this.config = {
      floorY: config.floorY,
      maxDebris: config.maxDebris ?? 60,
      maxAge: config.maxAge ?? 2,
      pieceSize: config.pieceSize ?? 6,
    };
  }

  get count(): number {
    return this.pieces.length;
  }

  /** Spawn debris at (x, y) with given color and count */
  spawn(x: number, y: number, color: number, count: number): void {
    const toSpawn = Math.min(count, this.config.maxDebris - this.pieces.length);
    const { pieceSize, maxAge } = this.config;

    for (let i = 0; i < toSpawn; i++) {
      const w = pieceSize * (0.5 + Math.random() * 1);
      const h = pieceSize * (0.3 + Math.random() * 0.7);

      const bodyId = this.physics.createRect(
        x + (Math.random() - 0.5) * 20,
        y + (Math.random() - 0.5) * 20,
        w, h,
        {
          restitution: 0.4 + Math.random() * 0.3,
          friction: 0.3,
          frictionAir: 0.01 + Math.random() * 0.02,
          density: 0.0005 + Math.random() * 0.001,
          angle: Math.random() * Math.PI * 2,
          label: 'debris',
        },
      );

      const gfx = new Graphics();
      gfx.rect(-w / 2, -h / 2, w, h).fill({ color });
      this.parent.addChild(gfx);

      this.pieces.push({
        bodyId,
        graphics: gfx,
        color,
        age: 0,
        maxAge: maxAge * (0.7 + Math.random() * 0.6), // Stagger lifetimes
      });
    }
  }

  /** Call each frame with delta in seconds */
  update(deltaSec: number): void {
    for (let i = this.pieces.length - 1; i >= 0; i--) {
      const piece = this.pieces[i];
      piece.age += deltaSec;

      if (piece.age >= piece.maxAge) {
        this.removePiece(i);
        continue;
      }

      // Sync graphics to physics body
      const state = this.physics.getBodyState(piece.bodyId);
      if (state) {
        piece.graphics.x = state.position.x;
        piece.graphics.y = state.position.y;
        piece.graphics.rotation = state.angle;
      }

      // Fade out in last 30% of life
      const t = piece.age / piece.maxAge;
      piece.graphics.alpha = t > 0.7 ? 1 - (t - 0.7) / 0.3 : 1;
    }
  }

  destroy(): void {
    for (let i = this.pieces.length - 1; i >= 0; i--) {
      this.removePiece(i);
    }
  }

  private removePiece(index: number): void {
    const piece = this.pieces[index];
    this.physics.removeBody(piece.bodyId);
    try { this.parent.removeChild(piece.graphics); } catch { /* */ }
    piece.graphics.destroy();
    this.pieces.splice(index, 1);
  }
}
