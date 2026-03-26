import { vi, type Mock, } from 'vitest';
/**
 * CrazyGames Multiplayer Invite Tests
 *
 * Purpose: Verify multiplayer invite system integration:
 * - Detecting when player joins via invite link
 * - Showing/hiding invite button based on room state
 * - Handling instant multiplayer mode
 * - Creating invite links for sharing
 *
 * These tests ensure CrazyGames multiplayer features work correctly.
 */

import { renderHook, act, waitFor } from '@testing-library/react';

// Mock CrazyGames SDK BEFORE importing the hook
let mockIsInstantMultiplayer = false;
let mockGetInviteParam: Mock<string | null, [string]> = vi.fn<string | null, [string]>(() => null);
const mockInviteLink = vi.fn((params) => `https://crazygames.com/game/lexiclash?roomId=${params.roomId}`);
const mockShowInviteButton = vi.fn();
const mockHideInviteButton = vi.fn();

const mockAddJoinRoomListener = vi.fn();
const mockRemoveJoinRoomListener = vi.fn();

vi.mock('@/components/CrazyGamesSDK', () => ({
  useCrazyGames: () => ({
    isAvailable: true,
    isLoading: false,
    get isInstantMultiplayer() {
      return mockIsInstantMultiplayer;
    },
    getInviteParam: mockGetInviteParam,
    inviteLink: mockInviteLink,
    showInviteButton: mockShowInviteButton,
    hideInviteButton: mockHideInviteButton,
    addJoinRoomListener: mockAddJoinRoomListener,
    removeJoinRoomListener: mockRemoveJoinRoomListener,
  }),
}));

// NOW import the hook after mocking
import useCrazyGamesInvite from '@/hooks/useCrazyGamesInvite';

