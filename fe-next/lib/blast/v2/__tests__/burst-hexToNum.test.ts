import { describe, it, expect } from 'vitest';
import { hexToNum } from '../fx/burst';

describe('hexToNum', () => {
  it('parses #RRGGBB correctly', () => {
    expect(hexToNum('#BFFF00')).toBe(0xbfff00);
    expect(hexToNum('#FF1493')).toBe(0xff1493);
    expect(hexToNum('#00FFFF')).toBe(0x00ffff);
    expect(hexToNum('#8B5CF6')).toBe(0x8b5cf6);
  });

  it('parses lowercase hex', () => {
    expect(hexToNum('#bfff00')).toBe(0xbfff00);
  });

  it('parses without leading #', () => {
    expect(hexToNum('BFFF00')).toBe(0xbfff00);
  });

  it('returns fallback for empty string', () => {
    expect(hexToNum('')).toBe(0xbfff00);
  });

  it('returns fallback for non-hex string', () => {
    expect(hexToNum('lime')).toBe(0xbfff00);
    expect(hexToNum('rgb(191,255,0)')).toBe(0xbfff00);
  });

  it('returns fallback for malformed short hex', () => {
    expect(hexToNum('#FFF')).toBe(0xbfff00);
  });

  it('returns custom fallback when provided', () => {
    expect(hexToNum('bad', 0xffffff)).toBe(0xffffff);
  });

  it('never returns a negative number', () => {
    const result = hexToNum('#BFFF00');
    expect(result).toBeGreaterThanOrEqual(0);
  });

  it('never returns a value above 0xFFFFFF', () => {
    const result = hexToNum('#FFFFFF');
    expect(result).toBeLessThanOrEqual(0xffffff);
  });
});
