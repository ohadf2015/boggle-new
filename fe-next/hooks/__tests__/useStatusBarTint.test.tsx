/**
 * Tests for useStatusBarTint.
 *
 * Edge-to-edge contract (Android 15 / API 35+): the system bars are transparent
 * and the WebView draws behind them, so the hook must NOT set a bar background
 * color — `StatusBar.setBackgroundColor()` compiles the deprecated
 * `Window.setStatusBarColor()` into the app and is flagged by Play Console.
 * The hook only adapts the bar *icon* contrast per route via the modern
 * `StatusBar.setStyle()` (WindowInsetsControllerCompat under the hood).
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useStatusBarTint } from '../useStatusBarTint';
import { isNative } from '@/utils/platform';

const mockSetBackgroundColor = vi.fn(() => Promise.resolve());
const mockSetStyle = vi.fn(() => Promise.resolve());

vi.mock('@/utils/platform', () => ({
  isNative: vi.fn(() => true),
}));

vi.mock('@capacitor/status-bar', () => ({
  StatusBar: {
    setBackgroundColor: (...args: unknown[]) => mockSetBackgroundColor(...args),
    setStyle: (...args: unknown[]) => mockSetStyle(...args),
  },
  Style: { Light: 'LIGHT', Dark: 'DARK' },
}));

let mockPathname = '/multiplayer';
vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}));

vi.mock('@/utils/logger', () => ({
  __esModule: true,
  default: { warn: vi.fn(), log: vi.fn(), error: vi.fn() },
}));

const mockIsNative = isNative as unknown as ReturnType<typeof vi.fn>;

describe('useStatusBarTint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsNative.mockReturnValue(true);
    mockPathname = '/multiplayer';
  });

  it('never calls the deprecated setBackgroundColor on native (edge-to-edge: bars transparent)', async () => {
    // GIVEN native, on a brand route
    // WHEN the hook mounts
    renderHook(() => useStatusBarTint());

    // THEN it adapts icon style but does NOT set a bar background color
    await waitFor(() => expect(mockSetStyle).toHaveBeenCalled());
    expect(mockSetBackgroundColor).not.toHaveBeenCalled();
  });

  it('uses light icons (Style.Dark) over a dark route background', async () => {
    // GIVEN an unmatched route → defaults to navy (dark)
    mockPathname = '/profile';

    // WHEN
    renderHook(() => useStatusBarTint());

    // THEN dark bg → light icons → Style.Dark
    await waitFor(() =>
      expect(mockSetStyle).toHaveBeenCalledWith({ style: 'DARK' })
    );
  });

  it('uses dark icons (Style.Light) over a light route background', async () => {
    // GIVEN /daily → YELLOW (#FFE135), high luminance
    mockPathname = '/daily';

    // WHEN
    renderHook(() => useStatusBarTint());

    // THEN light bg → dark icons → Style.Light
    await waitFor(() =>
      expect(mockSetStyle).toHaveBeenCalledWith({ style: 'LIGHT' })
    );
  });

  it('is a no-op on web (not native)', async () => {
    // GIVEN web
    mockIsNative.mockReturnValue(false);

    // WHEN
    renderHook(() => useStatusBarTint());

    // THEN neither bar API is touched
    await Promise.resolve();
    expect(mockSetStyle).not.toHaveBeenCalled();
    expect(mockSetBackgroundColor).not.toHaveBeenCalled();
  });
});
