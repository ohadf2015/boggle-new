/**
 * Push Notification Triggers
 * Maps game events to push notification sends + notification history
 * Fire-and-forget — never blocks the calling handler
 */

import logger from '../utils/logger';
import { translatePush, type PushLocale, isPushLocale, countryToLocale } from '../utils/pushTranslations';
import { resolveRivalDisplayName } from '@/lib/pushDisplayName';
import { sendToUser, type FCMPayload } from './fcmService';
import { mascotImageUrl } from '../services/pushNotificationService';
import { getSupabase, isSupabaseConfigured } from './supabase';
import { shouldSendDirectMessagePush } from './pushDedup';
import { getCachedTranslation } from '../../translations/loadTranslation';
import type { Language } from '@/types';

/**
 * Resolve a single achievement key (e.g. 'WORD_MASTER') to a display name in
 * the recipient's locale. Falls back to English, then to a humanized key.
 */
function resolveAchievementName(key: string, locale: PushLocale): string {
  const t = getCachedTranslation(locale as Language) as { achievements?: Record<string, { name?: string }> } | undefined;
  const localized = t?.achievements?.[key]?.name;
  if (localized) return localized;
  const en = getCachedTranslation('en') as { achievements?: Record<string, { name?: string }> } | undefined;
  const enName = en?.achievements?.[key]?.name;
  if (enName) return enName;
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export type PushNotificationType =
  | 'friend_request'
  | 'friend_accepted'
  | 'game_invite'
  | 'turn_reminder'
  | 'achievement'
  | 'daily_challenge'
  | 'direct_message'
  | 'challenge_accepted'
  | 'challenge_declined'
  | 'challenge_result'
  | 'async_challenge_received'
  | 'async_challenge_result'
  | 'gift_received'
  | 'level_up'
  | 'season_start'
  | 'curator_assigned'
  | 'word_tower_wreck'
  | 'word_tower_pass';

/**
 * Map push types to notification_type for user_notifications table (N-7)
 */
const NOTIFICATION_TYPE_MAP: Record<PushNotificationType, string> = {
  friend_request: 'social',
  friend_accepted: 'social',
  game_invite: 'social',
  direct_message: 'social',
  challenge_accepted: 'social',
  challenge_declined: 'social',
  challenge_result: 'social',
  async_challenge_received: 'social',
  async_challenge_result: 'social',
  gift_received: 'social',
  turn_reminder: 'social',
  word_tower_wreck: 'social',
  word_tower_pass: 'social',
  achievement: 'achievement',
  daily_challenge: 'system',
  level_up: 'achievement',
  season_start: 'system',
  curator_assigned: 'system',
};

/**
 * Autonyms for the five supported languages — used so a curator-assigned push
 * names the curated language in its OWN script (e.g. "עברית", "日本語"),
 * which reads naturally regardless of the recipient's own UI locale.
 */
const LANGUAGE_AUTONYMS: Record<string, string> = {
  en: 'English',
  he: 'עברית',
  sv: 'Svenska',
  ja: '日本語',
  es: 'Español',
};

/**
 * Batch-fetch locales for many recipients in a single profiles query.
 * Used by hot fan-out paths (game-end emit*, hourly cron) to avoid the
 * N+1 round-trip pattern that saturated the Supabase semaphore (Sentry
 * 136). Mirrors getUserLocale's chain in-process — chosen language
 * (profiles.language) wins; falls back to country_code heuristic; then
 * 'en'. Single round-trip cost: same query plus one extra column.
 */
export async function getUserLocalesBatch(
  userIds: readonly string[]
): Promise<Map<string, PushLocale>> {
  const map = new Map<string, PushLocale>();
  if (userIds.length === 0) return map;
  try {
    if (!isSupabaseConfigured()) return map;
    const supabase = getSupabase();
    if (!supabase) return map;

    const unique = Array.from(new Set(userIds));
    const { data, error } = await supabase
      .from('profiles')
      .select('id, language, country_code')
      .in('id', unique);

    if (error || !data) return map;
    for (const row of data as Array<{ id: string; language: string | null; country_code: string | null }>) {
      if (isPushLocale(row.language)) {
        map.set(row.id, row.language);
        continue;
      }
      const fromCountry = countryToLocale(row.country_code);
      map.set(row.id, fromCountry ?? 'en');
    }
  } catch {
    /* fail-open: callers fall back to per-user getUserLocale */
  }
  return map;
}

/**
 * Resolve recipient's push locale: chosen language, else heuristic.
 *
 *   profiles.language → country_code heuristic → 'en'
 *
 * profiles.language is the user's *chosen* UI language (written by
 * /api/user/language from LanguageContext). game_sessions.language is the
 * puzzle dictionary the user picked, NOT their UI language — a Hebrew
 * speaker playing the English daily puzzle would otherwise get an English
 * push, so it's deliberately excluded from the chain. country_code is a
 * pure heuristic, used only when no chosen language exists. Fallback paths
 * log at debug-level only — they're benign defaults, not errors, and were
 * adding noise to Sentry (JAVASCRIPT-NEXTJS-148).
 */
export async function getUserLocale(userId: string): Promise<PushLocale> {
  try {
    if (!isSupabaseConfigured()) return 'en';
    const supabase = getSupabase();
    if (!supabase) return 'en';

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('language, country_code')
      .eq('id', userId)
      .maybeSingle();

    if (profileError) {
      logger.warn('PUSH_TRIGGER', 'profiles lookup failed — defaulting to en', { userId, error: profileError.message });
      return 'en';
    }

    if (isPushLocale(profile?.language)) return profile.language as PushLocale;

    // No chosen language — fall back to country_code heuristic.
    const fromCountry = countryToLocale(profile?.country_code);
    if (fromCountry) {
      logger.debug('PUSH_TRIGGER', 'profiles.language NULL — fell back to country_code', { userId, country: profile?.country_code });
      return fromCountry;
    }

    logger.debug('PUSH_TRIGGER', 'profiles.language NULL and no country signal — defaulting to en', { userId });
    return 'en';
  } catch (err) {
    logger.error('PUSH_TRIGGER', `getUserLocale threw: ${(err as Error).message}`, { userId });
    return 'en';
  }
}

/**
 * Save notification to user_notifications table for in-app history
 */
async function saveNotificationHistory(
  userId: string,
  type: string,
  payload: FCMPayload,
  deepLink?: string,
  senderId?: string
): Promise<void> {
  try {
    if (!isSupabaseConfigured()) return;

    const supabase = getSupabase();
    if (!supabase) return;

    const { error } = await supabase.from('user_notifications').insert({
      user_id: userId,
      notification_type: NOTIFICATION_TYPE_MAP[type as PushNotificationType] || 'system',
      title: payload.title,
      body: payload.body,
      action_url: deepLink,
      push_sent: true,
      push_sent_at: new Date().toISOString(),
      ...(senderId && { sender_id: senderId }),
    });

    if (error) {
      logger.warn('PUSH_TRIGGER', `Failed to save notification history: ${error.message}`);
    }
  } catch (error) {
    logger.error('PUSH_TRIGGER', `Error saving notification history: ${(error as Error).message}`);
  }
}

/**
 * Delivery mode per notification-policy matrix:
 *  - 'both': relational + time-sensitive (push + in-app row)
 *  - 'push_only': scheduled nudge, no in-app surface after open (daily reminder)
 *  - 'in_app_only': self-generated celebration / low-value alert (achievement, level-up, challenge declined)
 */
type DeliveryMode = 'both' | 'push_only' | 'in_app_only';

/**
 * Map push types → user preference category. Unmapped types (achievement,
 * level_up) are master-gated only.
 */
type PreferenceCategory =
  | 'daily_challenge'
  | 'streak_warning'
  | 'friend_invites'
  | 'weekly_summary';

const CATEGORY_MAP: Partial<Record<PushNotificationType, PreferenceCategory>> = {
  daily_challenge: 'daily_challenge',
  friend_request: 'friend_invites',
  friend_accepted: 'friend_invites',
  game_invite: 'friend_invites',
  challenge_accepted: 'friend_invites',
  challenge_declined: 'friend_invites',
  gift_received: 'friend_invites',
  direct_message: 'friend_invites',
  turn_reminder: 'friend_invites',
};

/**
 * Returns true if push should be sent for this (user, type). Loads row from
 * user_notification_preferences; missing row = defaults (all on except
 * weekly_summary). Fail-open on query errors — we'd rather deliver than drop.
 */
export async function isPushAllowed(
  userId: string,
  type: PushNotificationType
): Promise<boolean> {
  try {
    if (!isSupabaseConfigured()) return true;
    const supabase = getSupabase();
    if (!supabase) return true;

    const { data, error } = await supabase
      .from('user_notification_preferences')
      .select('push_enabled, daily_challenge, streak_warning, friend_invites, weekly_summary')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      logger.warn('PUSH_TRIGGER', `Preference lookup failed, allowing send: ${error.message}`);
      return true;
    }

    if (!data) return true; // no row → defaults (all on)

    if (data.push_enabled === false) return false;

    const category = CATEGORY_MAP[type];
    if (!category) return true; // unmapped type → master-only

    return data[category] !== false;
  } catch (error) {
    logger.error('PUSH_TRIGGER', `isPushAllowed error: ${(error as Error).message}`);
    return true;
  }
}

