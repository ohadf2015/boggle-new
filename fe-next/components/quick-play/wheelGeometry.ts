/**
 * Quick Play wheel geometry — pure math for the knob-drag mode picker.
 * Angles are degrees clockwise from "up" (12 o'clock).
 * Responsive scale keeps all four nodes + knob inside narrow phone viewports.
 */
import type { QuickMode } from './types';

export const NODE_ANGLES: Record<QuickMode, number> = {
  'wheel-rush': 0,
  'word-hunt': 90,
  blast: 180,
  classic: 270,
};

/** Design tokens at the desktop/reference size (≈376px stage). */
export const WHEEL_DESIGN = {
  ringRadius: 132,
  /** Extra padding around the orbit so labels/shadows aren't clipped. */
  pad: 112,
  nodeSize: 88,
  knobSize: 104,
  deadZone: 28,
  knobTravel: 96,
  iconSize: 44,
  tetherHeight: 118,
  /** Minimum tappable edge (comfortable touch target). */
  minHit: 48,
} as const;

export type WheelLayout = {
  scale: number;
  containerSize: number;
  ringRadius: number;
  nodeSize: number;
  knobSize: number;
  deadZone: number;
  knobTravel: number;
  iconSize: number;
  tetherHeight: number;
};

export type WheelSelection = QuickMode | 'random';

/**
 * Scale the wheel stage to fit `availableWidthPx` while keeping nodes tappable
 * and fully inside the container. Narrow phones (~360) get a scaled stage;
 * wider viewports cap at the design size (no upscale beyond reference).
 */
export function scaleWheelLayout(availableWidthPx: number): WheelLayout {
  const designContainer = WHEEL_DESIGN.ringRadius * 2 + WHEEL_DESIGN.pad; // 376
  // Floor: still fit four orbiting nodes with min hit targets on ~300px content.
  const minContainer = 280;
  const container = Math.min(designContainer, Math.max(minContainer, availableWidthPx));
  const scale = container / designContainer;
  const nodeSize = Math.max(WHEEL_DESIGN.minHit, WHEEL_DESIGN.nodeSize * scale);
  const knobSize = Math.max(WHEEL_DESIGN.minHit + 8, WHEEL_DESIGN.knobSize * scale);
  // Re-fit ring so node centers leave room for half-node inside the box.
  const maxRing = (container - nodeSize) / 2;
  const ringRadius = Math.min(WHEEL_DESIGN.ringRadius * scale, maxRing);
  return {
    scale,
    containerSize: container,
    ringRadius,
    nodeSize,
    knobSize,
    deadZone: Math.max(16, WHEEL_DESIGN.deadZone * scale),
    knobTravel: Math.max(48, WHEEL_DESIGN.knobTravel * scale),
    iconSize: Math.max(28, WHEEL_DESIGN.iconSize * scale),
    tetherHeight: Math.max(64, WHEEL_DESIGN.tetherHeight * scale),
  };
}

/** Node center offset from wheel center (px). 0° = up. */
export function nodeOffset(mode: QuickMode, ringRadius: number): { x: number; y: number } {
  const rad = (NODE_ANGLES[mode] * Math.PI) / 180;
  return { x: Math.sin(rad) * ringRadius, y: -Math.cos(rad) * ringRadius };
}

/**
 * True when every mode node's bounding box fits inside the container
 * (no horizontal/vertical clip of hit targets).
 */
export function nodesInBounds(layout: WheelLayout): boolean {
  const half = layout.containerSize / 2;
  const extent = layout.ringRadius + layout.nodeSize / 2;
  return extent <= half + 0.5;
}

/**
 * Given a knob drag offset from center, return the mode whose node is nearest
 * to the drag direction, or 'random' inside the dead zone.
 */
export function nearestNode(dx: number, dy: number, deadZonePx: number): WheelSelection {
  if (Math.hypot(dx, dy) < deadZonePx) return 'random';
  // atan2(dx, -dy): 0° = up, clockwise positive
  const angle = ((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360;
  let best: QuickMode = 'wheel-rush';
  let bestDelta = Infinity;
  for (const [mode, nodeAngle] of Object.entries(NODE_ANGLES) as [QuickMode, number][]) {
    const delta = Math.min(Math.abs(angle - nodeAngle), 360 - Math.abs(angle - nodeAngle));
    if (delta < bestDelta) {
      bestDelta = delta;
      best = mode;
    }
  }
  return best;
}