describe('CrazyGames Multiplayer Invites', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsInstantMultiplayer = false;
    mockGetInviteParam = vi.fn<string | null, [string]>(() => null);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Invite Join Detection', () => {
    it('should detect when player joins via invite link', async () => {
      const onInviteJoin = vi.fn();

      // Mock SDK to return roomId from URL
      mockGetInviteParam = vi.fn<string | null, [string]>((param) => (param === 'roomId' ? 'ABC123' : null));

      const { result } = renderHook(() =>
        useCrazyGamesInvite({ onInviteJoin })
      );

      // Wait for hook to initialize
      await waitFor(() => {
        expect(result.current.isReady).toBe(true);
      });

      // VERIFY: Callback called with roomId
      expect(onInviteJoin).toHaveBeenCalledWith('ABC123');

      // VERIFY: State updated
      expect(result.current.isInviteJoin).toBe(true);
      expect(result.current.inviteRoomId).toBe('ABC123');
    });

    it('should not trigger invite join when no invite params', async () => {
      const onInviteJoin = vi.fn();

      renderHook(() =>
        useCrazyGamesInvite({ onInviteJoin })
      );

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 100));

      // VERIFY: Callback NOT called
      expect(onInviteJoin).not.toHaveBeenCalled();
    });

    it('should handle instant multiplayer mode', async () => {
      const onInstantMultiplayer = vi.fn();

      // Mock SDK in instant multiplayer mode
      mockIsInstantMultiplayer = true;

      renderHook(() =>
        useCrazyGamesInvite({ onInstantMultiplayer })
      );

      // Wait for hook to initialize
      await new Promise(resolve => setTimeout(resolve, 100));

      // VERIFY: Callback called for instant multiplayer
      expect(onInstantMultiplayer).toHaveBeenCalledTimes(1);
    });
  });

  describe('Invite Link Creation', () => {
    it('should create invite link with roomId', () => {
      const { result } = renderHook(() =>
        useCrazyGamesInvite()
      );

      // Create invite link
      const link = result.current.createInviteLink('XYZ789');

      // VERIFY: SDK method called with correct params
      expect(mockInviteLink).toHaveBeenCalledWith({ roomId: 'XYZ789' });

      // VERIFY: Link returned
      expect(link).toBe('https://crazygames.com/game/lexiclash?roomId=XYZ789');
    });

    it('should create invite link with expected format', () => {
      const { result } = renderHook(() =>
        useCrazyGamesInvite()
      );

      // Create invite link
      const link = result.current.createInviteLink('XYZ789');

      // VERIFY: Link has expected format
      expect(link).toContain('roomId=XYZ789');
      expect(link).toContain('crazygames.com');
    });
  });

  describe('Invite Button Management', () => {
    it('should show invite button when room is created', () => {
      const { result } = renderHook(() =>
        useCrazyGamesInvite({ autoShowInviteButton: true })
      );

      // Show invite button
      act(() => {
        result.current.showInviteButton('ABC123');
      });

      // VERIFY: SDK method called
      expect(mockShowInviteButton).toHaveBeenCalledWith({ roomId: 'ABC123' });

      // VERIFY: State updated
      expect(result.current.isInviteButtonVisible).toBe(true);
    });

    it('should hide invite button manually', () => {
      const { result } = renderHook(() =>
        useCrazyGamesInvite()
      );

      // Show then hide
      act(() => {
        result.current.showInviteButton('ABC123');
      });

      // Clear mocks after show
      mockHideInviteButton.mockClear();

      act(() => {
        result.current.hideInviteButton();
      });

      // VERIFY: SDK method called (at least once)
      expect(mockHideInviteButton).toHaveBeenCalled();

      // VERIFY: State updated
      expect(result.current.isInviteButtonVisible).toBe(false);
    });

    it('should auto-hide invite button when room is full', () => {
      const { result, rerender } = renderHook(
        ({ currentPlayers }) =>
          useCrazyGamesInvite({
            maxPlayers: 4,
            currentPlayers,
            gameState: 'waiting',
          }),
        { initialProps: { currentPlayers: 2 } }
      );

      // Show invite button
      act(() => {
        result.current.showInviteButton('ABC123');
      });

      // Clear previous calls (including any auto-hide from effects)
      mockHideInviteButton.mockClear();

      // Fill room
      act(() => {
        rerender({ currentPlayers: 4 });
      });

      // VERIFY: Invite button auto-hidden (at least once)
      expect(mockHideInviteButton).toHaveBeenCalled();
      expect(result.current.isInviteButtonVisible).toBe(false);
    });

    it('should auto-hide invite button when game starts', () => {
      const { result, rerender } = renderHook(
        ({ gameState }: { gameState: 'waiting' | 'playing' | 'ended' }) =>
          useCrazyGamesInvite({
            maxPlayers: 4,
            currentPlayers: 2,
            gameState,
          }),
        { initialProps: { gameState: 'waiting' as 'waiting' | 'playing' | 'ended' } }
      );

      // Show invite button
      act(() => {
        result.current.showInviteButton('ABC123');
      });

      // Clear previous calls (including any auto-hide from effects)
      mockHideInviteButton.mockClear();

      // Start game
      act(() => {
        rerender({ gameState: 'playing' });
      });

      // VERIFY: Invite button auto-hidden (at least once)
      expect(mockHideInviteButton).toHaveBeenCalled();
    });

    it('should not auto-hide invite button if not visible', () => {
      const { rerender } = renderHook(
        ({ currentPlayers }) =>
          useCrazyGamesInvite({
            maxPlayers: 4,
            currentPlayers,
            gameState: 'waiting',
          }),
        { initialProps: { currentPlayers: 2 } }
      );

      // Don't show invite button

      // Fill room
      rerender({ currentPlayers: 4 });

      // VERIFY: hideInviteButton NOT called (button wasn't visible)
      expect(mockHideInviteButton).not.toHaveBeenCalled();
    });

    it('should hide invite button on unmount', () => {
      const { result, unmount } = renderHook(() =>
        useCrazyGamesInvite()
      );

      // Show invite button
      act(() => {
        result.current.showInviteButton('ABC123');
      });

      // Clear previous calls
      mockHideInviteButton.mockClear();

      // Unmount
      unmount();

      // VERIFY: Invite button hidden on cleanup
      expect(mockHideInviteButton).toHaveBeenCalledTimes(1);
    });
  });

  describe('Optional Parameters', () => {
    it('should work without maxPlayers and currentPlayers', () => {
      const { result } = renderHook(() =>
        useCrazyGamesInvite({ gameState: 'waiting' })
      );

      // Show invite button
      act(() => {
        result.current.showInviteButton('ABC123');
      });

      // VERIFY: Button shown successfully
      expect(result.current.isInviteButtonVisible).toBe(true);
    });

    it('should work without gameState', () => {
      const { result } = renderHook(() =>
        useCrazyGamesInvite({
          maxPlayers: 4,
          currentPlayers: 2,
        })
      );

      // Show invite button
      act(() => {
        result.current.showInviteButton('ABC123');
      });

      // VERIFY: Button shown successfully
      expect(result.current.isInviteButtonVisible).toBe(true);
    });

    it('should work with no options at all', () => {
      const { result } = renderHook(() =>
        useCrazyGamesInvite()
      );

      // VERIFY: Hook initializes successfully
      expect(result.current.isReady).toBeDefined();
      expect(typeof result.current.showInviteButton).toBe('function');
    });
  });

  describe('Return Values', () => {
    it('should return correct initial state', () => {
      const { result } = renderHook(() =>
        useCrazyGamesInvite()
      );

      // VERIFY: Initial state
      expect(result.current.isInviteJoin).toBe(false);
      expect(result.current.inviteRoomId).toBeNull();
      expect(result.current.isInstantMultiplayer).toBe(false);
      expect(result.current.isInviteButtonVisible).toBe(false);
    });

    it('should expose all required functions', () => {
      const { result } = renderHook(() =>
        useCrazyGamesInvite()
      );

      // VERIFY: All functions exist
      expect(typeof result.current.createInviteLink).toBe('function');
      expect(typeof result.current.showInviteButton).toBe('function');
      expect(typeof result.current.hideInviteButton).toBe('function');
    });
  });

  describe('Edge Cases', () => {
    it('should handle multiple getInviteParam calls', () => {
      const onInviteJoin = vi.fn();

      // Mock getInviteParam to be called multiple times
      mockGetInviteParam = vi.fn<string | null, [string]>((param) => {
        if (param === 'roomId') return 'ABC123';
        if (param === 'otherParam') return 'value';
        return null;
      });

      renderHook(() =>
        useCrazyGamesInvite({ onInviteJoin })
      );

      // VERIFY: getInviteParam called for roomId
      expect(mockGetInviteParam).toHaveBeenCalledWith('roomId');
    });

    it('should handle room state changes without invite button shown', () => {
      const { rerender } = renderHook(
        ({ currentPlayers }) =>
          useCrazyGamesInvite({
            maxPlayers: 4,
            currentPlayers,
          }),
        { initialProps: { currentPlayers: 2 } }
      );

      // Change room state without showing button
      rerender({ currentPlayers: 3 });
      rerender({ currentPlayers: 4 });

      // VERIFY: No errors, no SDK calls
      expect(mockHideInviteButton).not.toHaveBeenCalled();
    });

    it('should only trigger onInviteJoin once on mount', async () => {
      const onInviteJoin = vi.fn();

      mockGetInviteParam = vi.fn<string | null, [string]>(() => 'ABC123');

      const { rerender } = renderHook(() =>
        useCrazyGamesInvite({ onInviteJoin })
      );

      // Wait for init
      await new Promise(resolve => setTimeout(resolve, 100));

      // Re-render
      rerender();

      // VERIFY: Callback only called once
      expect(onInviteJoin).toHaveBeenCalledTimes(1);
    });
  });
});