async function triggerPush(
  userId: string,
  type: PushNotificationType,
  payload: FCMPayload,
  mode: DeliveryMode = 'both',
  senderId?: string
): Promise<void> {
  try {
    const jobs: Promise<unknown>[] = [];
    if (mode !== 'in_app_only') {
      const allowed = await isPushAllowed(userId, type);
      if (allowed) jobs.push(sendToUser(userId, payload));
    }
    if (mode !== 'push_only') {
      jobs.push(saveNotificationHistory(userId, type, payload, payload.data?.deepLink, senderId));
    }
    await Promise.allSettled(jobs);
  } catch (error) {
    logger.error('PUSH_TRIGGER', `Trigger failed for ${type}: ${(error as Error).message}`);
  }
}

/**
 * Notify user of incoming friend request
 */
export async function notifyFriendRequest(
  toUserId: string,
  fromUsername: string,
  fromUserId?: string
): Promise<void> {
  const locale = await getUserLocale(toUserId);
  const sender = resolveRivalDisplayName([fromUsername], locale);
  return triggerPush(toUserId, 'friend_request', {
    title: translatePush(locale, 'friendRequest.title'),
    body: translatePush(locale, 'friendRequest.body', { sender }),
    imageUrl: mascotImageUrl('waving'),
    data: {
      type: 'friend_request',
      deepLink: '/friends?tab=requests',
    },
  }, 'both', fromUserId);
}

