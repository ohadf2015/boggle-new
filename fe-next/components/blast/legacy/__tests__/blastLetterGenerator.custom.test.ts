/**
 * blastLetterGenerator — Custom distribution + new tile type tests.
 */

import { rollSpecialType } from '../utils/blastLetterGenerator';

describe('rollSpecialType with custom distribution', () => {
  it('should return lightning when custom distribution includes it', () => {
    const customDist = { lightning: 1.0 };
    const results = new Set<string>();
    for (let i = 0; i < 50; i++) {
      results.add(rollSpecialType(1, customDist));
    }
    expect(results.size).toBe(1);
    expect(results.has('lightning')).toBe(true);
  });

  it('should return magnet when custom distribution includes it', () => {
    const customDist = { magnet: 1.0 };
    const results = new Set<string>();
    for (let i = 0; i < 50; i++) {
      results.add(rollSpecialType(1, customDist));
    }
    expect(results.size).toBe(1);
    expect(results.has('magnet')).toBe(true);
  });

  it('should produce both lightning and magnet in mixed distribution', () => {
    const customDist = { lightning: 0.5, magnet: 0.5 };
    const results = new Set<string>();
    for (let i = 0; i < 200; i++) {
      results.add(rollSpecialType(1, customDist));
    }
    expect(results.has('lightning')).toBe(true);
    expect(results.has('magnet')).toBe(true);
    expect(results.has('standard')).toBe(false);
  });

  it('should still return standard when chance < 1 with custom distribution', () => {
    const customDist = { lightning: 1.0 };
    const results = new Set<string>();
    for (let i = 0; i < 200; i++) {
      results.add(rollSpecialType(0.5, customDist));
    }
    expect(results.has('standard')).toBe(true);
    expect(results.has('lightning')).toBe(true);
  });

  it('should use default distribution when no custom provided', () => {
    // Default distribution has no lightning/magnet
    const results = new Set<string>();
    for (let i = 0; i < 500; i++) {
      results.add(rollSpecialType(1));
    }
    expect(results.has('lightning')).toBe(false);
    expect(results.has('magnet')).toBe(false);
  });
});
