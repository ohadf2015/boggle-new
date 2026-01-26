import { renderHook, act, waitFor } from '@testing-library/react';
import { useCrazyGamesAds } from '../useCrazyGamesAds';
import { useCrazyGames } from '@/components/CrazyGamesSDK';
import { Howler } from 'howler';

// Mock dependencies
jest.mock('@/components/CrazyGamesSDK');
jest.mock('howler', () => ({
  Howler: {
    mute: jest.fn(),
  },
}));

describe('useCrazyGamesAds', () => {
  let mockShowRewardedAd: jest.Mock;
  let mockShowMidgameAd: jest.Mock;
  let mockHasAdblock: jest.Mock;
  let mockGameplayStop: jest.Mock;
  let mockGameplayStart: jest.Mock;

  beforeEach(() => {
    mockShowRewardedAd = jest.fn();
    mockShowMidgameAd = jest.fn();
    mockHasAdblock = jest.fn();
    mockGameplayStop = jest.fn();
    mockGameplayStart = jest.fn();

    (useCrazyGames as jest.Mock).mockReturnValue({
      isAvailable: true,
      showRewardedAd: mockShowRewardedAd,
      showMidgameAd: mockShowMidgameAd,
      hasAdblock: mockHasAdblock,
      gameplayStop: mockGameplayStop,
      gameplayStart: mockGameplayStart,
    });

    // Default: no adblock
    mockHasAdblock.mockResolvedValue(false);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should check for adblock on mount', async () => {
      renderHook(() => useCrazyGamesAds());

      await waitFor(() => {
        expect(mockHasAdblock).toHaveBeenCalledTimes(1);
      });
    });

    it('should set hasAdblock state when adblock detected', async () => {
      mockHasAdblock.mockResolvedValue(true);

      const { result } = renderHook(() => useCrazyGamesAds());

      await waitFor(() => {
        expect(result.current.hasAdblock).toBe(true);
      });
    });

    it('should not check adblock when SDK unavailable', async () => {
      (useCrazyGames as jest.Mock).mockReturnValue({
        isAvailable: false,
        showRewardedAd: mockShowRewardedAd,
        showMidgameAd: mockShowMidgameAd,
        hasAdblock: mockHasAdblock,
        gameplayStop: mockGameplayStop,
        gameplayStart: mockGameplayStart,
      });

      renderHook(() => useCrazyGamesAds());

      await waitFor(() => {
        expect(mockHasAdblock).not.toHaveBeenCalled();
      });
    });
  });

  describe('requestMidgameAd', () => {
    it('should return false when SDK unavailable', async () => {
      (useCrazyGames as jest.Mock).mockReturnValue({
        isAvailable: false,
        showRewardedAd: mockShowRewardedAd,
        showMidgameAd: mockShowMidgameAd,
        hasAdblock: mockHasAdblock,
        gameplayStop: mockGameplayStop,
        gameplayStart: mockGameplayStart,
      });

      const { result } = renderHook(() => useCrazyGamesAds());
      let adResult: boolean | undefined;

      await act(async () => {
        adResult = await result.current.requestMidgameAd();
      });

      expect(adResult).toBe(false);
      expect(mockShowMidgameAd).not.toHaveBeenCalled();
    });

    it('should return false when adblock detected', async () => {
      mockHasAdblock.mockResolvedValue(true);

      const { result } = renderHook(() => useCrazyGamesAds());

      await waitFor(() => {
        expect(result.current.hasAdblock).toBe(true);
      });

      let adResult: boolean | undefined;

      await act(async () => {
        adResult = await result.current.requestMidgameAd();
      });

      expect(adResult).toBe(false);
      expect(mockShowMidgameAd).not.toHaveBeenCalled();
    });

    it('should set isAdPlaying during ad playback', async () => {
      mockShowMidgameAd.mockImplementation((callbacks) => {
        callbacks?.adStarted?.();
        // Don't call finished yet
      });

      const { result } = renderHook(() => useCrazyGamesAds());

      await waitFor(() => {
        expect(mockHasAdblock).toHaveBeenCalled();
      });

      act(() => {
        result.current.requestMidgameAd();
      });

      await waitFor(() => {
        expect(result.current.isAdPlaying).toBe(true);
      });
    });

    it('should stop gameplay before showing ad', async () => {
      mockShowMidgameAd.mockImplementation((callbacks) => {
        callbacks?.adStarted?.();
        callbacks?.adFinished?.();
      });

      const { result } = renderHook(() => useCrazyGamesAds());

      await waitFor(() => {
        expect(mockHasAdblock).toHaveBeenCalled();
      });

      await act(async () => {
        await result.current.requestMidgameAd();
      });

      expect(mockGameplayStop).toHaveBeenCalledTimes(1);
    });

    it('should mute audio when ad starts', async () => {
      mockShowMidgameAd.mockImplementation((callbacks) => {
        callbacks?.adStarted?.();
        callbacks?.adFinished?.();
      });

      const { result } = renderHook(() => useCrazyGamesAds());

      await waitFor(() => {
        expect(mockHasAdblock).toHaveBeenCalled();
      });

      await act(async () => {
        await result.current.requestMidgameAd();
      });

      expect(Howler.mute).toHaveBeenCalledWith(true);
    });

    it('should unmute audio when ad finishes', async () => {
      mockShowMidgameAd.mockImplementation((callbacks) => {
        callbacks?.adStarted?.();
        callbacks?.adFinished?.();
      });

      const { result } = renderHook(() => useCrazyGamesAds());

      await waitFor(() => {
        expect(mockHasAdblock).toHaveBeenCalled();
      });

      await act(async () => {
        await result.current.requestMidgameAd();
      });

      expect(Howler.mute).toHaveBeenCalledWith(false);
    });

    it('should resume gameplay when ad finishes', async () => {
      mockShowMidgameAd.mockImplementation((callbacks) => {
        callbacks?.adStarted?.();
        callbacks?.adFinished?.();
      });

      const { result } = renderHook(() => useCrazyGamesAds());

      await waitFor(() => {
        expect(mockHasAdblock).toHaveBeenCalled();
      });

      await act(async () => {
        await result.current.requestMidgameAd();
      });

      expect(mockGameplayStart).toHaveBeenCalledTimes(1);
    });

    it('should return true when ad completes successfully', async () => {
      mockShowMidgameAd.mockImplementation((callbacks) => {
        callbacks?.adStarted?.();
        callbacks?.adFinished?.();
      });

      const { result } = renderHook(() => useCrazyGamesAds());

      await waitFor(() => {
        expect(mockHasAdblock).toHaveBeenCalled();
      });

      let adResult: boolean | undefined;

      await act(async () => {
        adResult = await result.current.requestMidgameAd();
      });

      expect(adResult).toBe(true);
      expect(result.current.isAdPlaying).toBe(false);
    });

    it('should handle ad error gracefully', async () => {
      mockShowMidgameAd.mockImplementation((callbacks) => {
        callbacks?.adError?.('error', { reason: 'adblocker' });
      });

      const { result } = renderHook(() => useCrazyGamesAds());

      await waitFor(() => {
        expect(mockHasAdblock).toHaveBeenCalled();
      });

      let adResult: boolean | undefined;

      await act(async () => {
        adResult = await result.current.requestMidgameAd();
      });

      expect(adResult).toBe(false);
      expect(Howler.mute).toHaveBeenCalledWith(false);
      expect(mockGameplayStart).toHaveBeenCalledTimes(1);
      expect(result.current.isAdPlaying).toBe(false);
    });

    it('should reset isAdPlaying after error', async () => {
      mockShowMidgameAd.mockImplementation((callbacks) => {
        callbacks?.adError?.('error', { reason: 'no-ad-available' });
      });

      const { result } = renderHook(() => useCrazyGamesAds());

      await waitFor(() => {
        expect(mockHasAdblock).toHaveBeenCalled();
      });

      await act(async () => {
        await result.current.requestMidgameAd();
      });

      expect(result.current.isAdPlaying).toBe(false);
    });
  });

  describe('requestRewardedAd', () => {
    it('should return false when SDK unavailable', async () => {
      (useCrazyGames as jest.Mock).mockReturnValue({
        isAvailable: false,
        showRewardedAd: mockShowRewardedAd,
        showMidgameAd: mockShowMidgameAd,
        hasAdblock: mockHasAdblock,
        gameplayStop: mockGameplayStop,
        gameplayStart: mockGameplayStart,
      });

      const { result } = renderHook(() => useCrazyGamesAds());
      let adResult: boolean | undefined;

      await act(async () => {
        adResult = await result.current.requestRewardedAd();
      });

      expect(adResult).toBe(false);
      expect(mockShowRewardedAd).not.toHaveBeenCalled();
    });

    it('should return false when adblock detected', async () => {
      mockHasAdblock.mockResolvedValue(true);

      const { result } = renderHook(() => useCrazyGamesAds());

      await waitFor(() => {
        expect(result.current.hasAdblock).toBe(true);
      });

      let adResult: boolean | undefined;

      await act(async () => {
        adResult = await result.current.requestRewardedAd();
      });

      expect(adResult).toBe(false);
      expect(mockShowRewardedAd).not.toHaveBeenCalled();
    });

    it('should stop gameplay before showing rewarded ad', async () => {
      mockShowRewardedAd.mockImplementation((callbacks) => {
        callbacks?.adStarted?.();
        callbacks?.adFinished?.();
      });

      const { result } = renderHook(() => useCrazyGamesAds());

      await waitFor(() => {
        expect(mockHasAdblock).toHaveBeenCalled();
      });

      await act(async () => {
        await result.current.requestRewardedAd();
      });

      expect(mockGameplayStop).toHaveBeenCalledTimes(1);
    });

    it('should mute audio during rewarded ad', async () => {
      mockShowRewardedAd.mockImplementation((callbacks) => {
        callbacks?.adStarted?.();
        callbacks?.adFinished?.();
      });

      const { result } = renderHook(() => useCrazyGamesAds());

      await waitFor(() => {
        expect(mockHasAdblock).toHaveBeenCalled();
      });

      await act(async () => {
        await result.current.requestRewardedAd();
      });

      expect(Howler.mute).toHaveBeenCalledWith(true);
      expect(Howler.mute).toHaveBeenCalledWith(false);
    });

    it('should return true when rewarded ad completes successfully', async () => {
      mockShowRewardedAd.mockImplementation((callbacks) => {
        callbacks?.adStarted?.();
        callbacks?.adFinished?.();
      });

      const { result } = renderHook(() => useCrazyGamesAds());

      await waitFor(() => {
        expect(mockHasAdblock).toHaveBeenCalled();
      });

      let adResult: boolean | undefined;

      await act(async () => {
        adResult = await result.current.requestRewardedAd();
      });

      expect(adResult).toBe(true);
      expect(result.current.isAdPlaying).toBe(false);
    });

    it('should handle rewarded ad error gracefully', async () => {
      mockShowRewardedAd.mockImplementation((callbacks) => {
        callbacks?.adError?.('error', { reason: 'no-ad-available' });
      });

      const { result } = renderHook(() => useCrazyGamesAds());

      await waitFor(() => {
        expect(mockHasAdblock).toHaveBeenCalled();
      });

      let adResult: boolean | undefined;

      await act(async () => {
        adResult = await result.current.requestRewardedAd();
      });

      expect(adResult).toBe(false);
      expect(Howler.mute).toHaveBeenCalledWith(false);
      expect(mockGameplayStart).toHaveBeenCalledTimes(1);
    });

    it('should resume gameplay after rewarded ad error', async () => {
      mockShowRewardedAd.mockImplementation((callbacks) => {
        callbacks?.adError?.('error');
      });

      const { result } = renderHook(() => useCrazyGamesAds());

      await waitFor(() => {
        expect(mockHasAdblock).toHaveBeenCalled();
      });

      await act(async () => {
        await result.current.requestRewardedAd();
      });

      expect(mockGameplayStart).toHaveBeenCalledTimes(1);
      expect(result.current.isAdPlaying).toBe(false);
    });
  });

  describe('state management', () => {
    it('should track isAdPlaying state across multiple ads', async () => {
      let midgameCallback: any;
      let rewardedCallback: any;

      mockShowMidgameAd.mockImplementation((callbacks) => {
        midgameCallback = callbacks;
      });

      mockShowRewardedAd.mockImplementation((callbacks) => {
        rewardedCallback = callbacks;
      });

      const { result } = renderHook(() => useCrazyGamesAds());

      await waitFor(() => {
        expect(mockHasAdblock).toHaveBeenCalled();
      });

      // Start midgame ad
      act(() => {
        result.current.requestMidgameAd();
      });

      await waitFor(() => {
        expect(result.current.isAdPlaying).toBe(true);
      });

      // Finish midgame ad
      act(() => {
        midgameCallback?.adFinished?.();
      });

      await waitFor(() => {
        expect(result.current.isAdPlaying).toBe(false);
      });

      // Start rewarded ad
      act(() => {
        result.current.requestRewardedAd();
      });

      await waitFor(() => {
        expect(result.current.isAdPlaying).toBe(true);
      });

      // Finish rewarded ad
      act(() => {
        rewardedCallback?.adFinished?.();
      });

      await waitFor(() => {
        expect(result.current.isAdPlaying).toBe(false);
      });
    });

    it('should handle multiple ad types correctly', async () => {
      mockShowMidgameAd.mockImplementation((callbacks) => {
        callbacks?.adStarted?.();
        callbacks?.adFinished?.();
      });

      mockShowRewardedAd.mockImplementation((callbacks) => {
        callbacks?.adStarted?.();
        callbacks?.adFinished?.();
      });

      const { result } = renderHook(() => useCrazyGamesAds());

      await waitFor(() => {
        expect(mockHasAdblock).toHaveBeenCalled();
      });

      // Request midgame ad
      let midgameResult: boolean | undefined;
      await act(async () => {
        midgameResult = await result.current.requestMidgameAd();
      });

      expect(midgameResult).toBe(true);
      expect(mockShowMidgameAd).toHaveBeenCalledTimes(1);

      // Request rewarded ad
      let rewardedResult: boolean | undefined;
      await act(async () => {
        rewardedResult = await result.current.requestRewardedAd();
      });

      expect(rewardedResult).toBe(true);
      expect(mockShowRewardedAd).toHaveBeenCalledTimes(1);

      // Both ads completed successfully
      expect(result.current.isAdPlaying).toBe(false);
    });
  });
});
