import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const nav = vi.hoisted(() => ({ pathname: '/en/multiplayer', search: '', replace: vi.fn() }));
vi.mock('next/navigation', () => ({
  usePathname: () => nav.pathname,
  useSearchParams: () => new URLSearchParams(nav.search),
  useRouter: () => ({ replace: nav.replace }),
}));

import { useLegacyClassroomRedirect } from '@/components/education/live/useLegacyClassroomRedirect';

describe('useLegacyClassroomRedirect', () => {
  beforeEach(() => nav.replace.mockClear());

  it('given an old classroom QR in the app shell (no middleware), when opened, then it replaces to the live route', () => {
    nav.search = 'room=AB12CD&classroom=true';
    const { result } = renderHook(() => useLegacyClassroomRedirect());
    expect(result.current).toBe('/en/education/live?room=AB12CD');
    expect(nav.replace).toHaveBeenCalledWith('/en/education/live?room=AB12CD');
  });

  it('given an arcade room, when opened, then nothing moves', () => {
    nav.search = 'room=AB12CD';
    const { result } = renderHook(() => useLegacyClassroomRedirect());
    expect(result.current).toBeNull();
    expect(nav.replace).not.toHaveBeenCalled();
  });
});
