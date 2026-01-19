'use client';

import Script from 'next/script';

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID;

/**
 * Google Analytics 4 component
 *
 * Add NEXT_PUBLIC_GA4_MEASUREMENT_ID to your environment variables
 * to enable tracking. Without it, analytics is disabled.
 */
export function GoogleAnalytics() {
  // Skip analytics if no measurement ID or if running locally
  if (!GA_MEASUREMENT_ID) {
    return null;
  }

  // Don't run analytics on localhost
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return null;
  }

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="lazyOnload"
      />
      <Script id="google-analytics" strategy="lazyOnload">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}', {
            page_path: window.location.pathname,
            cookie_flags: 'SameSite=None;Secure',
          });
        `}
      </Script>
    </>
  );
}

/**
 * Track custom events in GA4
 *
 * Usage:
 * - trackEvent('game_start', { mode: 'multiplayer', room_id: 'ABC123' })
 * - trackEvent('word_submitted', { word: 'hello', score: 5, is_valid: true })
 * - trackEvent('game_end', { final_score: 150, words_found: 25 })
 */
export function trackEvent(
  eventName: string,
  eventParams?: Record<string, string | number | boolean>
): void {
  if (typeof window !== 'undefined' && 'gtag' in window && GA_MEASUREMENT_ID && window.location.hostname !== 'localhost') {
    (window as typeof window & { gtag: (...args: unknown[]) => void }).gtag('event', eventName, eventParams);
  }
}

/**
 * Track page views manually (useful for SPA navigation)
 */
export function trackPageView(url: string, title?: string): void {
  if (typeof window !== 'undefined' && 'gtag' in window && GA_MEASUREMENT_ID && window.location.hostname !== 'localhost') {
    (window as typeof window & { gtag: (...args: unknown[]) => void }).gtag('config', GA_MEASUREMENT_ID, {
      page_path: url,
      page_title: title,
    });
  }
}

// Common game events helper functions
export const gameEvents = {
  /** Track when a player starts a game */
  gameStart: (mode: 'solo' | 'multiplayer', roomId?: string) => {
    trackEvent('game_start', {
      game_mode: mode,
      room_id: roomId || 'solo',
    });
  },

  /** Track when a game ends */
  gameEnd: (finalScore: number, wordsFound: number, duration: number) => {
    trackEvent('game_end', {
      final_score: finalScore,
      words_found: wordsFound,
      duration_seconds: Math.round(duration / 1000),
    });
  },

  /** Track word submission */
  wordSubmit: (word: string, score: number, isValid: boolean, comboLevel?: number) => {
    trackEvent('word_submit', {
      word_length: word.length,
      score: score,
      is_valid: isValid,
      combo_level: comboLevel || 0,
    });
  },

  /** Track room creation */
  roomCreate: (roomId: string, language: string) => {
    trackEvent('room_create', {
      room_id: roomId,
      language: language,
    });
  },

  /** Track room join */
  roomJoin: (roomId: string, playerCount: number) => {
    trackEvent('room_join', {
      room_id: roomId,
      player_count: playerCount,
    });
  },

  /** Track share action */
  share: (method: 'link' | 'qr' | 'social', contentType: 'room' | 'score' | 'achievement') => {
    trackEvent('share', {
      method: method,
      content_type: contentType,
    });
  },

  /** Track achievement unlock */
  achievementUnlock: (achievementId: string) => {
    trackEvent('achievement_unlock', {
      achievement_id: achievementId,
    });
  },

  /** Track language change */
  languageChange: (from: string, to: string) => {
    trackEvent('language_change', {
      from_language: from,
      to_language: to,
    });
  },

  /** Track Daily Challenge participation */
  dailyChallengePlay: (challengeType: 'word_hunt' | 'buzz', score: number, difficulty?: string) => {
    trackEvent('daily_challenge_played', {
      challenge_type: challengeType,
      score: score,
      difficulty: difficulty || 'normal',
    });
  },

  /** Track achievement milestones (e.g., "Earned 25 achievements") */
  achievementMilestone: (tier: string, totalCount: number) => {
    trackEvent('achievement_milestone', {
      tier: tier, // 'bronze', 'silver', 'gold', etc.
      total_achievements: totalCount,
    });
  },

  /** Track referral completion */
  referralComplete: (rewardXp: number, referredPlayerId?: string) => {
    trackEvent('referral_completed', {
      reward_xp: rewardXp,
      referred_player: referredPlayerId || 'unknown',
    });
  },

  /** Track PWA install success */
  pwaInstalled: () => {
    trackEvent('pwa_installed', {
      timestamp: new Date().toISOString(),
    });
  },

  /** Track profile customization (avatar, title, etc.) */
  profileCustomize: (customizationType: 'avatar' | 'title' | 'banner', value: string) => {
    trackEvent('profile_customized', {
      customization_type: customizationType,
      value: value,
    });
  },

  /** Track leaderboard rank milestones */
  leaderboardMilestone: (rank: number, category: 'daily' | 'weekly' | 'all_time') => {
    trackEvent('leaderboard_milestone', {
      rank: rank,
      category: category,
    });
  },

  /** Generic event tracking for custom events */
  trackEvent: (eventName: string, params: Record<string, string | number | boolean>) => {
    trackEvent(eventName, params);
  },
};

export default GoogleAnalytics;
