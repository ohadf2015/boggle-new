/**
 * Shiritori is a Japanese-native mode and must ONLY be offered to ja-language
 * players. This locks that product rule. Spec: docs/2026-05-21-shiritori-mode-spec.md.
 */
import { describe, it, expect } from 'vitest';
import { isShiritoriAvailable, availableMpModes, BASE_MP_MODES } from '../availableModes';

describe('shiritori JA-only availability', () => {
  it('is available only when the game language is Japanese', () => {
    expect(isShiritoriAvailable('ja')).toBe(true);
    expect(isShiritoriAvailable('en')).toBe(false);
    expect(isShiritoriAvailable('he')).toBe(false);
    expect(isShiritoriAvailable(null)).toBe(false);
    expect(isShiritoriAvailable(undefined)).toBe(false);
  });

  it('appends shiritori to the mode list for ja, leaves others untouched', () => {
    expect(availableMpModes('ja')).toEqual([...BASE_MP_MODES, 'shiritori']);
    expect(availableMpModes('en')).toEqual(BASE_MP_MODES);
    expect(availableMpModes('en')).not.toContain('shiritori');
  });
});
