/**
 * Tests for isTeacher computed auth value
 *
 * TDD: Tests written FIRST before implementation
 * Verifies isTeacher is derived correctly from user_role
 */

import { renderHook } from '@testing-library/react';
import { useComputedAuthValues } from '../auth/hooks/useAuthState';
import type { ProfileData } from '../auth/authTypes';

describe('useComputedAuthValues - isTeacher', () => {
  const baseProfile: ProfileData = {
    id: 'user-1',
    username: 'testuser',
  };

  const noProfile = null;

  it('should return isTeacher=false when profile is null', () => {
    const { result } = renderHook(() =>
      useComputedAuthValues(null, noProfile, null)
    );
    expect(result.current.isTeacher).toBe(false);
  });

  it('should return isTeacher=false when user_role is student', () => {
    const profile: ProfileData = { ...baseProfile, user_role: 'student' };
    const { result } = renderHook(() =>
      useComputedAuthValues({ id: 'u1' } as never, profile, null)
    );
    expect(result.current.isTeacher).toBe(false);
  });

  it('should return isTeacher=true when user_role is teacher', () => {
    const profile: ProfileData = { ...baseProfile, user_role: 'teacher' };
    const { result } = renderHook(() =>
      useComputedAuthValues({ id: 'u1' } as never, profile, null)
    );
    expect(result.current.isTeacher).toBe(true);
  });

  it('should return isTeacher=true when user_role is admin', () => {
    const profile: ProfileData = { ...baseProfile, user_role: 'admin' };
    const { result } = renderHook(() =>
      useComputedAuthValues({ id: 'u1' } as never, profile, null)
    );
    expect(result.current.isTeacher).toBe(true);
  });

  it('should return isTeacher=false when user_role is undefined', () => {
    const profile: ProfileData = { ...baseProfile };
    const { result } = renderHook(() =>
      useComputedAuthValues({ id: 'u1' } as never, profile, null)
    );
    expect(result.current.isTeacher).toBe(false);
  });
});
