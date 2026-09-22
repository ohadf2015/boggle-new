import { describe, it, expect } from 'vitest';
import { canAccessInWorkMode, inWorkModeAccess } from './inWorkModeAccess';

describe('canAccessInWorkMode', () => {
  it('allows admins (in-work modes visible to admins)', () => {
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

const guest = { loading: false, user: null, profile: null, canSeeInWorkModes: false, isDev: false };
const beta = { loading: false, user: { id: 'u' }, profile: { id: 'p' }, canSeeInWorkModes: true, isDev: false };

describe('inWorkModeAccess (client route race)', () => {
  it('given a beta tester or admin, when the profile has landed, then they are allowed', () => {
    expect(inWorkModeAccess(beta)).toEqual({ resolving: false, denied: false, allowed: true });
  });

  it('given an ordinary player, when opened, then they are denied', () => {
    expect(inWorkModeAccess(guest)).toEqual({ resolving: false, denied: true, allowed: false });
  });

  it('given auth still loading, when opened, then it waits instead of bouncing', () => {
    expect(inWorkModeAccess({ ...guest, loading: true })).toEqual({
      resolving: true,
      denied: false,
      allowed: false,
    });
  });

  it('given a signed-in user whose profile has not landed, when opened, then it waits', () => {
    expect(inWorkModeAccess({ ...guest, user: { id: 'u' }, profile: null })).toEqual({
      resolving: true,
      denied: false,
      allowed: false,
    });
  });

  it('given local development, when opened, then the gate is bypassed', () => {
    expect(inWorkModeAccess({ ...guest, isDev: true }).allowed).toBe(true);
  });
});
