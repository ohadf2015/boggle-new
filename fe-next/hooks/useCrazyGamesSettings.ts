'use client';

import { useEffect, useState } from 'react';
import { Howler } from 'howler';

/**
 * Hook for syncing platform-level settings from CrazyGames SDK.
 *
 * Handles:
 * - Audio mute synchronization with Howler
 * - Chat disable flag for UI
 * - Settings change listener
 *
 * @example
 * ```tsx
 * const { muteAudio, disableChat } = useCrazyGamesSettings();
 *
 * // UI respects platform settings
 * if (disableChat) {
 *   // Hide chat UI
 * }
 *
 * // Audio automatically syncs with Howler
 * // No manual mute/unmute needed
 * ```
 */
export function useCrazyGamesSettings() {
  const [muteAudio, setMuteAudio] = useState(false);
  const [disableChat, setDisableChat] = useState(false);

  useEffect(() => {
    const setupSettings = async () => {
      // Check if SDK is available
      if (typeof window === 'undefined' || !window.CrazyGames?.SDK) {
        return;
      }

      const sdk = window.CrazyGames.SDK;

      // Read initial settings
      const settings = sdk.game.settings;
      if (settings.muteAudio) {
        setMuteAudio(true);
        Howler.mute(true);
      }
      if (settings.disableChat) {
        setDisableChat(true);
      }

      // Listen for settings changes
      sdk.game.onSettingsChange((newSettings) => {
        if (newSettings.muteAudio !== undefined) {
          setMuteAudio(newSettings.muteAudio);
          Howler.mute(newSettings.muteAudio);
        }
        if (newSettings.disableChat !== undefined) {
          setDisableChat(newSettings.disableChat);
        }
      });
    };

    setupSettings();
  }, []);

  return { muteAudio, disableChat };
}

/**
 * Trigger a happytime event to CrazyGames SDK.
 * Call this on major player achievements:
 * - Boss defeats
 * - High scores
 * - Level 10+ completion
 * - First boss battle victory
 *
 * @example
 * ```tsx
 * // On boss defeat
 * if (bossPhase === 'victory') {
 *   await triggerHappytime();
 * }
 * ```
 */
export async function triggerHappytime() {
  if (typeof window === 'undefined' || !window.CrazyGames?.SDK) {
    return;
  }

  try {
    window.CrazyGames.SDK.game.happytime();
  } catch (error) {
    // Silently fail if SDK not available
  }
}

export default useCrazyGamesSettings;
