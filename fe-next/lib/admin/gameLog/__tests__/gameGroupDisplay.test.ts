import { describe, it, expect } from 'vitest';
import {
  countryFlag,
  platformLabel,
  playerDeviceLabel,
} from '../gameGroupDisplay';

const mockT = (key: string, fallback: string) => fallback;

describe('gameGroupDisplay', () => {
  describe('countryFlag', () => {
    it('converts ISO-2 country code to flag emoji', () => {
      expect(countryFlag('IL')).toBe('🇮🇱');
      expect(countryFlag('US')).toBe('🇺🇸');
      expect(countryFlag('GB')).toBe('🇬🇧');
      expect(countryFlag('DE')).toBe('🇩🇪');
      expect(countryFlag('FR')).toBe('🇫🇷');
      expect(countryFlag('SE')).toBe('🇸🇪');
      expect(countryFlag('JP')).toBe('🇯🇵');
      expect(countryFlag('ES')).toBe('🇪🇸');
    });

    it('returns empty string for null', () => {
      expect(countryFlag(null)).toBe('');
    });

    it('returns empty string for undefined', () => {
      expect(countryFlag(undefined)).toBe('');
    });

    it('handles lowercase ISO codes', () => {
      expect(countryFlag('il')).toBe('🇮🇱');
      expect(countryFlag('us')).toBe('🇺🇸');
    });
  });

  describe('platformLabel', () => {
    it('returns web platform with icon', () => {
      const result = platformLabel('web', mockT);
      expect(result.icon).toBe('🌐');
      expect(result.label).toBe('Web');
    });

    it('returns native for ios', () => {
      const result = platformLabel('ios', mockT);
      expect(result.icon).toBe('📱');
      expect(result.label).toBe('Native');
    });

    it('returns native for android', () => {
      const result = platformLabel('android', mockT);
      expect(result.icon).toBe('📱');
      expect(result.label).toBe('Native');
    });

    it('returns unknown for null', () => {
      const result = platformLabel(null, mockT);
      expect(result.icon).toBe('');
      expect(result.label).toBe('—');
    });

    it('returns unknown for undefined', () => {
      const result = platformLabel(undefined, mockT);
      expect(result.icon).toBe('');
      expect(result.label).toBe('—');
    });

    it('returns unknown for unrecognized platform', () => {
      const result = platformLabel('unknown_platform', mockT);
      expect(result.icon).toBe('');
      expect(result.label).toBe('—');
    });
  });

  describe('playerDeviceLabel', () => {
    it('returns device parts joined by dots', () => {
      expect(playerDeviceLabel('iPhone', 'iOS', 'Safari')).toBe('iPhone · iOS · Safari');
      expect(playerDeviceLabel('iPad', 'iOS', 'Chrome')).toBe('iPad · iOS · Chrome');
    });

    it('filters out null/undefined parts', () => {
      expect(playerDeviceLabel('iPhone', null, 'Safari')).toBe('iPhone · Safari');
      expect(playerDeviceLabel(null, 'iOS', 'Safari')).toBe('iOS · Safari');
      expect(playerDeviceLabel('iPhone', 'iOS', null)).toBe('iPhone · iOS');
    });

    it('returns unknown device when all parts are null', () => {
      expect(playerDeviceLabel(null, null, null)).toBe('Unknown device');
    });

    it('returns unknown device when all parts are undefined', () => {
      expect(playerDeviceLabel(undefined, undefined, undefined)).toBe('Unknown device');
    });

    it('handles mixed null and undefined', () => {
      expect(playerDeviceLabel('iPhone', undefined, null)).toBe('iPhone');
      expect(playerDeviceLabel(null, 'iOS', undefined)).toBe('iOS');
    });

    it('preserves single part with spacing', () => {
      expect(playerDeviceLabel('Desktop', null, null)).toBe('Desktop');
    });
  });
});
