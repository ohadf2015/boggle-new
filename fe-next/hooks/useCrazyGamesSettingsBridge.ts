'use client';

import { useEffect } from 'react';
import { Howler } from 'howler';
import { useCrazyGamesSettings } from '@/hooks/useCrazyGamesSettings';

/**
 * Bridge component hook that syncs CrazyGames platform settings to game audio/chat.
 *
 * Wires:
 * - muteAudio → Howler.mute() (global mute for all Howl instances)
 * - disableChat → exposed via useCrazyGamesChatDisabled()
 *
 * Must be called inside CrazyGamesProvider.
 */
export function useCrazyGamesSettingsBridge() {
  const { shouldMuteAudio, shouldDisableChat, isReady } = useCrazyGamesSettings();

  // Sync muteAudio to Howler global mute
  useEffect(() => {
    if (!isReady) return;
    Howler.mute(shouldMuteAudio);
  }, [shouldMuteAudio, isReady]);

  return { shouldDisableChat };
}

/**
 * Hook to check if CrazyGames platform has disabled chat.
 * Safe to call outside CrazyGamesProvider (returns false).
 */
export function useCrazyGamesChatDisabled(): boolean {
  const { shouldDisableChat } = useCrazyGamesSettings();
  return shouldDisableChat;
}
