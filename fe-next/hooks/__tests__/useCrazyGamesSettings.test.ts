import { renderHook, waitFor } from '@testing-library/react';
import { useCrazyGamesSettings, triggerHappytime } from '../useCrazyGamesSettings';
import { Howler } from 'howler';

// Mock dependencies
jest.mock('howler', () => ({
  Howler: {
    mute: jest.fn(),
  },
}));

// Mock CrazyGames SDK on window
const mockSDK = {
  game: {
    settings: {
      muteAudio: false,
      disableChat: false,
    },
    onSettingsChange: jest.fn(),
    happytime: jest.fn(),
  },
};

describe('useCrazyGamesSettings', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup window.CrazyGames.SDK mock
    (window as any).CrazyGames = {
      SDK: mockSDK,
    };

    // Reset Howler mute state
    (Howler.mute as jest.Mock).mockClear();
  });

  afterEach(() => {
    delete (window as any).CrazyGames;
  });

  describe('initialization', () => {
    it('should read initial settings from SDK', async () => {
      mockSDK.game.settings = {
        muteAudio: true,
        disableChat: false,
      };

      const { result } = renderHook(() => useCrazyGamesSettings());

      await waitFor(() => {
        expect(result.current.muteAudio).toBe(true);
        expect(result.current.disableChat).toBe(false);
      });
    });

    it('should apply initial mute setting to Howler', async () => {
      mockSDK.game.settings = {
        muteAudio: true,
        disableChat: false,
      };

      renderHook(() => useCrazyGamesSettings());

      await waitFor(() => {
        expect(Howler.mute).toHaveBeenCalledWith(true);
      });
    });

    it('should not mute when initial setting is false', async () => {
      mockSDK.game.settings = {
        muteAudio: false,
        disableChat: false,
      };

      const { result } = renderHook(() => useCrazyGamesSettings());

      await waitFor(() => {
        expect(result.current.muteAudio).toBe(false);
      });

      expect(Howler.mute).not.toHaveBeenCalledWith(true);
    });

    it('should register settings change listener', async () => {
      renderHook(() => useCrazyGamesSettings());

      await waitFor(() => {
        expect(mockSDK.game.onSettingsChange).toHaveBeenCalledTimes(1);
      });
    });

    it('should handle missing SDK gracefully', async () => {
      delete (window as any).CrazyGames;

      const { result } = renderHook(() => useCrazyGamesSettings());

      expect(result.current.muteAudio).toBe(false);
      expect(result.current.disableChat).toBe(false);
      expect(Howler.mute).not.toHaveBeenCalled();
    });
  });

  describe('settings changes', () => {
    it('should update muteAudio when settings change', async () => {
      mockSDK.game.settings = {
        muteAudio: false,
        disableChat: false,
      };

      const { result } = renderHook(() => useCrazyGamesSettings());

      await waitFor(() => {
        expect(mockSDK.game.onSettingsChange).toHaveBeenCalled();
      });

      // Get the callback
      const callback = mockSDK.game.onSettingsChange.mock.calls[0][0];

      // Trigger settings change
      callback({ muteAudio: true });

      await waitFor(() => {
        expect(result.current.muteAudio).toBe(true);
      });
    });

    it('should update Howler mute when audio setting changes', async () => {
      mockSDK.game.settings = {
        muteAudio: false,
        disableChat: false,
      };

      renderHook(() => useCrazyGamesSettings());

      await waitFor(() => {
        expect(mockSDK.game.onSettingsChange).toHaveBeenCalled();
      });

      const callback = mockSDK.game.onSettingsChange.mock.calls[0][0];

      // Mute audio
      callback({ muteAudio: true });

      await waitFor(() => {
        expect(Howler.mute).toHaveBeenCalledWith(true);
      });

      // Unmute audio
      callback({ muteAudio: false });

      await waitFor(() => {
        expect(Howler.mute).toHaveBeenCalledWith(false);
      });
    });

    it('should update disableChat when chat setting changes', async () => {
      mockSDK.game.settings = {
        muteAudio: false,
        disableChat: false,
      };

      const { result } = renderHook(() => useCrazyGamesSettings());

      await waitFor(() => {
        expect(mockSDK.game.onSettingsChange).toHaveBeenCalled();
      });

      const callback = mockSDK.game.onSettingsChange.mock.calls[0][0];

      // Disable chat
      callback({ disableChat: true });

      await waitFor(() => {
        expect(result.current.disableChat).toBe(true);
      });
    });

    it('should handle undefined settings values', async () => {
      mockSDK.game.settings = {
        muteAudio: false,
        disableChat: false,
      };

      const { result } = renderHook(() => useCrazyGamesSettings());

      await waitFor(() => {
        expect(mockSDK.game.onSettingsChange).toHaveBeenCalled();
      });

      const callback = mockSDK.game.onSettingsChange.mock.calls[0][0];

      // Send undefined values (no change)
      callback({ muteAudio: undefined, disableChat: undefined });

      await waitFor(() => {
        expect(result.current.muteAudio).toBe(false);
        expect(result.current.disableChat).toBe(false);
      });
    });

    it('should handle partial settings changes', async () => {
      mockSDK.game.settings = {
        muteAudio: false,
        disableChat: false,
      };

      const { result } = renderHook(() => useCrazyGamesSettings());

      await waitFor(() => {
        expect(mockSDK.game.onSettingsChange).toHaveBeenCalled();
      });

      const callback = mockSDK.game.onSettingsChange.mock.calls[0][0];

      // Only change mute, not chat
      callback({ muteAudio: true });

      await waitFor(() => {
        expect(result.current.muteAudio).toBe(true);
        expect(result.current.disableChat).toBe(false);
      });
    });
  });

  describe('edge cases', () => {
    it('should handle initial disableChat setting', async () => {
      mockSDK.game.settings = {
        muteAudio: false,
        disableChat: true,
      };

      const { result } = renderHook(() => useCrazyGamesSettings());

      await waitFor(() => {
        expect(result.current.disableChat).toBe(true);
      });
    });

    it('should handle both settings being true initially', async () => {
      mockSDK.game.settings = {
        muteAudio: true,
        disableChat: true,
      };

      const { result } = renderHook(() => useCrazyGamesSettings());

      await waitFor(() => {
        expect(result.current.muteAudio).toBe(true);
        expect(result.current.disableChat).toBe(true);
        expect(Howler.mute).toHaveBeenCalledWith(true);
      });
    });

    it('should handle rapid settings changes', async () => {
      mockSDK.game.settings = {
        muteAudio: false,
        disableChat: false,
      };

      const { result } = renderHook(() => useCrazyGamesSettings());

      await waitFor(() => {
        expect(mockSDK.game.onSettingsChange).toHaveBeenCalled();
      });

      const callback = mockSDK.game.onSettingsChange.mock.calls[0][0];

      // Rapid changes
      callback({ muteAudio: true });
      callback({ muteAudio: false });
      callback({ muteAudio: true });

      await waitFor(() => {
        expect(result.current.muteAudio).toBe(true);
      });
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

  it('should call SDK happytime when available', async () => {
    await triggerHappytime();

    expect(mockSDK.game.happytime).toHaveBeenCalledTimes(1);
  });

  it('should not throw when SDK unavailable', async () => {
    delete (window as any).CrazyGames;

    await expect(triggerHappytime()).resolves.not.toThrow();
  });

  it('should handle multiple rapid calls', async () => {
    await triggerHappytime();
    await triggerHappytime();
    await triggerHappytime();

    expect(mockSDK.game.happytime).toHaveBeenCalledTimes(3);
  });

  it('should work even if SDK is null', async () => {
    (window as any).CrazyGames = null;

    await expect(triggerHappytime()).resolves.not.toThrow();
  });
});
