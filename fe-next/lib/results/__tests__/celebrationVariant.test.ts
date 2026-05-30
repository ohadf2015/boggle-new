import { describe, it, expect } from 'vitest';
import { pickCelebrationSrc } from '../celebrationVariant';

describe('pickCelebrationSrc', () => {
  it('returns empty string for no sources', () => {
    expect(pickCelebrationSrc([], 5)).toBe('');
  });

  it('returns the only source regardless of seed (1-clip kind stays stable)', () => {
    const one = ['/mascots/celebration-champion.mp4'];
    expect(pickCelebrationSrc(one, 0)).toBe(one[0]);
    expect(pickCelebrationSrc(one, 999)).toBe(one[0]);
  });

  it('picks deterministically by seed across multiple clips', () => {
    const srcs = ['/a.mp4', '/b.mp4', '/c.mp4'];
    expect(pickCelebrationSrc(srcs, 0)).toBe('/a.mp4');
    expect(pickCelebrationSrc(srcs, 1)).toBe('/b.mp4');
    expect(pickCelebrationSrc(srcs, 2)).toBe('/c.mp4');
    expect(pickCelebrationSrc(srcs, 3)).toBe('/a.mp4'); // wraps
  });

  it('handles negative / fractional seeds without crashing', () => {
    const srcs = ['/a.mp4', '/b.mp4'];
    expect(srcs).toContain(pickCelebrationSrc(srcs, -1));
    expect(srcs).toContain(pickCelebrationSrc(srcs, 1.7));
  });
});
