import { describe, it, expect } from 'vitest';
import { worldSkinOverride, worldSkinId } from '../worldSkins';

describe('worldSkinOverride', () => {
  it('returns the world skin only when its boss trophy is owned', () => {
    expect(worldSkinOverride(2, new Set([2]))).toBe(worldSkinId(2));
  });
  it('falls back to the player skin (undefined) when not owned', () => {
    expect(worldSkinOverride(2, new Set([1]))).toBeUndefined();
    expect(worldSkinOverride(2, new Set())).toBeUndefined();
  });
});
