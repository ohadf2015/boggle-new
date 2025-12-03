/**
 * Growth Tracking Utilities
 * Analytics events for measuring viral coefficient and user engagement
 */

import logger from '@/utils/logger';
import { apiUrl } from '@/lib/config';
import { getStoredUtmData } from './utmCapture';
import { getGuestSessionId, getGuestName } from './guestManager';

// Growth event types for tracking viral loops and engagement
export type GrowthEvent =
  // Acquisition
  | 'page_view'
  | 'referral_link_clicked'
  | 'room_joined_via_link'
  | 'room_joined_via_code'
  // Activation
  | 'first_game_played'
  | 'first_word_found'
  | 'first_game_won'
  // Retention
  | 'return_visit'
  | 'streak_continued'
  | 'streak_milestone'
  | 'daily_challenge_completed'
  // Referral
  | 'share_link_copied'
  | 'share_whatsapp_clicked'
  | 'share_qr_generated'
  | 'share_win_prompt_shown'
  | 'share_win_prompt_clicked'
  // Engagement
  | 'achievement_earned'
  | 'achievement_shared'
  | 'leaderboard_viewed'
  | 'profile_viewed'
  // Conversion
  | 'signup_prompt_shown'
  | 'signup_completed'
  | 'first_win_signup_shown'
  | 'first_win_signup_completed';

export interface GrowthEventData {
  // Common properties
  timestamp?: number;
  sessionId?: string;
  userId?: string;
  isGuest?: boolean;

  // Game context
  gameCode?: string;
  roomName?: string;
  language?: string;
  playerCount?: number;

  // Event-specific data
  score?: number;
  wordCount?: number;
  achievementId?: string;
  achievementTier?: string;
  shareMethod?: 'whatsapp' | 'copy' | 'qr' | 'native';
  referralSource?: string;
  streakDays?: number;
  position?: number; // Leaderboard position

  // Custom properties
  [key: string]: unknown;
}

// Session tracking
let sessionId: string | null = null;
const eventQueue: Array<{ event: GrowthEvent; data: GrowthEventData }> = [];
const MAX_QUEUE_SIZE = 50;

/**
 * Generate or retrieve session ID
 */
const getSessionId = (): string => {
  if (sessionId) return sessionId;

  if (typeof window === 'undefined') return 'server';

  // Try to get from sessionStorage
  sessionId = sessionStorage.getItem('lexiclash_session_id');

  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    sessionStorage.setItem('lexiclash_session_id', sessionId);
  }

  return sessionId;
};

/**
 * Get referral source from URL
 */
export const getReferralSource = (): string | null => {
  if (typeof window === 'undefined') return null;

  const params = new URLSearchParams(window.location.search);
  return params.get('ref') || params.get('utm_source') || null;
};

/**
 * Track a growth event
 */
export const trackGrowthEvent = (event: GrowthEvent, data: GrowthEventData = {}): void => {
  const enrichedData: GrowthEventData = {
    ...data,
    timestamp: Date.now(),
    sessionId: getSessionId(),
    referralSource: data.referralSource || getReferralSource(),
  };

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    logger.info(`[GROWTH] ${event}`, enrichedData);
  }

  // Add to queue for batch processing
  eventQueue.push({ event, data: enrichedData });

  // Trim queue if too large
  if (eventQueue.length > MAX_QUEUE_SIZE) {
    eventQueue.shift();
  }

  // Send to LogRocket if available
  if (typeof window !== 'undefined' && (window as unknown as { LogRocket?: { track: (event: string, data: object) => void } }).LogRocket) {
    try {
      (window as unknown as { LogRocket: { track: (event: string, data: object) => void } }).LogRocket.track(`growth:${event}`, enrichedData);
    } catch {
      // Silently fail if LogRocket not properly initialized
    }
  }

  // Store key events in localStorage for analysis
  storeEventLocally(event, enrichedData);
};

/**
 * Store important events locally for offline analysis
 */
