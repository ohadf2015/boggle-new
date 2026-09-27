import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    profile: { id: 'u-1', user_role: 'teacher', is_admin: false },
    user: { id: 'u-1' },
    loading: false,
  }),
}));

import { useTeacherAccess } from '../useTeacherAccess';

describe('useTeacherAccess', () => {
  it('returns hasAccess=true for teacher role', () => {
    const { result } = renderHook(() => useTeacherAccess());
    expect(result.current.hasAccess).toBe(true);
    expect(result.current.status).toBe('approved');
  });
});
