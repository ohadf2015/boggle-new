/**
 * Shared shading primitives for avatar parts.
 *
 * Parts historically hand-rolled their own specular/rim-light, which drifted
 * inconsistent — premium parts gleam while basic everyday parts (the ones the
 * seeded-fallback avatars use most) read flat. These pure builders + tiny
 * components give one consistent shading language so a flat part gains depth
 * without bespoke geometry per file.
 *
 * Geometry is pure (unit-tested); the components are thin wrappers that apply
 * the standard subtle opacity/stroke so polish stays uniform.
 */
import React from 'react';

export const RIM_OPACITY = 0.22;
export const RIM_STROKE = 1.2;
export const SHINE_OPACITY = 0.38;
export const SHINE_STROKE = 1;

const r1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Rim-light arc hugging the upper edge of a circular feature (eye sclera, a
 * round face). A gentle highlight that suggests a light source above.
 */
export function eyeRimArc(cx: number, cy: number, radius: number): string {
  const halfSpan = radius * 0.75;
  const x1 = r1(cx - halfSpan);
  const x2 = r1(cx + halfSpan);
  const yEdge = r1(cy - radius * 0.55);
  const yCtrl = r1(cy - radius * 0.95);
  return `M${x1} ${yEdge} Q${cx} ${yCtrl} ${x2} ${yEdge}`;
}

/** A soft shine line riding the upper curve of a mouth/lip of width `w`. */
export function lipShine(cx: number, cy: number, w: number): string {
  const half = w * 0.4;
  const x1 = r1(cx - half);
  const x2 = r1(cx + half);
  const yEdge = r1(cy + 1.2);
  const yCtrl = r1(cy + 4);
  return `M${x1} ${yEdge} Q${cx} ${yCtrl} ${x2} ${yEdge}`;
}

/**
 * Rim-light arc across the top of a face base of given centre/half-width.
 * `lift` controls how high the arc bulges (proportion of radius).
 */
export function faceRimArc(cx: number, cy: number, halfWidth: number, lift = 0.7): string {
  const span = halfWidth * 0.7;
  const x1 = r1(cx - span);
  const x2 = r1(cx + span);
  const yEdge = r1(cy - halfWidth * 0.45);
  const yCtrl = r1(cy - halfWidth * lift);
  return `M${x1} ${yEdge} Q${cx} ${yCtrl} ${x2} ${yEdge}`;
}

interface RimProps {
  cx: number;
  cy: number;
  radius: number;
  /** 'eye' (default) or 'face' geometry */
  variant?: 'eye' | 'face';
  opacity?: number;
}

/** White rim-light highlight for a circular feature. */
export function RimLight({ cx, cy, radius, variant = 'eye', opacity = RIM_OPACITY }: RimProps) {
  const d = variant === 'face' ? faceRimArc(cx, cy, radius) : eyeRimArc(cx, cy, radius);
  return (
    <path
      d={d}
      fill="none"
      stroke="#fff"
      strokeWidth={RIM_STROKE}
      strokeLinecap="round"
      opacity={opacity}
    />
  );
}

/** White shine line for a mouth/lip. */
export function LipShine({ cx, cy, w, opacity = SHINE_OPACITY }: { cx: number; cy: number; w: number; opacity?: number }) {
  return (
    <path
      d={lipShine(cx, cy, w)}
      fill="none"
      stroke="#fff"
      strokeWidth={SHINE_STROKE}
      strokeLinecap="round"
      opacity={opacity}
    />
  );
}
