'use client';

import { useState, useEffect } from 'react';
import { useCrazyGames } from '@/components/CrazyGamesSDK';

interface UseCrazyGamesSettingsReturn {
  /** Whether audio should be muted (platform request) */
  shouldMuteAudio: boolean;
  /** Whether chat should be disabled (platform request) */
  shouldDisableChat: boolean;
  /** Whether settings are loaded */
  isReady: boolean;
}

/**
 * Hook for CrazyGames platform settings integration.
 *
 * Listens for platform-level settings from CrazyGames:
 * - muteAudio: Platform requests game to mute all audio
 * - disableChat: Platform requests game to disable chat features
 *
 * These settings can change at runtime (e.g., parent mutes audio),
 * so the hook listens for changes via addSettingsChangeListener.
 *
 * @example
 * ```tsx
 * const { shouldMuteAudio, shouldDisableChat } = useCrazyGamesSettings();
 *
 * useEffect(() => {
 *   if (shouldMuteAudio) Howler.mute(true);
 *   else Howler.mute(false);
 * }, [shouldMuteAudio]);
 * ```
 */
export function useCrazyGamesSettings(): UseCrazyGamesSettingsReturn {
  const {
    isAvailable,
    isLoading,
    getSettings,
    addSettingsChangeListener,
    removeSettingsChangeListener,
  } = useCrazyGames();

  const [shouldMuteAudio, setShouldMuteAudio] = useState(false);
  const [shouldDisableChat, setShouldDisableChat] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // Read initial settings
  useEffect(() => {
    if (isLoading || !isAvailable) {
      if (!isLoading) setIsReady(true);
      return;
    }

    const settings = getSettings();
    if (settings) {
      setShouldMuteAudio(!!settings.muteAudio);
      setShouldDisableChat(!!settings.disableChat);
    }
    setIsReady(true);
  }, [isAvailable, isLoading, getSettings]);

  // Listen for runtime setting changes
  useEffect(() => {
    if (!isAvailable) return;

    const handleSettingsChange = (key: string, value: unknown) => {
      if (key === 'muteAudio') {
        setShouldMuteAudio(!!value);
      } else if (key === 'disableChat') {
        setShouldDisableChat(!!value);
      }
    };

    addSettingsChangeListener(handleSettingsChange);
    return () => removeSettingsChangeListener(handleSettingsChange);
  }, [isAvailable, addSettingsChangeListener, removeSettingsChangeListener]);

  return {
    shouldMuteAudio,
    shouldDisableChat,
    isReady,
  };
}

export default useCrazyGamesSettings;
