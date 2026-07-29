import { describe, it, expect } from 'vitest';
import { columnCountForLevel, columnHeightRangeForLevel, validateSilhouette } from '../generator/silhouette';

describe('silhouette policy', () => {
  it('columnCountForLevel levels 1-5', () => {
    const r = columnCountForLevel(3);
    expect(r.min).toBe(3);
    expect(r.max).toBe(4);
  });

  it('columnCountForLevel levels 6-20', () => {
    const r = columnCountForLevel(15);
    expect(r.min).toBe(5);
    expect(r.max).toBe(6);
  });

  it('columnCountForLevel levels 21+', () => {
    const r = columnCountForLevel(50);
    expect(r.min).toBe(6);
    expect(r.max).toBe(7);
  });

  it('columnHeightRangeForLevel levels 1-5', () => {
    const r = columnHeightRangeForLevel(2);
    expect(r.min).toBe(1);
    expect(r.max).toBe(3);
  });

  it('columnHeightRangeForLevel levels 6-20', () => {
    const r = columnHeightRangeForLevel(10);
    expect(r.min).toBe(1);
    expect(r.max).toBe(5);
  });

  it('columnHeightRangeForLevel levels 21+', () => {
    const r = columnHeightRangeForLevel(30);
    expect(r.min).toBe(1);
    expect(r.max).toBe(7);
  });

  it('validateSilhouette rejects empty', () => {
    const result = validateSilhouette([]);
    expect(result.ok).toBe(false);
  });

  it('validateSilhouette rejects uniform tower', () => {
    const result = validateSilhouette([5, 5, 5, 5]);
    expect(result.ok).toBe(false);
  });

  it('validateSilhouette accepts varied with tall + shorts', () => {
    const result = validateSilhouette([5, 2, 1, 3]);
    expect(result.ok).toBe(true);
  });

  it('validateSilhouette rejects no tall column', () => {
    const result = validateSilhouette([2, 2, 1, 2]);
    expect(result.ok).toBe(false);
  });
});
