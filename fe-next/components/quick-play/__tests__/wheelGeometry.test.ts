import { describe, it, expect } from 'vitest';
import {
  nearestNode,
  NODE_ANGLES,
  scaleWheelLayout,
  nodesInBounds,
  nodeOffset,
  WHEEL_DESIGN,
} from '../wheelGeometry';
import { QUICK_MODES } from '../types';

describe('nearestNode', () => {
  it('inside dead zone → random', () => {
    expect(nearestNode(5, -5, 24)).toBe('random');
    expect(nearestNode(0, 0, 24)).toBe('random');
  });
  it('drag up → wheel-rush', () => expect(nearestNode(0, -80, 24)).toBe('wheel-rush'));
  it('drag right → word-hunt', () => expect(nearestNode(80, 0, 24)).toBe('word-hunt'));
  it('drag down → blast', () => expect(nearestNode(0, 80, 24)).toBe('blast'));
  it('drag left → classic', () => expect(nearestNode(-80, 0, 24)).toBe('classic'));
  it('diagonal snaps to nearest node', () => {
    expect(nearestNode(70, -60, 24)).toBe('word-hunt');
    expect(nearestNode(-30, 90, 24)).toBe('blast');
  });
});

describe('NODE_ANGLES', () => {
  it('covers the 4 modes at cardinal points', () => {
    expect(NODE_ANGLES).toEqual({ 'wheel-rush': 0, 'word-hunt': 90, blast: 180, classic: 270 });
  });
});

describe('scaleWheelLayout (responsive)', () => {
  it('caps at design size on wide viewports', () => {
    const layout = scaleWheelLayout(480);
    const design = WHEEL_DESIGN.ringRadius * 2 + WHEEL_DESIGN.pad;
    expect(layout.containerSize).toBe(design);
    expect(layout.scale).toBe(1);
  });

  it('scales down for narrow phone content (~320px usable)', () => {
    const layout = scaleWheelLayout(320);
    expect(layout.containerSize).toBeLessThanOrEqual(320);
    expect(layout.scale).toBeLessThan(1);
    expect(layout.nodeSize).toBeGreaterThanOrEqual(WHEEL_DESIGN.minHit);
    expect(layout.knobSize).toBeGreaterThanOrEqual(WHEEL_DESIGN.minHit);
  });

  it('keeps all four mode nodes fully in-bounds on 360px and 280px', () => {
    for (const w of [360, 320, 280]) {
      const layout = scaleWheelLayout(w);
      expect(nodesInBounds(layout)).toBe(true);
      for (const mode of QUICK_MODES) {
        const { x, y } = nodeOffset(mode, layout.ringRadius);
        const half = layout.containerSize / 2;
        expect(Math.abs(x) + layout.nodeSize / 2).toBeLessThanOrEqual(half + 0.5);
        expect(Math.abs(y) + layout.nodeSize / 2).toBeLessThanOrEqual(half + 0.5);
      }
    }
  });
});
