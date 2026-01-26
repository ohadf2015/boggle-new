import { renderHook } from '@testing-library/react';
import { useCrazyGamesSettings, triggerHappytime } from '../useCrazyGamesSettings';

// Mock CrazyGames SDK on window
const mockSDK = {
  game: {
    happyTime: jest.fn(),
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
  });

  afterEach(() => {
    delete (window as any).CrazyGames;
  });

  describe('hook behavior', () => {
    it('should return empty object (no platform settings available)', () => {
      const { result } = renderHook(() => useCrazyGamesSettings());

      expect(result.current).toEqual({});
    });

    it('should handle missing SDK gracefully', () => {
      delete (window as any).CrazyGames;

      const { result } = renderHook(() => useCrazyGamesSettings());

      expect(result.current).toEqual({});
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
