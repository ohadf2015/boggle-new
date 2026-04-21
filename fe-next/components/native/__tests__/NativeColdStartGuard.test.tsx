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
});
