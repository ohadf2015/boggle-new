/**
 * Tests for isBetaTester + canSeeInWorkModes computed auth values.
 *
 * canSeeInWorkModes is the durable client chokepoint: in-work modes are visible
 * to admins OR beta testers. Every client mode-gate routes through it.
 */

import { renderHook } from '@testing-library/react';
import { useComputedAuthValues } from '../auth/hooks/useAuthState';
import type { ProfileData } from '../auth/authTypes';

const base: ProfileData = { id: 'u1', username: 'testuser' };
const user = { id: 'u1' } as never;

describe('useComputedAuthValues - isBetaTester / canSeeInWorkModes', () => {
  it('isBetaTester=false and canSeeInWorkModes=false when profile is null', () => {
    const { result } = renderHook(() => useComputedAuthValues(null, null, null));
    expect(result.current.isBetaTester).toBe(false);
    expect(result.current.canSeeInWorkModes).toBe(false);
  });

  it('plain player: both false', () => {
    const { result } = renderHook(() => useComputedAuthValues(user, { ...base }, null));
    expect(result.current.isBetaTester).toBe(false);
    expect(result.current.canSeeInWorkModes).toBe(false);
  });

  it('admin: canSeeInWorkModes=true even without beta flag', () => {
    const profile: ProfileData = { ...base, is_admin: true };
    const { result } = renderHook(() => useComputedAuthValues(user, profile, null));
    expect(result.current.isBetaTester).toBe(false);
    expect(result.current.canSeeInWorkModes).toBe(true);
  });

  it('beta tester (non-admin): isBetaTester=true and canSeeInWorkModes=true', () => {
    const profile: ProfileData = { ...base, is_beta_tester: true };
    const { result } = renderHook(() => useComputedAuthValues(user, profile, null));
    expect(result.current.isBetaTester).toBe(true);
    expect(result.current.canSeeInWorkModes).toBe(true);
  });
});
