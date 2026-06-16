import { describe, it, expect } from 'vitest';
import { canAccessInWorkMode } from './inWorkModeAccess';

describe('canAccessInWorkMode', () => {
  it('allows admins (in-work modes visible to admins)', () => {
    // GIVEN an admin profile
    // WHEN checked
    // THEN allowed
    expect(canAccessInWorkMode({ is_admin: true })).toBe(true);
  });

  it('allows beta testers (the new path)', () => {
    expect(canAccessInWorkMode({ is_beta_tester: true })).toBe(true);
  });

  it('allows a user who is both admin and beta', () => {
    expect(canAccessInWorkMode({ is_admin: true, is_beta_tester: true })).toBe(true);
  });

  it('denies a plain player', () => {
    expect(canAccessInWorkMode({ is_admin: false, is_beta_tester: false })).toBe(false);
  });

  it('denies when profile is null/undefined (fail closed)', () => {
    expect(canAccessInWorkMode(null)).toBe(false);
    expect(canAccessInWorkMode(undefined)).toBe(false);
  });

  it('treats missing flags as false', () => {
    expect(canAccessInWorkMode({})).toBe(false);
  });

  it('tolerates nullable column values from the DB', () => {
    expect(canAccessInWorkMode({ is_admin: null, is_beta_tester: null })).toBe(false);
  });
});