/**
 * Notify user their friend request was accepted
 */
export async function notifyFriendAccepted(
  toUserId: string,
  acceptorUsername: string,
  acceptorUserId?: string
): Promise<void> {
  const locale = await getUserLocale(toUserId);
  const sender = resolveRivalDisplayName([acceptorUsername], locale);
  return triggerPush(toUserId, 'friend_accepted', {
    title: translatePush(locale, 'friendAccepted.title'),
    body: translatePush(locale, 'friendAccepted.body', { sender }),
    imageUrl: mascotImageUrl('waving'),
    data: {
      type: 'friend_accepted',
      deepLink: '/friends?tab=friends',
    },
  }, 'both', acceptorUserId);
}

/**
 * Notify user of a game invite
 */
export async function notifyGameInvite(
  toUserId: string,
  inviterUsername: string,
  roomCode: string,
  inviterUserId?: string
): Promise<void> {
  const locale = await getUserLocale(toUserId);
  const sender = resolveRivalDisplayName([inviterUsername], locale);
  return triggerPush(toUserId, 'game_invite', {
    title: translatePush(locale, 'gameInvite.title'),
    body: translatePush(locale, 'gameInvite.body', { sender }),
    imageUrl: mascotImageUrl('play'),
    data: {
      type: 'game_invite',
      deepLink: `/multiplayer?room=${roomCode}`,
    },
  }, 'both', inviterUserId);
}

/**
 * Notify user it's their turn (async multiplayer)
 */
export async function notifyTurnReminder(
  toUserId: string,
  opponentUsername: string,
  roomCode: string
): Promise<void> {
  const locale = await getUserLocale(toUserId);
  return triggerPush(toUserId, 'turn_reminder', {
    title: translatePush(locale, 'turnReminder.title'),
    body: translatePush(locale, 'turnReminder.body', { opponent: opponentUsername }),
    imageUrl: mascotImageUrl('encouraging'),
    data: {
      type: 'turn_reminder',
      deepLink: `/multiplayer?room=${roomCode}`,
    },
  });
}

