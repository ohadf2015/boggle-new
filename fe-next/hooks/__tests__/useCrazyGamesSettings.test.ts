import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock useCrazyGames - must be before import
const { mockGetSettings, mockAddSettingsChangeListener, mockRemoveSettingsChangeListener } = vi.hoisted(() => {
  const mockGetSettings = vi.fn();
  const mockAddSettingsChangeListener = vi.fn();
  const mockRemoveSettingsChangeListener = vi.fn();
  return { mockGetSettings, mockAddSettingsChangeListener, mockRemoveSettingsChangeListener };
});
vi.mock('@/components/CrazyGamesSDK', () => ({
  useCrazyGames: () => ({
    isAvailable: true,
    isLoading: false,
    getSettings: mockGetSettings,
    addSettingsChangeListener: mockAddSettingsChangeListener,
    removeSettingsChangeListener: mockRemoveSettingsChangeListener,
  }),
}));

const { useCrazyGamesSettings } = await import('../useCrazyGamesSettings');

describe('useCrazyGamesSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSettings.mockReturnValue(null);
  });

  describe('hook behavior', () => {
    it('should return default values when settings not available', () => {
      const { result } = renderHook(() => useCrazyGamesSettings());

      expect(result.current.shouldMuteAudio).toBe(false);
      expect(result.current.shouldDisableChat).toBe(false);
      expect(result.current.isReady).toBe(true);
    });

    it('should read initial settings from platform', () => {
      mockGetSettings.mockReturnValue({ muteAudio: true, disableChat: false });

      const { result } = renderHook(() => useCrazyGamesSettings());

      expect(result.current.shouldMuteAudio).toBe(true);
      expect(result.current.shouldDisableChat).toBe(false);
    });

    it('should read disableChat from platform', () => {
      mockGetSettings.mockReturnValue({ muteAudio: false, disableChat: true });

      const { result } = renderHook(() => useCrazyGamesSettings());

      expect(result.current.shouldDisableChat).toBe(true);
    });

    it('should register settings change listener', () => {
      renderHook(() => useCrazyGamesSettings());

      expect(mockAddSettingsChangeListener).toHaveBeenCalledTimes(1);
      expect(mockAddSettingsChangeListener).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should respond to runtime muteAudio change', () => {
      const { result } = renderHook(() => useCrazyGamesSettings());

      // Simulate settings change callback
      const callback = mockAddSettingsChangeListener.mock.calls[0][0];
      act(() => {
        callback('muteAudio', true);
      });

      expect(result.current.shouldMuteAudio).toBe(true);
    });

    it('should respond to runtime disableChat change', () => {
      const { result } = renderHook(() => useCrazyGamesSettings());

      const callback = mockAddSettingsChangeListener.mock.calls[0][0];
      act(() => {
        callback('disableChat', true);
      });

      expect(result.current.shouldDisableChat).toBe(true);
    });

    it('should cleanup listener on unmount', () => {
      const { unmount } = renderHook(() => useCrazyGamesSettings());

      unmount();

      expect(mockRemoveSettingsChangeListener).toHaveBeenCalledTimes(1);
    });
  });
});