const storeEventLocally = (event: GrowthEvent, data: GrowthEventData): void => {
  if (typeof window === 'undefined') return;

  // Only store key funnel events
  const keyEvents: GrowthEvent[] = [
    'first_game_played',
    'first_game_won',
    'share_whatsapp_clicked',
    'share_link_copied',
    'signup_completed',
    'streak_milestone',
  ];

  if (!keyEvents.includes(event)) return;

  try {
    const storageKey = 'lexiclash_growth_events';
    const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');
    existing.push({ event, data, timestamp: Date.now() });

    // Keep only last 100 events
    const trimmed = existing.slice(-100);
    localStorage.setItem(storageKey, JSON.stringify(trimmed));
  } catch {
    // Storage full or unavailable
  }
};

/**
 * Track share event with method
 */
export const trackShare = (method: 'whatsapp' | 'copy' | 'qr' | 'native', gameCode?: string): void => {
  const eventMap: Record<string, GrowthEvent> = {
    whatsapp: 'share_whatsapp_clicked',
    copy: 'share_link_copied',
    qr: 'share_qr_generated',
    native: 'share_link_copied',
  };

  trackGrowthEvent(eventMap[method], {
    shareMethod: method,
    gameCode,
  });
};

/**
 * Track achievement earned
 */
export const trackAchievement = (achievementId: string, tier?: string): void => {
  trackGrowthEvent('achievement_earned', {
    achievementId,
    achievementTier: tier,
  });
};

/**
 * Track streak milestone
 */
export const trackStreakMilestone = (streakDays: number): void => {
  // Only track milestones at 3, 7, 14, 30 days
  const milestones = [3, 7, 14, 30, 50, 100];

  if (milestones.includes(streakDays)) {
    trackGrowthEvent('streak_milestone', { streakDays });
  }
};

/**
 * Track game completion
 */
export const trackGameCompletion = (
  isWinner: boolean,
  score: number,
  wordCount: number,
  isFirstGame: boolean
): void => {
  if (isFirstGame) {
    trackGrowthEvent('first_game_played', { score, wordCount });
  }

  if (isWinner) {
    trackGrowthEvent(isFirstGame ? 'first_game_won' : 'streak_continued', {
      score,
      wordCount,
    });
  }
};

/**
 * Track signup funnel
 */
export const trackSignupFunnel = (
  step: 'prompt_shown' | 'completed',
  isFirstWin: boolean
): void => {
  if (isFirstWin) {
    trackGrowthEvent(step === 'prompt_shown' ? 'first_win_signup_shown' : 'first_win_signup_completed');
  } else {
    trackGrowthEvent(step === 'prompt_shown' ? 'signup_prompt_shown' : 'signup_completed');
  }
};

/**
 * Get growth metrics summary (for admin dashboard)
 */
export const getGrowthMetricsSummary = (): {
  totalShares: number;
  totalAchievements: number;
  avgStreakDays: number;
  conversionEvents: number;
} => {
  if (typeof window === 'undefined') {
    return { totalShares: 0, totalAchievements: 0, avgStreakDays: 0, conversionEvents: 0 };
  }

  try {
    const events = JSON.parse(localStorage.getItem('lexiclash_growth_events') || '[]');

    const shareEvents = events.filter((e: { event: string }) =>
      ['share_whatsapp_clicked', 'share_link_copied'].includes(e.event)
    );

    const achievementEvents = events.filter((e: { event: string }) => e.event === 'achievement_earned');

    const streakEvents = events.filter((e: { event: string }) => e.event === 'streak_milestone');

    const conversionEvents = events.filter((e: { event: string }) =>
      ['signup_completed', 'first_win_signup_completed'].includes(e.event)
    );

    const avgStreak =
      streakEvents.length > 0
        ? streakEvents.reduce((sum: number, e: { data: { streakDays?: number } }) => sum + (e.data?.streakDays || 0), 0) / streakEvents.length
        : 0;

    return {
      totalShares: shareEvents.length,
      totalAchievements: achievementEvents.length,
      avgStreakDays: Math.round(avgStreak),
      conversionEvents: conversionEvents.length,
    };
  } catch {
    return { totalShares: 0, totalAchievements: 0, avgStreakDays: 0, conversionEvents: 0 };
  }
};

