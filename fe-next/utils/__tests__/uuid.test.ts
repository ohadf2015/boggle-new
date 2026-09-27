/**
 * Tests for UUID validation utilities
 */

import { isValidUUID, getValidUUIDOrUndefined } from '../validation/uuid';

describe('UUID validation utilities', () => {
  describe('isValidUUID', () => {
    it('should return true for valid UUID v4', () => {
      expect(isValidUUID('9a4bd525-6517-488d-a4fa-ee20f76e06c9')).toBe(true);
      expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
      expect(isValidUUID('6ba7b810-9dad-11d1-80b4-00c04fd430c8')).toBe(true);
    });

    it('should return false for invalid UUID formats', () => {
      // Format used by multiplayer game sessions - NOT a valid UUID
      expect(isValidUUID('mp_PLW9X5_1767889799004')).toBe(false);

      // Too short
      expect(isValidUUID('550e8400-e29b-41d4')).toBe(false);

      // Wrong format
      expect(isValidUUID('not-a-uuid')).toBe(false);

      // Missing dashes
      expect(isValidUUID('550e8400e29b41d4a716446655440000')).toBe(false);

      // Contains invalid characters
      expect(isValidUUID('550e8400-e29b-41d4-a716-44665544zzzz')).toBe(false);
    });

    it('should return false for empty/null/undefined values', () => {
      expect(isValidUUID('')).toBe(false);
      expect(isValidUUID(null)).toBe(false);
      expect(isValidUUID(undefined)).toBe(false);
    });

    it('should handle case insensitivity', () => {
      expect(isValidUUID('9A4BD525-6517-488D-A4FA-EE20F76E06C9')).toBe(true);
      expect(isValidUUID('9a4bd525-6517-488d-a4fa-ee20f76e06c9')).toBe(true);
    });
  });

  describe('getValidUUIDOrUndefined', () => {
    it('should return the UUID if valid', () => {
      const uuid = '9a4bd525-6517-488d-a4fa-ee20f76e06c9';
      expect(getValidUUIDOrUndefined(uuid)).toBe(uuid);
    });

    it('should return undefined for invalid UUID', () => {
      expect(getValidUUIDOrUndefined('mp_PLW9X5_1767889799004')).toBeUndefined();
    });

    it('should return undefined for null/undefined', () => {
      expect(getValidUUIDOrUndefined(null)).toBeUndefined();
      expect(getValidUUIDOrUndefined(undefined)).toBeUndefined();
    });
  });
});
