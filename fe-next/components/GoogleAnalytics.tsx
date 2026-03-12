'use client';

import { useState, useEffect } from 'react';
import { GoogleAnalytics as NextGoogleAnalytics } from '@next/third-parties/google';
import { hasConsent, onConsentChange } from '@/utils/cookieConsent';

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID;

/**
 * Google Analytics 4 component — consent-gated.
 *
 * Only loads when user has granted analytics consent.
 * Google Consent Mode v2 handles the analytics_storage signal,
 * but we also gate script loading entirely for belt-and-suspenders compliance.
 */
export function GoogleAnalytics() {
  const [allowed, setAllowed] = useState(() => hasConsent('analytics'));

  useEffect(() => {
    return onConsentChange((state) => {
      setAllowed(state.analytics);
    });
  }, []);

  if (!GA_MEASUREMENT_ID) return null;
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') return null;
  if (!allowed) return null;

  return <NextGoogleAnalytics gaId={GA_MEASUREMENT_ID} />;
}

/**
 * Track custom events in GA4 — respects consent.
 * Events are silently dropped when analytics consent is denied.
 */
export function trackEvent(
  eventName: string,
  eventParams?: Record<string, string | number | boolean>
): void {
  if (
    typeof window !== 'undefined' &&
    'gtag' in window &&
    GA_MEASUREMENT_ID &&
    window.location.hostname !== 'localhost' &&
    hasConsent('analytics')
  ) {
    (window as typeof window & { gtag: (...args: unknown[]) => void }).gtag('event', eventName, eventParams);
  }
}

/** Track page views manually (useful for SPA navigation) */
export function trackPageView(url: string, title?: string): void {
  if (
    typeof window !== 'undefined' &&
    'gtag' in window &&
    GA_MEASUREMENT_ID &&
    window.location.hostname !== 'localhost' &&
    hasConsent('analytics')
  ) {
    (window as typeof window & { gtag: (...args: unknown[]) => void }).gtag('config', GA_MEASUREMENT_ID, {
      page_path: url,
      page_title: title,
    });
  }
}

// Common game events helper functions
export const gameEvents = {
  gameStart: (mode: 'solo' | 'multiplayer', roomId?: string) => {
    trackEvent('game_start', { game_mode: mode, room_id: roomId || 'solo' });
  },
  gameEnd: (finalScore: number, wordsFound: number, duration: number) => {
    trackEvent('game_end', { final_score: finalScore, words_found: wordsFound, duration_seconds: Math.round(duration / 1000) });
  },
  wordSubmit: (word: string, score: number, isValid: boolean, comboLevel?: number) => {
    trackEvent('word_submit', { word_length: word.length, score, is_valid: isValid, combo_level: comboLevel || 0 });
  },
  roomCreate: (roomId: string, language: string) => {
    trackEvent('room_create', { room_id: roomId, language });
  },
  roomJoin: (roomId: string, playerCount: number) => {
    trackEvent('room_join', { room_id: roomId, player_count: playerCount });
  },
  share: (method: 'link' | 'qr' | 'social', contentType: 'room' | 'score' | 'achievement') => {
    trackEvent('share', { method, content_type: contentType });
  },
  achievementUnlock: (achievementId: string) => {
    trackEvent('achievement_unlock', { achievement_id: achievementId });
  },
  languageChange: (from: string, to: string) => {
    trackEvent('language_change', { from_language: from, to_language: to });
  },
  dailyChallengePlay: (challengeType: 'word_hunt', score: number, difficulty?: string) => {
    trackEvent('daily_challenge_played', { challenge_type: challengeType, score, difficulty: difficulty || 'normal' });
  },
  achievementMilestone: (tier: string, totalCount: number) => {
    trackEvent('achievement_milestone', { tier, total_achievements: totalCount });
  },
  referralComplete: (rewardXp: number, referredPlayerId?: string) => {
    trackEvent('referral_completed', { reward_xp: rewardXp, referred_player: referredPlayerId || 'unknown' });
  },
  pwaInstalled: () => {
    trackEvent('pwa_installed', { timestamp: new Date().toISOString() });
  },
  profileCustomize: (customizationType: 'avatar' | 'title' | 'banner', value: string) => {
    trackEvent('profile_customized', { customization_type: customizationType, value });
  },
  leaderboardMilestone: (rank: number, category: 'daily' | 'weekly' | 'all_time') => {
    trackEvent('leaderboard_milestone', { rank, category });
  },
  trackEvent: (eventName: string, params: Record<string, string | number | boolean>) => {
    trackEvent(eventName, params);
  },
};

export default GoogleAnalytics;
