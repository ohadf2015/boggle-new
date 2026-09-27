import React from 'react';
import { render } from '@testing-library/react';
import { isNative } from '@/utils/platform';

const mockReplace = vi.fn();
const mockUsePathname = vi.fn<() => string>(() => '/en');

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace, push: vi.fn() }),
  usePathname: () => mockUsePathname(),
}));

vi.mock('@/utils/platform', () => ({
  isNative: vi.fn(() => true),
}));

import { NativeColdStartGuard } from '../NativeColdStartGuard';

const NATIVE_COLD_START_FLAG = 'lexiclash_native_cold_start_handled';
const mockIsNative = isNative as unknown as ReturnType<typeof vi.fn>;

describe('NativeColdStartGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    localStorage.clear();
    mockIsNative.mockReturnValue(true);
  });

  it('redirects cold-start launches landing on /legal/privacy to the locale home', () => {
    mockUsePathname.mockReturnValue('/en/legal/privacy');

    render(<NativeColdStartGuard />);

    expect(mockReplace).toHaveBeenCalledWith('/en');
    expect(sessionStorage.getItem(NATIVE_COLD_START_FLAG)).toBe('1');
  });

  it('redirects cold-start launches landing on /legal/terms to the locale home', () => {
    mockUsePathname.mockReturnValue('/he/legal/terms');

    render(<NativeColdStartGuard />);

    expect(mockReplace).toHaveBeenCalledWith('/he');
  });

  it('does not redirect if the user is already on the locale home', () => {
    mockUsePathname.mockReturnValue('/en');

    render(<NativeColdStartGuard />);

    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('does not redirect once the flag has been set (subsequent navigations)', () => {
    sessionStorage.setItem(NATIVE_COLD_START_FLAG, '1');
    mockUsePathname.mockReturnValue('/en/legal/privacy');

    render(<NativeColdStartGuard />);

    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('sets the flag even when no redirect is needed so subsequent legal visits are allowed', () => {
    mockUsePathname.mockReturnValue('/en');

    render(<NativeColdStartGuard />);

    expect(sessionStorage.getItem(NATIVE_COLD_START_FLAG)).toBe('1');
  });

  it('is a no-op on web', () => {
    mockIsNative.mockReturnValue(false);
    mockUsePathname.mockReturnValue('/en/legal/privacy');

    render(<NativeColdStartGuard />);

    expect(mockReplace).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(NATIVE_COLD_START_FLAG)).toBeNull();
  });

  it('preserves the locale segment when redirecting from a legal page', () => {
    mockUsePathname.mockReturnValue('/sv/legal/cookies');

    render(<NativeColdStartGuard />);

    expect(mockReplace).toHaveBeenCalledWith('/sv');
  });

  it('defaults to /en when the pathname has no recognized locale prefix', () => {
    mockUsePathname.mockReturnValue('/legal/privacy');

    render(<NativeColdStartGuard />);

    expect(mockReplace).toHaveBeenCalledWith('/en');
  });

  describe('route restoration on cold start', () => {
    const LAST_ROUTE_KEY = 'lexiclash_last_route';
    const saveRoute = (path: string, ts: number = Date.now()) =>
      localStorage.setItem(LAST_ROUTE_KEY, JSON.stringify({ path, ts }));

    it('restores the last stable hub route when booting to home', () => {
      saveRoute('/en/profile');
      mockUsePathname.mockReturnValue('/en');

      render(<NativeColdStartGuard />);

      expect(mockReplace).toHaveBeenCalledWith('/en/profile');
    });

    it('does NOT restore a gameplay route — stays on home', () => {
      saveRoute('/en/singleplayer');
      mockUsePathname.mockReturnValue('/en');

      render(<NativeColdStartGuard />);

      expect(mockReplace).not.toHaveBeenCalled();
    });

    it('does NOT restore a stale route (older than the window)', () => {
      saveRoute('/en/profile', Date.now() - 60 * 60 * 1000); // 1h ago
      mockUsePathname.mockReturnValue('/en');

      render(<NativeColdStartGuard />);

      expect(mockReplace).not.toHaveBeenCalled();
    });

    it('does NOT restore when the launch did not land on home', () => {
      saveRoute('/en/profile');
      mockUsePathname.mockReturnValue('/en/leaderboard');

      render(<NativeColdStartGuard />);

      expect(mockReplace).not.toHaveBeenCalled();
    });
  });

  describe('route persistence', () => {
    const LAST_ROUTE_KEY = 'lexiclash_last_route';

    it('persists the current route on native so the next cold start can restore it', () => {
      mockUsePathname.mockReturnValue('/en/friends');

      render(<NativeColdStartGuard />);

      const saved = JSON.parse(localStorage.getItem(LAST_ROUTE_KEY) ?? 'null');
      expect(saved?.path).toBe('/en/friends');
      expect(typeof saved?.ts).toBe('number');
    });

    it('does not persist anything on web', () => {
      mockIsNative.mockReturnValue(false);
      mockUsePathname.mockReturnValue('/en/friends');

      render(<NativeColdStartGuard />);

      expect(localStorage.getItem(LAST_ROUTE_KEY)).toBeNull();
    });
  });
});
