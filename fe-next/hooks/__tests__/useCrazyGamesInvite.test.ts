import { vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useCrazyGamesInvite } from '../useCrazyGamesInvite';
import { useCrazyGames } from '@/components/CrazyGamesSDK';

// Mock the CrazyGames SDK hook
vi.mock('@/components/CrazyGamesSDK', () => ({
  useCrazyGames: vi.fn(),
}));

const mockUseCrazyGames = useCrazyGames as any;

describe('useCrazyGamesInvite - Room Lifecycle Auto-Hide', () => {
  const mockSdkShowInvite = vi.fn();
  const mockSdkHideInvite = vi.fn();
  const mockGetInviteParam = vi.fn();
  const mockInviteLink = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Default SDK mock (available and ready)
    mockUseCrazyGames.mockReturnValue({
      isAvailable: true,
      isOnCrazyGamesPlatform: false,
      environment: null,
      isLoading: false,
      deviceType: 'desktop',
      isLandscape: true,
      viewportSize: { width: 1024, height: 768 },
      isInstantMultiplayer: false,
      getInviteParam: mockGetInviteParam,
      inviteLink: mockInviteLink,
      showInviteButton: mockSdkShowInvite,
      hideInviteButton: mockSdkHideInvite,
      happyTime: vi.fn(),
      gameplayStart: vi.fn(),
      gameplayStop: vi.fn(),
      loadingStart: vi.fn(),
      loadingStop: vi.fn(),
      showMidgameAd: vi.fn(),
      showRewardedAd: vi.fn(),
      hasAdblock: vi.fn(),
      requestBanner: vi.fn(),
      requestResponsiveBanner: vi.fn(),
      clearBanner: vi.fn(),
      clearAllBanners: vi.fn(),
      saveData: vi.fn(),
      loadData: vi.fn(),
      removeData: vi.fn(),
      getUser: vi.fn(),
      showAuthPrompt: vi.fn(),
      isUserAccountAvailable: vi.fn(),
      getSystemInfo: vi.fn(),
      getInviteParams: vi.fn(),
      addJoinRoomListener: vi.fn(),
      removeJoinRoomListener: vi.fn(),
      getSettings: vi.fn(),
      addSettingsChangeListener: vi.fn(),
      removeSettingsChangeListener: vi.fn(),
      addAuthListener: vi.fn(),
      removeAuthListener: vi.fn(),
      getUserToken: vi.fn(),
      listFriends: vi.fn(),
      showAccountLinkPrompt: vi.fn(),
    });
  });

  describe('auto-hide when room is full', () => {
    it('should hide invite button when currentPlayers reaches maxPlayers', async () => {
      const { result, rerender } = renderHook(
        ({ maxPlayers, currentPlayers, gameState }) =>
          useCrazyGamesInvite({ maxPlayers, currentPlayers, gameState }),
        {
          initialProps: {
            maxPlayers: 4,
            currentPlayers: 2,
            gameState: 'waiting' as const,
          },
        }
      );

      // Show invite button
      act(() => {
        result.current.showInviteButton('ROOM123');
      });

      expect(mockSdkShowInvite).toHaveBeenCalledWith({ roomId: 'ROOM123' });
      expect(result.current.isInviteButtonVisible).toBe(true);

      // Room fills up
      rerender({
        maxPlayers: 4,
        currentPlayers: 4,
        gameState: 'waiting' as const,
      });

      // Should auto-hide
      await waitFor(() => {
        expect(mockSdkHideInvite).toHaveBeenCalled();
      });
      expect(result.current.isInviteButtonVisible).toBe(false);
    });

    it('should hide invite button when currentPlayers exceeds maxPlayers', async () => {
      const { result, rerender } = renderHook(
        ({ maxPlayers, currentPlayers, gameState }) =>
          useCrazyGamesInvite({ maxPlayers, currentPlayers, gameState }),
        {
          initialProps: {
            maxPlayers: 4,
            currentPlayers: 3,
            gameState: 'waiting' as const,
          },
        }
      );

      act(() => {
        result.current.showInviteButton('ROOM123');
      });

      expect(result.current.isInviteButtonVisible).toBe(true);

      // Room overfills (edge case)
      rerender({
        maxPlayers: 4,
        currentPlayers: 5,
        gameState: 'waiting' as const,
      });

      await waitFor(() => {
        expect(mockSdkHideInvite).toHaveBeenCalled();
      });
      expect(result.current.isInviteButtonVisible).toBe(false);
    });

    it('should NOT hide if maxPlayers is undefined', async () => {
      const { result, rerender } = renderHook(
        ({ maxPlayers, currentPlayers, gameState }) =>
          useCrazyGamesInvite({ maxPlayers, currentPlayers, gameState }),
        {
          initialProps: {
            maxPlayers: undefined,
            currentPlayers: 100,
            gameState: 'waiting' as const,
          },
        }
      );

      act(() => {
        result.current.showInviteButton('ROOM123');
      });

      expect(result.current.isInviteButtonVisible).toBe(true);

      // Even with lots of players, don't hide if no max specified
      rerender({
        maxPlayers: undefined,
        currentPlayers: 200,
        gameState: 'waiting' as const,
      });

      // Should NOT hide
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(mockSdkHideInvite).not.toHaveBeenCalled();
      expect(result.current.isInviteButtonVisible).toBe(true);
    });
  });

  describe('auto-hide when game state changes', () => {
    it('should hide invite button when game state changes from waiting to playing', async () => {
      const { result, rerender } = renderHook(
        ({ gameState }: { gameState: 'waiting' | 'playing' | 'ended' }) => useCrazyGamesInvite({ gameState }),
        {
          initialProps: {
            gameState: 'waiting' as 'waiting' | 'playing' | 'ended',
          },
        }
      );

      act(() => {
        result.current.showInviteButton('ROOM123');
      });

      expect(result.current.isInviteButtonVisible).toBe(true);

      // Game starts
      rerender({ gameState: 'playing' });

      await waitFor(() => {
        expect(mockSdkHideInvite).toHaveBeenCalled();
      });
      expect(result.current.isInviteButtonVisible).toBe(false);
    });

    it('should hide invite button when game state changes to ended', async () => {
      const { result, rerender } = renderHook(
        ({ gameState }: { gameState: 'waiting' | 'playing' | 'ended' }) => useCrazyGamesInvite({ gameState }),
        {
          initialProps: {
            gameState: 'waiting' as 'waiting' | 'playing' | 'ended',
          },
        }
      );

      act(() => {
        result.current.showInviteButton('ROOM123');
      });

      expect(result.current.isInviteButtonVisible).toBe(true);

      // Game ends
      rerender({ gameState: 'ended' });

      await waitFor(() => {
        expect(mockSdkHideInvite).toHaveBeenCalled();
      });
      expect(result.current.isInviteButtonVisible).toBe(false);
    });

    it('should NOT hide if gameState is undefined', async () => {
      const { result, rerender } = renderHook(
        ({ gameState }) => useCrazyGamesInvite({ gameState }),
        {
          initialProps: {
            gameState: undefined,
          },
        }
      );

      act(() => {
        result.current.showInviteButton('ROOM123');
      });

      expect(result.current.isInviteButtonVisible).toBe(true);

      // Game state undefined (no tracking)
      rerender({ gameState: undefined });

      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(mockSdkHideInvite).not.toHaveBeenCalled();
      expect(result.current.isInviteButtonVisible).toBe(true);
    });
  });

  describe('combined auto-hide conditions', () => {
    it('should hide on EITHER room full OR game state change', async () => {
      const { result, rerender } = renderHook(
        ({ maxPlayers, currentPlayers, gameState }: { maxPlayers: number; currentPlayers: number; gameState: 'waiting' | 'playing' | 'ended' }) =>
          useCrazyGamesInvite({ maxPlayers, currentPlayers, gameState }),
        {
          initialProps: {
            maxPlayers: 4,
            currentPlayers: 2,
            gameState: 'waiting' as 'waiting' | 'playing' | 'ended',
          },
        }
      );

      act(() => {
        result.current.showInviteButton('ROOM123');
      });

      expect(result.current.isInviteButtonVisible).toBe(true);

      // Just change game state (not full yet)
      rerender({
        maxPlayers: 4,
        currentPlayers: 2,
        gameState: 'playing',
      });

      await waitFor(() => {
        expect(mockSdkHideInvite).toHaveBeenCalled();
      });
      expect(result.current.isInviteButtonVisible).toBe(false);
    });
  });

  describe('does not hide if already hidden', () => {
    it('should not trigger auto-hide effect if already hidden', async () => {
      const { result, rerender } = renderHook(
        ({ gameState }: { gameState: 'waiting' | 'playing' | 'ended' }) => useCrazyGamesInvite({ gameState }),
        {
          initialProps: {
            gameState: 'waiting' as 'waiting' | 'playing' | 'ended',
          },
        }
      );

      act(() => {
        result.current.showInviteButton('ROOM123');
      });

      expect(result.current.isInviteButtonVisible).toBe(true);
      vi.clearAllMocks();

      // Game starts - should hide
      rerender({ gameState: 'playing' });

      await waitFor(() => {
        expect(result.current.isInviteButtonVisible).toBe(false);
      });

      const firstHideCallCount = mockSdkHideInvite.mock.calls.length;
      expect(firstHideCallCount).toBeGreaterThanOrEqual(1);

      vi.clearAllMocks();

      // Game ends - should NOT trigger hide again (already hidden)
      rerender({ gameState: 'ended' });

      await new Promise((resolve) => setTimeout(resolve, 100));
      // No additional SDK calls because button is already hidden
      expect(mockSdkHideInvite).not.toHaveBeenCalled();
    });
  });

  describe('existing functionality unchanged', () => {
    it('should still detect invite joins', () => {
      mockGetInviteParam.mockReturnValue('INVITE123');

      const onInviteJoin = vi.fn();
      renderHook(() => useCrazyGamesInvite({ onInviteJoin }));

      expect(onInviteJoin).toHaveBeenCalledWith('INVITE123');
    });

    it('should still detect instant multiplayer', async () => {
      // Ensure getInviteParam returns no roomId
      mockGetInviteParam.mockReturnValue(null);

      mockUseCrazyGames.mockReturnValue({
        isAvailable: true,
        isOnCrazyGamesPlatform: false,
        environment: null,
        isLoading: false,
        deviceType: 'desktop',
        isLandscape: true,
        viewportSize: { width: 1024, height: 768 },
        isInstantMultiplayer: true,
        getInviteParam: mockGetInviteParam,
        inviteLink: mockInviteLink,
        showInviteButton: mockSdkShowInvite,
        hideInviteButton: mockSdkHideInvite,
        happyTime: vi.fn(),
        gameplayStart: vi.fn(),
        gameplayStop: vi.fn(),
        loadingStart: vi.fn(),
        loadingStop: vi.fn(),
        showMidgameAd: vi.fn(),
        showRewardedAd: vi.fn(),
        hasAdblock: vi.fn(),
        requestBanner: vi.fn(),
        requestResponsiveBanner: vi.fn(),
        clearBanner: vi.fn(),
        clearAllBanners: vi.fn(),
        saveData: vi.fn(),
        loadData: vi.fn(),
        removeData: vi.fn(),
        getUser: vi.fn(),
        showAuthPrompt: vi.fn(),
        isUserAccountAvailable: vi.fn(),
        getSystemInfo: vi.fn(),
        getInviteParams: vi.fn(),
        addJoinRoomListener: vi.fn(),
        removeJoinRoomListener: vi.fn(),
        getSettings: vi.fn(),
        addSettingsChangeListener: vi.fn(),
        removeSettingsChangeListener: vi.fn(),
        addAuthListener: vi.fn(),
        removeAuthListener: vi.fn(),
        getUserToken: vi.fn(),
        listFriends: vi.fn(),
        showAccountLinkPrompt: vi.fn(),
      });

      const onInstantMultiplayer = vi.fn();
      renderHook(() => useCrazyGamesInvite({ onInstantMultiplayer }));

      await waitFor(() => {
        expect(onInstantMultiplayer).toHaveBeenCalled();
      });
    });

    it('should still cleanup on unmount', () => {
      const { result, unmount } = renderHook(() => useCrazyGamesInvite());

      act(() => {
        result.current.showInviteButton('ROOM123');
      });

      unmount();

      expect(mockSdkHideInvite).toHaveBeenCalled();
    });
  });
});
