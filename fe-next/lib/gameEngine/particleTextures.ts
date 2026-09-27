// ─── Particle Textures ────────────────────────────────────────────────
// Pre-generated, module-cached white shape textures for ParticleContainer
// rendering. Drawing each particle as a tinted Particle sprite (instead of
// re-tessellating a Graphics context every frame) eliminates the per-frame
// CPU geometry rebuild that was the dominant cost during big bursts.
//
// Shapes are drawn WHITE and tinted per-particle at runtime. The geometry
// constants below are copied verbatim from the old ParticleEmitter.draw*()
// methods so the on-screen result is identical (zero visual change).

import { Texture } from 'pixi.js';
import type { ParticleShape } from './types';

/** Texture-space "size unit": a shape authored at this radius/size maps to an
 *  on-screen size of `scale * PARTICLE_UNIT`. Old draw used radius = size, so
 *  `scale = size / PARTICLE_UNIT` reproduces the exact on-screen dimensions. */
export const PARTICLE_UNIT = 16;

/** Transparent padding (px) around each shape so anti-aliased edges aren't clipped. */
const PAD = 4;

// ─── Pure geometry (visual-fidelity constants — unit-tested) ──────────────

export function circleGeom(unit: number): { radius: number } {
  return { radius: unit };
}

/** Old draw: rect(p.x - size, p.y - size*0.5, size*2, size) → width 2·size, height size. */
export function rectGeom(unit: number): { width: number; height: number } {
  return { width: unit * 2, height: unit };
}

/** Old draw: circle(size).stroke({ width: max(1, size*0.3) }). */
export function ringGeom(unit: number): { radius: number; lineWidth: number } {
  return { radius: unit, lineWidth: unit * 0.3 };
}

/** Old drawStar: outer = radius, inner = radius*0.45, 5 points → 10 alternating vertices. */
export function starPoints(unit: number, points = 5): { x: number; y: number }[] {
  const innerR = unit * 0.45;
  const step = Math.PI / points;
  const pts: { x: number; y: number }[] = [];
  // Start at the top (angle -PI/2) so the star points up; angle choice does not
  // affect runtime rotation (handled per-particle), only the static texture.
  const base = -Math.PI / 2;
  for (let i = 0; i < points * 2; i++) {
    const angle = base + i * step;
    const r = i % 2 === 0 ? unit : innerR;
    pts.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r });
  }
  return pts;
}

/** Old drawDiamond: (0,-size) (0.7·size,0) (0,size) (-0.7·size,0). */
export function diamondPoints(unit: number): { x: number; y: number }[] {
  return [
    { x: 0, y: -unit },
    { x: unit * 0.7, y: 0 },
    { x: 0, y: unit },
    { x: -unit * 0.7, y: 0 },
  ];
}

/** Uniform sprite scale that reproduces the old on-screen size (size = 4·p.scale). */
export function particleScaleForSize(size: number): number {
  return size / PARTICLE_UNIT;
}

/** Old draw applied rotation ONLY in drawStar(); circle is rotation-invariant and
 *  rect/diamond were never rotated. Gate rotation to 'star' for zero visual change. */
export function shouldRotateParticle(shape: ParticleShape): boolean {
  return shape === 'star';
}

// ─── Texture factory (canvas-based, cached, SSR/test-guarded) ─────────────

const cache = new Map<ParticleShape, Texture>();

function makeCanvas(): HTMLCanvasElement | null {
  if (typeof document === 'undefined' || typeof document.createElement !== 'function') {
    return null;
  }
  const canvas = document.createElement('canvas');
  return canvas;
}

function drawShape(
  ctx: CanvasRenderingContext2D,
  shape: ParticleShape,
  cx: number,
  cy: number,
): void {
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#ffffff';

  switch (shape) {
    case 'star': {
      const pts = starPoints(PARTICLE_UNIT);
      ctx.beginPath();
      pts.forEach((p, i) =>
        i === 0 ? ctx.moveTo(cx + p.x, cy + p.y) : ctx.lineTo(cx + p.x, cy + p.y),
      );
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'diamond': {
      const pts = diamondPoints(PARTICLE_UNIT);
      ctx.beginPath();
      pts.forEach((p, i) =>
        i === 0 ? ctx.moveTo(cx + p.x, cy + p.y) : ctx.lineTo(cx + p.x, cy + p.y),
      );
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'rect': {
      const { width, height } = rectGeom(PARTICLE_UNIT);
      ctx.fillRect(cx - width / 2, cy - height / 2, width, height);
      break;
    }
    case 'ring-3': {
      const { radius, lineWidth } = ringGeom(PARTICLE_UNIT);
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    case 'circle':
    default: {
      const { radius } = circleGeom(PARTICLE_UNIT);
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
  }
}

/**
 * Returns a cached white texture for the given shape, tinted per-particle at
 * render time. Falls back to `Texture.WHITE` when no 2D canvas is available
 * (SSR, node test env) — emitters still construct, they just render a square
 * in those non-rendering contexts. Cached textures are SHARED across emitters,
 * so they must never be destroyed by an individual emitter.
 */
export function getParticleTexture(shape: ParticleShape): Texture {
  const cached = cache.get(shape);
  if (cached) return cached;

  const canvas = makeCanvas();
  const ctx = canvas?.getContext('2d') ?? null;
  if (!canvas || !ctx) {
    // No rendering context (SSR / node tests). Don't cache the fallback — a real
    // canvas may become available in a later (browser) call.
    return Texture.WHITE;
  }

  // Size the canvas to fit the largest extent of any shape (ring/diamond reach
  // ±unit) plus AA padding, and center the shape.
  const extent = PARTICLE_UNIT + PAD;
  canvas.width = extent * 2;
  canvas.height = extent * 2;
  drawShape(ctx, shape, extent, extent);

  const texture = Texture.from(canvas);
  cache.set(shape, texture);
  return texture;
}

/** Test-only: clear the texture cache so cases can exercise the canvas path. */
export function __clearParticleTextureCache(): void {
  cache.clear();
}
