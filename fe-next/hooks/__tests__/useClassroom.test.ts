import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useClassrooms } from '../useClassroom';
import * as supabaseEducation from '@/lib/supabase/education';

// Mock Supabase education module
vi.mock('@/lib/supabase/education');

// Mock AuthContext.
//
// The returned object MUST be reference-stable across renders. The real provider wraps its
// value in `useMemo`, so `user` keeps the same identity; a factory that builds a fresh object
// per render does not model that, and it makes `useClassrooms` refetch in an endless loop
// (the initial-fetch effect depends on a callback keyed off auth state). That loop is an
// artifact of the mock, not a product bug — but it drowns the assertions either way.
const mockAuthState = {
  isAuthenticated: true,
  user: { id: 'user-123' } as { id: string } | null,
};
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => mockAuthState),
}));

// Same reasoning: the real `useMounted` hands back a ref, which is stable for the life of the
// component. Returning a new `{ current: true }` each render would re-create the fetch
// callback every render.
const mockMountedRef = { current: true };
vi.mock('@/hooks/useMounted', () => ({
  useMounted: vi.fn(() => mockMountedRef),
}));

// Mock logger. All four levels are required, not just `error`: importing
// `@/lib/supabase/education` pulls in `lib/supabase.ts`, which calls
// `logger.warn` at module scope when credentials are absent. A partial mock
// throws during import and the whole suite collects ZERO tests — which looks
// identical to "no tests to run" in a summary line.
vi.mock('@/utils/logger', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

describe('useClassrooms refetch behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should refetch when document visibility changes to visible', async () => {
    // GIVEN: Mock successful classroom fetch
    const mockClassrooms = [
      { id: '1', name: 'Class 1', member_count: 5 },
      { id: '2', name: 'Class 2', member_count: 3 },
    ];
    (supabaseEducation.getClassrooms as any).mockResolvedValue({
      data: mockClassrooms,
      error: null,
    });

    // WHEN: Render hook
    const { result } = renderHook(() => useClassrooms());

    // Wait for initial fetch
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect((supabaseEducation.getClassrooms as any).mock.calls.length).toBe(1);

    // Simulate visibility change to visible (should trigger refetch)
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      writable: true,
      configurable: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));

    // THEN: Should refetch
    await waitFor(() => {
      expect((supabaseEducation.getClassrooms as any).mock.calls.length).toBeGreaterThan(1);
    }, { timeout: 1000 });
  });

  it('should refetch when window receives focus', async () => {
    // GIVEN: Mock successful classroom fetch
    const mockClassrooms = [
      { id: '1', name: 'Class 1', member_count: 5 },
    ];
    (supabaseEducation.getClassrooms as any).mockResolvedValue({
      data: mockClassrooms,
      error: null,
    });

    // WHEN: Render hook
    const { result } = renderHook(() => useClassrooms());

    // Wait for initial fetch
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const callCount = (supabaseEducation.getClassrooms as any).mock.calls.length;

    // Simulate window focus event
    window.dispatchEvent(new Event('focus'));

    // THEN: Should refetch
    await waitFor(() => {
      expect((supabaseEducation.getClassrooms as any).mock.calls.length).toBeGreaterThan(callCount);
    }, { timeout: 1000 });
  });

  it('should refetch only ONCE when focus and visibilitychange arrive together', async () => {
    // Returning to a backgrounded tab fires BOTH events, so this is the normal case, not an
    // edge case. The debounce state must live in a ref: held in the effect body (with
    // `isLoading` as a dependency) the first refetch re-runs the effect and resets the
    // timestamp, so the second event fetches again — the guard collapses exactly here.
    (supabaseEducation.getClassrooms as any).mockResolvedValue({
      data: [{ id: '1', name: 'Class 1', member_count: 5 }],
      error: null,
    });

    const { result } = renderHook(() => useClassrooms());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const before = (supabaseEducation.getClassrooms as any).mock.calls.length;

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'visible',
    });
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new Event('focus'));

    await waitFor(() => {
      expect((supabaseEducation.getClassrooms as any).mock.calls.length).toBe(before + 1);
    }, { timeout: 1000 });

    // And still only one after the queue drains — not two arriving late.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect((supabaseEducation.getClassrooms as any).mock.calls.length).toBe(before + 1);
  });

  it('should not attach refetch listeners for a signed-out visitor', async () => {
    const addDocListener = vi.spyOn(document, 'addEventListener');
    const previousUser = mockAuthState.user;
    mockAuthState.isAuthenticated = false;
    mockAuthState.user = null;

    try {
      renderHook(() => useClassrooms());
      await waitFor(() => {
        expect(addDocListener).not.toHaveBeenCalledWith('visibilitychange', expect.anything());
      });
    } finally {
      mockAuthState.isAuthenticated = true;
      mockAuthState.user = previousUser;
      addDocListener.mockRestore();
    }
  });

  it('should remove event listeners on unmount', async () => {
    // GIVEN: Mock successful classroom fetch
    const mockClassrooms = [
      { id: '1', name: 'Class 1', member_count: 5 },
    ];
    (supabaseEducation.getClassrooms as any).mockResolvedValue({
      data: mockClassrooms,
      error: null,
    });

    // WHEN: Render and unmount hook
    const { result, unmount } = renderHook(() => useClassrooms());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const initialCallCount = (supabaseEducation.getClassrooms as any).mock.calls.length;

    // Add a small spy to track if listeners are removed
    const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');
    const windowRemoveEventListenerSpy = vi.spyOn(window, 'removeEventListener');

    unmount();

    // THEN: Should remove listeners on unmount
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'visibilitychange',
      expect.any(Function)
    );
    expect(windowRemoveEventListenerSpy).toHaveBeenCalledWith(
      'focus',
      expect.any(Function)
    );

    removeEventListenerSpy.mockRestore();
    windowRemoveEventListenerSpy.mockRestore();
  });
});
