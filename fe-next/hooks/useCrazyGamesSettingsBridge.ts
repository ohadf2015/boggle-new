'use client';

import { useEffect, useRef } from 'react';
import { Howler } from 'howler';
import { useCrazyGamesSettings } from '@/hooks/useCrazyGamesSettings';
import { useCrazyGames } from '@/components/CrazyGamesSDK';
import { useLanguage } from '@/contexts/LanguageContext';
import { locales } from '@/lib/i18n';
import type { Language } from '@/shared/types/game';

// Map CrazyGames country codes to our supported locales
const COUNTRY_TO_LOCALE: Record<string, Language> = {
  IL: 'he',
  SE: 'sv',
  JP: 'ja',
  ES: 'es', MX: 'es', AR: 'es', CO: 'es', CL: 'es', PE: 'es',
};

/**
 * Bridge component hook that syncs CrazyGames platform settings to game audio/chat.
 *
 * Wires:
 * - muteAudio → Howler.mute() (global mute for all Howl instances)
 * - disableChat → exposed via useCrazyGamesChatDisabled()
 * - CG countryCode → auto-set language if user has no explicit preference
 *
 * Must be called inside CrazyGamesProvider.
 */
export function useCrazyGamesSettingsBridge() {
  const { shouldMuteAudio, shouldDisableChat, isReady } = useCrazyGamesSettings();
  const { isOnCrazyGamesPlatform, getSystemInfo } = useCrazyGames();
  const { setLanguage } = useLanguage();
  const hasAutoDetectedRef = useRef(false);

  // Sync muteAudio to Howler global mute
  useEffect(() => {
    if (!isReady) return;
    try { Howler.mute(shouldMuteAudio); } catch { /* Howler not initialized */ }
  }, [shouldMuteAudio, isReady]);

  // Auto-detect language from CG system info (only if no saved preference)
  useEffect(() => {
    if (!isOnCrazyGamesPlatform || hasAutoDetectedRef.current) return;
    hasAutoDetectedRef.current = true;

    // Skip if user already has an explicit language preference
    const savedLang = typeof window !== 'undefined' ? localStorage.getItem('boggle_language') : null;
    if (savedLang && locales.includes(savedLang as Language)) return;

    const detectLocale = async () => {
      try {
        const info = await getSystemInfo();
        if (!info?.countryCode) return;
        const mapped = COUNTRY_TO_LOCALE[info.countryCode.toUpperCase()];
        if (mapped) {
          setLanguage(mapped);
        }
      } catch { /* silent */ }
    };
    detectLocale();
  }, [isOnCrazyGamesPlatform, getSystemInfo, setLanguage]);

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
