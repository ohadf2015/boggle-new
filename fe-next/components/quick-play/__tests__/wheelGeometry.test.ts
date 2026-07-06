import { describe, it, expect } from 'vitest';
import { nearestNode, NODE_ANGLES } from '../wheelGeometry';

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