/**
 * Notify user of a single achievement unlock.
 * Accepts an achievement KEY (e.g. 'WORD_MASTER') — resolves the localized
 * display name from the user's profile.language. Pre-localized name strings
 * are still accepted (no translation table match → used verbatim) for
 * backwards compat with legacy call sites and tests.
 */
export async function notifyAchievement(
  toUserId: string,
  achievementKeyOrName: string,
  precomputedLocale?: PushLocale
): Promise<void> {
  const locale = precomputedLocale ?? (await getUserLocale(toUserId));
  const name = resolveAchievementName(achievementKeyOrName, locale);
  return triggerPush(toUserId, 'achievement', {
    title: translatePush(locale, 'achievement.title'),
    body: translatePush(locale, 'achievement.body', { name }),
    imageUrl: mascotImageUrl('mindblown'),
    data: {
      type: 'achievement',
      deepLink: '/adventure/achievements',
    },
  }, 'both');
}

/**
 * Notify user of multiple achievement unlocks in a single push.
 * Coalesces N unlocks into one notification — prevents the "3 pushes for one
 * game-end" UX bug where every achievement fires its own banner.
 *
 * 1 key  → "You earned: {name}"
 * 2 keys → "You earned: {a} & {b}"
 * 3+ keys → "You earned: {a}, {b} +{rest} more"
 *
 * No-op for empty arrays.
 */
export async function notifyAchievementsBatch(
  toUserId: string,
  achievementKeys: string[],
  precomputedLocale?: PushLocale
): Promise<void> {
  if (achievementKeys.length === 0) return;
  if (achievementKeys.length === 1) {
    return notifyAchievement(toUserId, achievementKeys[0], precomputedLocale);
  }
  const locale = precomputedLocale ?? (await getUserLocale(toUserId));
  const names = achievementKeys.map((k) => resolveAchievementName(k, locale));
  const count = names.length;
  const title = translatePush(locale, 'achievement.titleMulti', { count });
  const body = count === 2
    ? translatePush(locale, 'achievement.bodyTwo', { a: names[0], b: names[1] })
    : translatePush(locale, 'achievement.bodyMore', {
        a: names[0],
        b: names[1],
        rest: count - 2,
      });
  return triggerPush(toUserId, 'achievement', {
    title,
    body,
    imageUrl: mascotImageUrl('mindblown'),
    data: {
      type: 'achievement',
      deepLink: '/adventure/achievements',
    },
  }, 'both');
}

/**
 * Notify user of a new direct message (N-1).
 *
 * Push is coalesced via `shouldSendDirectMessagePush`: first message from a
 * given sender pushes; subsequent messages within the 60s window only land in
 * the in-app notifications row (so history stays complete) without firing a
 * second banner. Caller-side `modeOverride='in_app_only'` (recipient online)
 * skips the dedup gate since no push is being attempted anyway.
 */
export async function notifyDirectMessage(
  toUserId: string,
  fromUsername: string,
  messagePreview: string,
  fromUserId?: string,
  modeOverride?: 'both' | 'in_app_only'
): Promise<void> {
  const preview = messagePreview.length > 50
    ? messagePreview.substring(0, 47) + '...'
    : messagePreview;

  const deepLink = fromUserId
    ? `/friends?tab=messages&friendUserId=${fromUserId}`
    : '/friends?tab=messages';

  // Decide the actual delivery mode. Coalesce only when we'd otherwise push.
  let mode: DeliveryMode = modeOverride ?? 'both';
  if (mode === 'both' && fromUserId) {
    const allow = await shouldSendDirectMessagePush(toUserId, fromUserId);
    if (!allow) mode = 'in_app_only';
  }

  const locale = await getUserLocale(toUserId);
  return triggerPush(toUserId, 'direct_message', {
    title: translatePush(locale, 'directMessage.title', { sender: fromUsername }),
    body: translatePush(locale, 'directMessage.body', { preview }),
    imageUrl: mascotImageUrl('spectating'),
    data: {
      type: 'direct_message',
      deepLink,
    },
  }, mode, fromUserId);
}

/**
 * Notify challenger that their challenge was accepted (N-3)
 */
