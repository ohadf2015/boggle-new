'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useCrazyGames, type InviteLinkParams } from '@/components/CrazyGamesSDK';

interface UseCrazyGamesInviteOptions {
  /** Callback when a player joins via invite link */
  onInviteJoin?: (roomId: string) => void;
  /** Callback for instant multiplayer mode (should create room) */
  onInstantMultiplayer?: () => void;
  /** Auto-show invite button when room is created */
  autoShowInviteButton?: boolean;
  /** Maximum players for this room */
  maxPlayers?: number;
  /** Current player count */
  currentPlayers?: number;
  /** Game state (waiting, playing, ended) */
  gameState?: 'waiting' | 'playing' | 'ended';
}

interface UseCrazyGamesInviteReturn {
  /** Whether SDK is available and initialized */
  isReady: boolean;
  /** Whether player arrived via invite link */
  isInviteJoin: boolean;
  /** The room ID from invite params (if any) */
  inviteRoomId: string | null;
  /** Whether this is an instant multiplayer session */
  isInstantMultiplayer: boolean;
  /** Generate an invite link for the current room */
  createInviteLink: (roomId: string) => string | null;
  /** Show the CrazyGames invite button in footer */
  showInviteButton: (roomId: string) => void;
  /** Hide the CrazyGames invite button */
  hideInviteButton: () => void;
  /** Whether invite button is currently visible */
  isInviteButtonVisible: boolean;
}

/**
 * Hook for CrazyGames multiplayer invite link integration.
 *
 * Handles:
 * - Detecting when player joins via invite link
 * - Creating invite links for sharing
 * - Managing the CrazyGames invite button
 * - Handling instant multiplayer mode
 *
 * @example
 * ```tsx
 * const {
 *   isInviteJoin,
 *   inviteRoomId,
 *   createInviteLink,
 *   showInviteButton
 * } = useCrazyGamesInvite({
 *   onInviteJoin: (roomId) => {
 *     // Auto-navigate to join flow with roomId
 *     router.push(`/multiplayer?join=${roomId}`);
 *   },
 *   onInstantMultiplayer: () => {
 *     // Create new room and show join dialog
 *     createNewRoom();
 *   }
 * });
 * ```
 */
export function useCrazyGamesInvite(options: UseCrazyGamesInviteOptions = {}): UseCrazyGamesInviteReturn {
  const {
    onInviteJoin,
    onInstantMultiplayer,
    autoShowInviteButton = true,
    maxPlayers,
    currentPlayers,
    gameState,
  } = options;

  const {
    isAvailable,
    isLoading,
    isInstantMultiplayer,
    getInviteParam,
    inviteLink,
    showInviteButton: sdkShowInvite,
    hideInviteButton: sdkHideInvite,
    addJoinRoomListener,
    removeJoinRoomListener,
  } = useCrazyGames();

  const [inviteRoomId, setInviteRoomId] = useState<string | null>(null);
  const [isInviteJoin, setIsInviteJoin] = useState(false);
  const [isInviteButtonVisible, setIsInviteButtonVisible] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // Track if we've handled the initial invite/instant multiplayer
  const hasHandledInitRef = useRef(false);

  // Check for invite params on mount
  useEffect(() => {
    if (isLoading || hasHandledInitRef.current) return;

    const checkInviteParams = () => {
      if (!isAvailable) {
        setIsReady(true);
        return;
      }

      // Skip invite auto-join if the player just intentionally exited a room
      try {
        if (sessionStorage.getItem('boggle_intentional_exit')) {
          sessionStorage.removeItem('boggle_intentional_exit');
          setIsReady(true);
          return;
        }
      } catch { /* storage blocked */ }

      // Check for roomId in invite params
      const roomId = getInviteParam('roomId');
      if (roomId) {
        setInviteRoomId(roomId);
        setIsInviteJoin(true);
        hasHandledInitRef.current = true;
        onInviteJoin?.(roomId);
      }
      // Handle instant multiplayer mode (player clicked "Play with Friends")
      else if (isInstantMultiplayer) {
        hasHandledInitRef.current = true;
        onInstantMultiplayer?.();
      }

      setIsReady(true);
    };

    checkInviteParams();
  }, [isAvailable, isLoading, isInstantMultiplayer, getInviteParam, onInviteJoin, onInstantMultiplayer]);

  // Create invite link for sharing
  const createInviteLink = useCallback((roomId: string): string | null => {
    if (!isAvailable) return null;

    const params: InviteLinkParams = { roomId };
    return inviteLink(params);
  }, [isAvailable, inviteLink]);

  // Show invite button in CrazyGames footer
  const showInviteButton = useCallback((roomId: string) => {
    if (!isAvailable) return;

    const params: InviteLinkParams = { roomId };
    sdkShowInvite(params);
    setIsInviteButtonVisible(true);
  }, [isAvailable, sdkShowInvite]);

  // Hide invite button
  const hideInviteButton = useCallback(() => {
    if (!isAvailable) return;

    sdkHideInvite();
    setIsInviteButtonVisible(false);
  }, [isAvailable, sdkHideInvite]);

  // Auto-hide invite button based on room state
  useEffect(() => {
    if (!isInviteButtonVisible) return;

    // Hide if room is full
    if (maxPlayers !== undefined && currentPlayers !== undefined && currentPlayers >= maxPlayers) {
      hideInviteButton();
      return;
    }

    // Hide if game is no longer waiting
    if (gameState !== undefined && gameState !== 'waiting') {
      hideInviteButton();
    }
  }, [maxPlayers, currentPlayers, gameState, isInviteButtonVisible, hideInviteButton]);

  // Listen for mid-session joins (someone clicks invite link while game is running)
  useEffect(() => {
    if (!isAvailable) return;

    const handleJoinRoom = (params: Record<string, string>) => {
      const roomId = params.roomId;
      if (roomId) {
        setInviteRoomId(roomId);
        setIsInviteJoin(true);
        onInviteJoin?.(roomId);
      }
    };

    addJoinRoomListener(handleJoinRoom);
    return () => removeJoinRoomListener(handleJoinRoom);
  }, [isAvailable, addJoinRoomListener, removeJoinRoomListener, onInviteJoin]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isInviteButtonVisible) {
        sdkHideInvite();
      }
    };
  }, [isInviteButtonVisible, sdkHideInvite]);

  return {
    isReady,
    isInviteJoin,
    inviteRoomId,
    isInstantMultiplayer,
    createInviteLink,
    showInviteButton,
    hideInviteButton,
    isInviteButtonVisible,
  };
}

export default useCrazyGamesInvite;