/**
 * Generate a unique referral code for sharing
 */
export const generateReferralCode = (userId?: string): string => {
  const base = userId || getSessionId();
  const hash = base.split('').reduce((acc, char) => {
    return ((acc << 5) - acc + char.charCodeAt(0)) | 0;
  }, 0);

  return Math.abs(hash).toString(36).substring(0, 6).toUpperCase();
};

/**
 * Get share URL with referral tracking
 * @param gameCode - The game code
 * @param referralCode - Optional referral code
 * @param utmSource - UTM source for tracking (defaults to 'referral')
 */
export const getShareUrlWithTracking = (gameCode: string, referralCode?: string, utmSource: string = 'referral'): string => {
  if (typeof window === 'undefined') return '';

  const baseUrl = window.location.origin;
  const params = new URLSearchParams();
  params.set('room', gameCode);

  if (referralCode) {
    params.set('ref', referralCode);
  }

  // Add UTM tracking for analytics
  params.set('utm_source', utmSource);
  params.set('utm_medium', 'share');

  return `${baseUrl}?${params.toString()}`;
};

/**
 * Track analytics event to server (for guest player tracking)
 * This sends events to the backend for database storage
 */
export const trackAnalyticsEvent = async (
  eventType: string,
  guestName?: string,
  metadata: Record<string, unknown> = {}
): Promise<void> => {
  if (typeof window === 'undefined') return;

  try {
    const utmData = getStoredUtmData();
    const sessionId = getGuestSessionId();
    const storedGuestName = getGuestName();

    const payload = {
      event_type: eventType,
      session_id: sessionId,
      guest_name: guestName || storedGuestName || null,
      utm_source: utmData?.utm_source || utmData?.ref || null,
      utm_medium: utmData?.utm_medium || null,
      utm_campaign: utmData?.utm_campaign || null,
      referrer: utmData?.referrer || null,
      metadata,
    };

    // Fire and forget - don't block on response
    fetch(apiUrl('/api/analytics/track'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch((err) => {
      logger.warn('[ANALYTICS] Failed to track event:', err);
    });
  } catch (error) {
    logger.warn('[ANALYTICS] Error tracking event:', error);
  }
};

/**
 * Track guest player joining a game
 */
export const trackGuestJoin = (
  guestName: string,
  gameCode: string,
  language?: string
): void => {
  trackAnalyticsEvent('guest_join', guestName, { gameCode, language });
  trackGrowthEvent('room_joined_via_link', { gameCode, isGuest: true });
};

/**
 * Track guest player game completion
 */
export const trackGuestGameComplete = (
  guestName: string,
  gameCode: string,
  score: number,
  wordCount: number,
  isWinner: boolean
): void => {
  trackAnalyticsEvent('guest_game_complete', guestName, {
    gameCode,
    score,
    wordCount,
    isWinner,
  });
};

/**
 * Track page view with UTM data
 */
export const trackPageView = (path?: string): void => {
  if (typeof window === 'undefined') return;

  const guestName = getGuestName();
  trackAnalyticsEvent('page_view', guestName || undefined, {
    path: path || window.location.pathname,
    search: window.location.search,
  });
};

const growthTracking = {
  trackGrowthEvent,
  trackShare,
  trackAchievement,
  trackStreakMilestone,
  trackGameCompletion,
  trackSignupFunnel,
  getGrowthMetricsSummary,
  generateReferralCode,
  getShareUrlWithTracking,
  getReferralSource,
  trackAnalyticsEvent,
  trackGuestJoin,
  trackGuestGameComplete,
  trackPageView,
};

export default growthTracking;