export async function notifyChallengeAccepted(
  toUserId: string,
  acceptorUsername: string,
  roomCode: string,
  acceptorUserId?: string
): Promise<void> {
  const locale = await getUserLocale(toUserId);
  const sender = resolveRivalDisplayName([acceptorUsername], locale);
  return triggerPush(toUserId, 'challenge_accepted', {
    title: translatePush(locale, 'challengeAccepted.title'),
    body: translatePush(locale, 'challengeAccepted.body', { sender }),
    imageUrl: mascotImageUrl('play'),
    data: {
      type: 'challenge_accepted',
      deepLink: `/multiplayer?room=${roomCode}`,
    },
  }, 'both', acceptorUserId);
}

/**
 * Notify challenger that their challenge was declined (N-4)
 */
export async function notifyChallengeDeclined(
  toUserId: string,
  declinerUsername: string,
  declinerUserId?: string
): Promise<void> {
  const locale = await getUserLocale(toUserId);
  const sender = resolveRivalDisplayName([declinerUsername], locale);
  return triggerPush(toUserId, 'challenge_declined', {
    title: translatePush(locale, 'challengeDeclined.title'),
    body: translatePush(locale, 'challengeDeclined.body', { sender }),
    imageUrl: mascotImageUrl('crying'),
    data: {
      type: 'challenge_declined',
      deepLink: '/friends',
    },
  }, 'in_app_only', declinerUserId);
}

/**
 * Notify both parties that a friend challenge match is complete (win/loss/tie).
 * Closes the loop so the recipient sees the result outside the live MP screen.
 */
export async function notifyChallengeResult(
  toUserId: string,
  opponentUsername: string,
  outcome: 'win' | 'loss' | 'tie',
  challengeId: string,
): Promise<void> {
  const locale = await getUserLocale(toUserId);
  const titleKey =
    outcome === 'win' ? 'challengeResult.titleWin' :
    outcome === 'loss' ? 'challengeResult.titleLoss' :
    'challengeResult.titleTie';
  const bodyKey =
    outcome === 'win' ? 'challengeResult.bodyWin' :
    outcome === 'loss' ? 'challengeResult.bodyLoss' :
    'challengeResult.bodyTie';
  const opponent = resolveRivalDisplayName([opponentUsername], locale);
  return triggerPush(toUserId, 'challenge_result', {
    title: translatePush(locale, titleKey, { opponent }),
    body: translatePush(locale, bodyKey, { opponent }),
    imageUrl: mascotImageUrl(outcome === 'win' ? 'celebration' : outcome === 'loss' ? 'crying' : 'play'),
    data: {
      type: 'challenge_result',
      deepLink: '/friends',
      challengeId,
      outcome,
    },
  }, 'both');
}

/**
 * Notify friend that an async friend challenge has arrived for them.
 * Spec: fe-next/docs/specs/2026-05-13-friend-challenge-async-design.md §4.6
 * Deep-links to /friend-challenge/{challengeId} so the friend lands on the
 * accept/decline page that shows the target score.
 */
export async function notifyAsyncChallengeReceived(
  toUserId: string,
  fromUsername: string,
  challengeId: string,
  targetScore: number,
  gameMode: string,
): Promise<void> {
  const locale = await getUserLocale(toUserId);
  const sender = resolveRivalDisplayName([fromUsername], locale);
  return triggerPush(toUserId, 'async_challenge_received', {
    title: translatePush(locale, 'asyncChallenge.received.title', { sender }),
    body: translatePush(locale, 'asyncChallenge.received.body', {
      score: String(targetScore),
      mode: gameMode,
    }),
    imageUrl: mascotImageUrl('play'),
    data: {
      type: 'async_challenge_received',
      deepLink: `/friend-challenge/${challengeId}`,
      challengeId,
      targetScore: String(targetScore),
      gameMode,
    },
  }, 'both');
}

/**
 * Notify a participant of an async friend challenge result (both sides fire).
 * Spec: fe-next/docs/specs/2026-05-13-friend-challenge-async-design.md §4.6
 */
