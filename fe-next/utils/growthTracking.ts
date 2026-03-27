/**
 * Growth Tracking Utilities
 * Analytics events for measuring viral coefficient and user engagement
 */

import logger from '@/utils/logger';
import { getStoredUtmData } from './utmCapture';
import { getGuestSessionId, getGuestName } from './guestManager';
import { trackEvent as trackGA4Event } from '@/components/GoogleAnalytics';
import {
  getJsonFromLocalStorage,
  saveJsonToLocalStorage,
} from '@/utils/storageHelpers';

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
  // Session & Game lifecycle
  | 'session_start'
  | 'game_started'
  | 'game_completed'
  | 'game_abandoned'
  | 'mode_selected'
  // Retention
  | 'return_visit'
  | 'streak_continued'
  | 'streak_milestone'
  | 'streak_broken'
  | 'streak_freeze_used'
  | 'daily_challenge_completed'
  | 'daily_puzzle_opened'
  | 'daily_puzzle_completed'
  // Adventure
  | 'adventure_level_start'
  | 'adventure_level_pass'
  | 'adventure_level_fail'
  | 'adventure_quit'
  // Social
  | 'share_link_copied'
  | 'share_whatsapp_clicked'
  | 'share_qr_generated'
  | 'share_win_prompt_shown'
  | 'share_win_prompt_clicked'
  | 'share_card_generated'
  | 'friend_added'
  | 'challenge_sent'
  // Engagement
  | 'achievement_earned'
  | 'achievement_shared'
  | 'leaderboard_viewed'
  | 'profile_viewed'
  | 'feature_first_use'
  | 'hint_used'
  // Conversion
  | 'signup_prompt_shown'
  | 'signup_completed'
  | 'first_win_signup_shown'
  | 'first_win_signup_completed'
  | 'guest_conversion'
  // Monetization
  | 'iap_viewed'
  | 'iap_purchased'
  | 'rewarded_ad_offered'
  | 'rewarded_ad_watched'
  | 'rewarded_ad_declined';

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
  shareMethod?: 'whatsapp' | 'copy' | 'qr' | 'native' | 'facebook' | 'telegram' | 'twitter' | 'discord' | 'email' | 'sms';
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
    referralSource: data.referralSource || getReferralSource() || undefined,
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

  // Send to GA4 for unified analytics
  // Convert GrowthEventData to Record<string, string | number | boolean>
  const ga4Data: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(enrichedData)) {
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      ga4Data[key] = value;
    }
  }
  trackGA4Event(`growth_${event}`, ga4Data);

  // Persist to Supabase via analytics API (fire and forget)
  persistToSupabase(event, enrichedData);

  // Store key events in localStorage for analysis
  storeEventLocally(event, enrichedData);
};

/**
 * Persist event to Supabase analytics_events table via API
 * Fire-and-forget — never blocks the UI
 */
const persistToSupabase = (event: GrowthEvent, data: GrowthEventData): void => {
  if (typeof window === 'undefined') return;

  // Throttle: skip high-frequency events that would overwhelm the DB
  const skipPersist: GrowthEvent[] = ['page_view']; // page_view already tracked via trackPageView
  if (skipPersist.includes(event)) return;

  const utmData = getStoredUtmData();
  const guestSessionId = getGuestSessionId();

  // Build metadata from event data (exclude fields stored as top-level columns)
  const { sessionId: _sid, referralSource: _ref, timestamp: _ts, ...metadata } = data;

  fetch('/api/analytics/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event_type: event,
      session_id: guestSessionId || data.sessionId || null,
      utm_source: utmData?.utm_source || utmData?.ref || null,
      utm_medium: utmData?.utm_medium || null,
      utm_campaign: utmData?.utm_campaign || null,
      referrer: utmData?.referrer || null,
      metadata,
    }),
  }).catch(() => {
    // Silently fail — analytics should never break the game
  });
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

  const storageKey = 'lexiclash_growth_events';
  const existing = getJsonFromLocalStorage<Array<{ event: GrowthEvent; data: GrowthEventData; timestamp: number }>>(storageKey, []);
  existing.push({ event, data, timestamp: Date.now() });

  // Keep only last 100 events
  const trimmed = existing.slice(-100);
  saveJsonToLocalStorage(storageKey, trimmed);
};

/** Share method type for tracking */
export type ShareMethod = 'whatsapp' | 'copy' | 'qr' | 'native' | 'facebook' | 'telegram' | 'twitter' | 'discord' | 'email' | 'sms';

/**
 * Track share event with method
 */
