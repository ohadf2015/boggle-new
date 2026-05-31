// ─── particleTextures Tests ───────────────────────────────────────────
// Locks the shape-geometry constants (visual fidelity), the size→scale
// mapping, the rotation-gating rule, and the no-canvas texture fallback.
// Runs in the 'node' env (no DOM/canvas) — same as the other gameEngine tests.

import {
  PARTICLE_UNIT,
  circleGeom,
  rectGeom,
  ringGeom,
  starPoints,
  diamondPoints,
  particleScaleForSize,
  shouldRotateParticle,
  getParticleTexture,
} from '../particleTextures';

// Mock pixi.js so the no-canvas fallback can return Texture.WHITE without a renderer.
vi.mock('pixi.js', () => {
  const WHITE = { __white: true };
  return {
    Texture: {
      WHITE,
      from: vi.fn(() => ({ __fromCanvas: true })),
    },
  };
});

describe('particleTextures geometry (visual fidelity constants)', () => {
  it('uses a base unit of 16', () => {
    expect(PARTICLE_UNIT).toBe(16);
  });

  it('circle radius equals the unit', () => {
    expect(circleGeom(PARTICLE_UNIT)).toEqual({ radius: 16 });
  });

  it('rect is 2:1 (width 2·unit, height unit) — matches old rect(p.x-size, .., size*2, size)', () => {
    expect(rectGeom(PARTICLE_UNIT)).toEqual({ width: 32, height: 16 });
  });

  it('ring stroke width is 0.3·unit — matches old stroke width size*0.3', () => {
    expect(ringGeom(PARTICLE_UNIT)).toEqual({ radius: 16, lineWidth: 16 * 0.3 });
  });

  it('star has 5 outer points at radius=unit and inner radius 0.45·unit', () => {
    const pts = starPoints(PARTICLE_UNIT);
    // 5-point star → 10 vertices (alternating outer/inner)
    expect(pts).toHaveLength(10);
    const dist = (p: { x: number; y: number }) => Math.hypot(p.x, p.y);
    const radii = pts.map(dist);
    const outer = radii.filter((r) => Math.abs(r - 16) < 1e-6);
    const inner = radii.filter((r) => Math.abs(r - 16 * 0.45) < 1e-6);
    expect(outer).toHaveLength(5);
    expect(inner).toHaveLength(5);
  });

  it('diamond points are ±unit vertical and ±0.7·unit horizontal', () => {
    const pts = diamondPoints(PARTICLE_UNIT);
    expect(pts).toEqual([
      { x: 0, y: -16 },
      { x: 0.7 * 16, y: 0 },
      { x: 0, y: 16 },
      { x: -0.7 * 16, y: 0 },
    ]);
  });
});

describe('particleScaleForSize', () => {
  it('maps on-screen size to a uniform scale of size / unit', () => {
    // old draw: circle radius = size = 4 * p.scale. Texture disc radius = unit.
    // scale = size/unit keeps the on-screen radius identical.
    expect(particleScaleForSize(16)).toBe(1);
    expect(particleScaleForSize(8)).toBe(0.5);
    expect(particleScaleForSize(0)).toBe(0);
  });
});

describe('shouldRotateParticle (preserve old draw behavior)', () => {
  it('rotates ONLY stars (old draw applied rotation only in drawStar)', () => {
    expect(shouldRotateParticle('star')).toBe(true);
    expect(shouldRotateParticle('circle')).toBe(false);
    expect(shouldRotateParticle('diamond')).toBe(false);
    expect(shouldRotateParticle('rect')).toBe(false);
    expect(shouldRotateParticle('ring-3')).toBe(false);
  });
});

describe('getParticleTexture', () => {
  it('falls back to Texture.WHITE when no canvas is available (SSR / node tests)', async () => {
    const { Texture } = await import('pixi.js');
    expect(getParticleTexture('circle')).toBe(Texture.WHITE);
    expect(getParticleTexture('star')).toBe(Texture.WHITE);
  });

  it('caches per shape (same reference on repeat calls)', () => {
    expect(getParticleTexture('rect')).toBe(getParticleTexture('rect'));
  });
});