export async function notifyAsyncChallengeResult(
  toUserId: string,
  opponentUsername: string,
  challengeId: string,
  didWin: boolean,
  myScore: number,
  theirScore: number,
): Promise<void> {
  const locale = await getUserLocale(toUserId);
  const isTie = myScore === theirScore;
  const outcome: 'win' | 'loss' | 'tie' = isTie ? 'tie' : didWin ? 'win' : 'loss';
  const titleKey =
    outcome === 'win' ? 'asyncChallenge.result.titleWin'
    : outcome === 'loss' ? 'asyncChallenge.result.titleLoss'
    : 'asyncChallenge.result.titleTie';
  const bodyKey =
    outcome === 'win' ? 'asyncChallenge.result.bodyWin'
    : outcome === 'loss' ? 'asyncChallenge.result.bodyLoss'
    : 'asyncChallenge.result.bodyTie';
  return triggerPush(toUserId, 'async_challenge_result', {
    title: translatePush(locale, titleKey, { opponent: opponentUsername }),
    body: translatePush(locale, bodyKey, {
      opponent: opponentUsername,
      mine: String(myScore),
      theirs: String(theirScore),
    }),
    imageUrl: mascotImageUrl(outcome === 'win' ? 'celebration' : outcome === 'loss' ? 'crying' : 'play'),
    data: {
      type: 'async_challenge_result',
      deepLink: `/friend-challenge/${challengeId}`,
      challengeId,
      outcome,
      mine: String(myScore),
      theirs: String(theirScore),
    },
  }, 'both');
}

/**
 * Notify user they received a gift (N-1 gap / E-7)
 */
export async function notifyGiftReceived(
  toUserId: string,
  senderUsername: string,
  giftType: string,
  senderId?: string
): Promise<void> {
  const locale = await getUserLocale(toUserId);
  const labelKey = `giftLabel.${giftType}`;
  // Fall through to raw giftType if no label key exists in dict
  const label = translatePush(locale, labelKey);
  const resolvedLabel = label === labelKey ? giftType : label;

  return triggerPush(toUserId, 'gift_received', {
    title: translatePush(locale, 'giftReceived.title'),
    body: translatePush(locale, 'giftReceived.body', { sender: senderUsername, label: resolvedLabel }),
    imageUrl: mascotImageUrl('celebration'),
    data: {
      type: 'gift_received',
      deepLink: '/friends',
    },
  }, 'both', senderId);
}

/**
 * Remind user to complete today's daily challenge (server-side cron)
 * Only called for users who haven't played today (gate enforced by cron query)
 */
export async function notifyDailyChallengeReminder(
  toUserId: string,
  override?: {
    title?: string;
    body?: string;
    deepLink?: string;
    variant?: number;
    locale?: PushLocale;
    imageUrl?: string;
    kind?: string;
  }
): Promise<boolean> {
  // Hourly reminder cron pre-fetches every recipient's locale in one batch
  // via getDailyChallengePushRecipients(). When the caller passes it through
  // we skip the per-user profiles round-trip — that fan-out was a primary
  // contributor to Supabase queue saturation (Sentry 136).
  const locale = override?.locale ?? (await getUserLocale(toUserId));
  const title = override?.title ?? translatePush(locale, 'dailyChallenge.title');
  const body = override?.body ?? translatePush(locale, 'dailyChallenge.body');
  const deepLink = override?.deepLink ?? '/daily';
  const imageUrl = override?.imageUrl ?? mascotImageUrl('encouraging');

  // This is a 'push_only' nudge — no in-app history row — so we inline the
  // pref-check + send instead of going through triggerPush(). That lets us
  // RETURN whether a device actually received it. The cron must only mark a
  // user as "reminded today" on a true return; otherwise one non-delivering
  // tick (dead token, FCM hiccup) silences them for the rest of the day with
  // no retry. Mirrors triggerPush's never-throw contract.
  try {
    const allowed = await isPushAllowed(toUserId, 'daily_challenge');
    if (!allowed) return false;
    const delivered = await sendToUser(toUserId, {
      title,
      body,
      imageUrl,
      data: {
        type: 'daily_challenge',
        deepLink,
        ...(override?.variant !== undefined ? { variant: String(override.variant) } : {}),
        ...(override?.kind ? { kind: override.kind } : {}),
      },
    });
    return delivered > 0;
  } catch (error) {
    logger.error('PUSH_TRIGGER', `daily reminder send failed for ${toUserId}: ${(error as Error).message}`);
    return false;
  }
}

/**
 * Notify user of a level up (N-11)
 */
