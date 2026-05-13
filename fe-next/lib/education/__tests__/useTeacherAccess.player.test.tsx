import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    profile: { id: 'u-1', user_role: 'player', is_admin: false },
    user: { id: 'u-1' },
    loading: false,
  }),
}));

import { useTeacherAccess } from '../useTeacherAccess';

describe('useTeacherAccess (player role)', () => {
  it('returns hasAccess=false for player role', () => {
    const { result } = renderHook(() => useTeacherAccess());
    expect(result.current.hasAccess).toBe(false);
    expect(result.current.status).toBe('none');
  });
});