export const trackShare = (method: ShareMethod, gameCode?: string): void => {
  const eventMap: Record<string, GrowthEvent> = {
    whatsapp: 'share_whatsapp_clicked',
    copy: 'share_link_copied',
    qr: 'share_qr_generated',
    native: 'share_link_copied',
    facebook: 'share_link_copied',
    telegram: 'share_link_copied',
    twitter: 'share_link_copied',
    discord: 'share_link_copied',
    email: 'share_link_copied',
    sms: 'share_link_copied',
  };

  const event = eventMap[method];
  if (event) {
    trackGrowthEvent(event, {
      shareMethod: method,
      gameCode,
    });
    // Funnel event for share action
    const platformMap: Record<string, string> = {
      copy: 'clipboard', native: 'native', whatsapp: 'whatsapp',
      facebook: 'native', telegram: 'native', twitter: 'native',
      discord: 'native', email: 'native', sms: 'native',
    };
    trackGA4Event('funnel_share', { platform: platformMap[method] || 'native' });
  }
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
  isFirstGame: boolean,
  gameMode?: string
): void => {
  if (isFirstGame) {
    trackGrowthEvent('first_game_played', { score, wordCount });
    // Funnel event for first game
    trackGA4Event('funnel_first_game', { mode: gameMode || 'unknown' });
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

  const events = getJsonFromLocalStorage<Array<{ event: string; data: { streakDays?: number } }>>(
    'lexiclash_growth_events',
    []
  );

  const shareEvents = events.filter((e) =>
    ['share_whatsapp_clicked', 'share_link_copied'].includes(e.event)
  );

  const achievementEvents = events.filter((e) => e.event === 'achievement_earned');

  const streakEvents = events.filter((e) => e.event === 'streak_milestone');

  const conversionEvents = events.filter((e) =>
    ['signup_completed', 'first_win_signup_completed'].includes(e.event)
  );

  const avgStreak =
    streakEvents.length > 0
      ? streakEvents.reduce((sum, e) => sum + (e.data?.streakDays || 0), 0) / streakEvents.length
      : 0;

  return {
    totalShares: shareEvents.length,
    totalAchievements: achievementEvents.length,
    avgStreakDays: Math.round(avgStreak),
    conversionEvents: conversionEvents.length,
  };
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
  params.set('utm_medium', 'referral');
  params.set('utm_campaign', 'player_invite');

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
    fetch('/api/analytics/track', {
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

/**
 * Track game start across any mode (SP, MP, daily, adventure, drill, blast)
 */
export const trackGameStart = (
  mode: string,
  extras: Record<string, unknown> = {}
): void => {
  trackGrowthEvent('game_started', { ...extras, gameMode: mode });
};

/**
 * Track game completion across any mode
 */
export const trackGameEnd = (
  mode: string,
  score: number,
  wordCount: number,
  completed: boolean,
  durationSec?: number,
  extras: Record<string, unknown> = {}
): void => {
  trackGrowthEvent(completed ? 'game_completed' : 'game_abandoned', {
    ...extras,
    gameMode: mode,
    score,
    wordCount,
    durationSec,
  });
};

/**
 * Track adventure level events
 */
export const trackAdventureLevel = (
  action: 'start' | 'pass' | 'fail' | 'quit',
  world: number,
  level: number,
  extras: Record<string, unknown> = {}
): void => {
  const eventMap = {
    start: 'adventure_level_start' as const,
    pass: 'adventure_level_pass' as const,
    fail: 'adventure_level_fail' as const,
    quit: 'adventure_quit' as const,
  };
  trackGrowthEvent(eventMap[action], { ...extras, world, level });
};

/**
 * Track mode selection from home screen
 */
export const trackModeSelected = (mode: string, fromScreen: string = 'home'): void => {
  trackGrowthEvent('mode_selected', { gameMode: mode, fromScreen });
};

/**
 * Track first use of a feature (deduplicated in localStorage)
 */
export const trackFeatureFirstUse = (feature: string): void => {
  if (typeof window === 'undefined') return;
  const key = `lexiclash_first_use_${feature}`;
  if (localStorage.getItem(key)) return;
  localStorage.setItem(key, '1');
  trackGrowthEvent('feature_first_use', { feature });
};

/**
 * Track daily puzzle engagement
 */
export const trackDailyPuzzle = (
  action: 'opened' | 'completed',
  puzzleType: string,
  extras: Record<string, unknown> = {}
): void => {
  trackGrowthEvent(
    action === 'opened' ? 'daily_puzzle_opened' : 'daily_puzzle_completed',
    { ...extras, puzzleType }
  );
};

/**
 * Track hint usage
 */
export const trackHintUsed = (mode: string, hintType: string = 'standard'): void => {
  trackGrowthEvent('hint_used', { gameMode: mode, hintType });
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
  trackGameStart,
  trackGameEnd,
  trackAdventureLevel,
  trackModeSelected,
  trackFeatureFirstUse,
  trackDailyPuzzle,
  trackHintUsed,
};

export default growthTracking;
