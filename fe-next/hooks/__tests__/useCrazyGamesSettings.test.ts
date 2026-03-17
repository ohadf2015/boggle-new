import { renderHook, act } from '@testing-library/react';
import { triggerHappytime } from '../useCrazyGamesSettings';

// Mock useCrazyGames
const mockGetSettings = jest.fn();
const mockAddSettingsChangeListener = jest.fn();
const mockRemoveSettingsChangeListener = jest.fn();

jest.mock('@/components/CrazyGamesSDK', () => ({
  useCrazyGames: () => ({
    isAvailable: true,
    isLoading: false,
    getSettings: mockGetSettings,
    addSettingsChangeListener: mockAddSettingsChangeListener,
    removeSettingsChangeListener: mockRemoveSettingsChangeListener,
  }),
}));

import { useCrazyGamesSettings } from '../useCrazyGamesSettings';

// Mock CrazyGames SDK on window for triggerHappytime
const mockSDK = {
  game: {
    happyTime: jest.fn(),
  },
};

describe('useCrazyGamesSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

describe('triggerHappytime', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (window as any).CrazyGames = {
      SDK: mockSDK,
    };
  });

  afterEach(() => {
    delete (window as any).CrazyGames;
  });

  it('should call SDK happyTime when available', async () => {
    await triggerHappytime();

    expect(mockSDK.game.happyTime).toHaveBeenCalledTimes(1);
  });

  it('should not throw when SDK unavailable', async () => {
    delete (window as any).CrazyGames;

    await expect(triggerHappytime()).resolves.not.toThrow();
  });

  it('should handle multiple rapid calls', async () => {
    await triggerHappytime();
    await triggerHappytime();
    await triggerHappytime();

    expect(mockSDK.game.happyTime).toHaveBeenCalledTimes(3);
  });

  it('should work even if SDK is null', async () => {
    (window as any).CrazyGames = null;

    await expect(triggerHappytime()).resolves.not.toThrow();
  });

  it('should handle errors gracefully', async () => {
    mockSDK.game.happyTime.mockImplementation(() => {
      throw new Error('SDK error');
    });

    await expect(triggerHappytime()).resolves.not.toThrow();
  });
});