export async function notifyLevelUp(
  toUserId: string,
  newLevel: number,
  precomputedLocale?: PushLocale
): Promise<void> {
  const locale = precomputedLocale ?? (await getUserLocale(toUserId));
  return triggerPush(toUserId, 'level_up', {
    title: translatePush(locale, 'levelUp.title', { level: newLevel }),
    body: translatePush(locale, 'levelUp.body', { level: newLevel }),
    imageUrl: mascotImageUrl('celebration'),
    data: {
      type: 'level_up',
      deepLink: '/adventure',
    },
  }, 'both');
}

/**
 * Notify user that a new season has started.
 * `prevSeasonId` is the season that just ended — when the player has a row
 * in that archive, they have rewards to claim and the body switches to the
 * "claim now" copy. When prevSeasonId is omitted, body falls to a generic
 * "new season has begun" line (e.g. season-1 cold-start, no archive yet).
 */
export async function notifySeasonStart(
  toUserId: string,
  newSeasonId: number,
  prevSeasonId?: number,
  precomputedLocale?: PushLocale
): Promise<void> {
  const locale = precomputedLocale ?? (await getUserLocale(toUserId));
  const bodyKey = prevSeasonId ? 'seasonStart.body' : 'seasonStart.bodyNoClaim';
  return triggerPush(toUserId, 'season_start', {
    title: translatePush(locale, 'seasonStart.title', { n: newSeasonId }),
    body: translatePush(locale, bodyKey, prevSeasonId ? { prev: prevSeasonId } : {}),
    imageUrl: mascotImageUrl('celebration'),
    data: {
      type: 'season_start',
      deepLink: '/leaderboard?seasonModal=1',
    },
  }, 'both');
}

/**
 * Notify a user that an admin just granted them the Language Curator role for a
 * language. Localized to the recipient's UI language; the curated language is
 * named by its autonym so it's recognizable in any locale. Deep-links to the
 * curator dashboard. Fire-and-forget — a push failure never blocks the assign.
 *
 * trustTier is accepted for call-site symmetry / future copy, but deliberately
 * NOT surfaced in the body: tier is admin-facing jargon, and the welcome should
 * feel like a celebration, not a permissions report.
 */
export async function notifyCuratorAssigned(
  toUserId: string,
  language: string,
  _trustTier?: number
): Promise<void> {
  const locale = await getUserLocale(toUserId);
  const languageName = LANGUAGE_AUTONYMS[language] ?? language;
  return triggerPush(toUserId, 'curator_assigned', {
    title: translatePush(locale, 'curatorAssigned.title'),
    body: translatePush(locale, 'curatorAssigned.body', { language: languageName }),
    imageUrl: mascotImageUrl('celebration'),
    data: {
      type: 'curator_assigned',
      deepLink: '/curator',
    },
  }, 'both');
}

/**
 * Notify defender that an attacker wrecked part of their Word Tower.
 * Fired server-side after the wreck row is inserted; the defender receives this
 * while offline (applies on next session start). Includes attacker display name
 * and damage (floors lost) so the push tells the full story without requiring
 * the app to fetch context.
 */
export async function notifyWordTowerWreck(
  defenderUserId: string,
  attackerUsername: string,
  damageFloors: number,
  attackerUserId?: string
): Promise<void> {
  const locale = await getUserLocale(defenderUserId);
  return triggerPush(defenderUserId, 'word_tower_wreck', {
    title: translatePush(locale, 'wordTowerWreck.title'),
    body: translatePush(locale, 'wordTowerWreck.body', { attacker: attackerUsername, damage: damageFloors }),
    imageUrl: mascotImageUrl('crying'),
    data: {
      type: 'word_tower_wreck',
      deepLink: '/word-tower',
    },
  }, 'both', attackerUserId);
}

/**
 * Notify a rival that an attacker's tower just exceeded their best height.
 * Fired server-side when a wreck push also results in the attacker surpassing
 * the defender's previous high score. Celebrates the competitive moment.
 */
export async function notifyWordTowerPass(
  rivalUserId: string,
  passerUsername: string,
  passerUserId?: string
): Promise<void> {
  const locale = await getUserLocale(rivalUserId);
  return triggerPush(rivalUserId, 'word_tower_pass', {
    title: translatePush(locale, 'wordTowerPass.title'),
    body: translatePush(locale, 'wordTowerPass.body', { passer: passerUsername }),
    imageUrl: mascotImageUrl('celebration'),
    data: {
      type: 'word_tower_pass',
      deepLink: '/word-tower',
    },
  }, 'both', passerUserId);
}
