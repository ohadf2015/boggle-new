/**
 * Notification Service
 * Sends game event notifications to Discord webhooks and Telegram bots
 * Fire-and-forget design - never blocks game flow
 */

 
import logger from '../utils/logger';

// Interfaces
export interface RateLimiter {
  tokens: number;
  lastRefill: number;
  refillRate: number;
  refillInterval: number;
}

export interface DiscordEmbedField {
  name: string;
  value: string;
  inline: boolean;
}

export interface DiscordEmbed {
  title: string;
  color: number;
  fields: DiscordEmbedField[];
  url?: string;
  timestamp: string;
}

export interface RoomEventData {
  roomName?: string;
  gameCode: string;
  language?: string;
  hostUsername?: string;
  isRanked?: boolean;
  isAuthenticated?: boolean;
  playerCount?: number;
  timerSeconds?: number;
  username?: string;
}

export interface PlayerData {
  username?: string;
  isAuthenticated?: boolean;
}

type NotificationEventType = 'room_created' | 'player_joined' | 'game_started';
type NotificationService = 'discord' | 'telegram';

// Configuration from environment
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const NOTIFICATIONS_ENABLED = process.env.NOTIFICATIONS_ENABLED === 'true';

// Rate limiting state
const rateLimiters: Record<NotificationService, RateLimiter> = {
  discord: { tokens: 30, lastRefill: Date.now(), refillRate: 30, refillInterval: 60000 },
  telegram: { tokens: 20, lastRefill: Date.now(), refillRate: 20, refillInterval: 60000 }
};

/**
 * Check if notifications are enabled
 */
export function isNotificationsEnabled(): boolean {
  return NOTIFICATIONS_ENABLED;
}

/**
 * Check if Discord is configured
 */
export function isDiscordConfigured(): boolean {
  return !!DISCORD_WEBHOOK_URL;
}

/**
 * Check if Telegram is configured
 */
export function isTelegramConfigured(): boolean {
  return !!(TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID);
}

/**
 * Check and consume rate limit token
 */
function checkRateLimit(service: NotificationService): boolean {
  const limiter = rateLimiters[service];
  if (!limiter) return false;

  const now = Date.now();

  // Refill tokens if interval has passed
  const elapsed = now - limiter.lastRefill;
  if (elapsed >= limiter.refillInterval) {
    limiter.tokens = limiter.refillRate;
    limiter.lastRefill = now;
  }

  // Check if we have tokens
  if (limiter.tokens > 0) {
    limiter.tokens--;
    return true;
  }

  return false;
}

/**
 * Get language display name with emoji
 */
function getLanguageDisplay(lang?: string): string {
  const languages: Record<string, string> = {
    en: 'English',
    he: 'Hebrew',
    sv: 'Swedish',
    ja: 'Japanese',
    es: 'Spanish'
  };
  return languages[lang || 'en'] || lang || 'en';
}

/**
 * Format Discord embed for an event
 */
function formatDiscordEmbed(eventType: NotificationEventType, data: RoomEventData): DiscordEmbed | null {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.lexiclash.live';
  const timestamp = new Date().toISOString();

  const embeds: Record<NotificationEventType, DiscordEmbed> = {
    room_created: {
      title: 'New Room Created',
      color: 0x00FF00, // Green
      fields: [
        { name: 'Room', value: data.roomName || data.gameCode, inline: true },
        { name: 'Code', value: `\`${data.gameCode}\``, inline: true },
        { name: 'Language', value: getLanguageDisplay(data.language), inline: true },
        { name: 'Host', value: data.hostUsername || 'Host', inline: true },
        { name: 'Type', value: data.isRanked ? 'Ranked' : 'Casual', inline: true },
        { name: 'Status', value: data.isAuthenticated ? 'Registered' : 'Guest', inline: true }
      ],
      url: `${baseUrl}/en/join/${data.gameCode}`,
      timestamp
    },
    player_joined: {
      title: 'Player Joined',
      color: 0x0099FF, // Blue
      fields: [
        { name: 'Room', value: data.roomName || data.gameCode, inline: true },
        { name: 'Player', value: data.username || 'Player', inline: true },
        { name: 'Players', value: `${data.playerCount}`, inline: true },
        { name: 'Status', value: data.isAuthenticated ? 'Registered' : 'Guest', inline: true }
      ],
      timestamp
    },
    game_started: {
      title: 'Game Started',
      color: 0xFFD700, // Gold
      fields: [
        { name: 'Room', value: data.roomName || data.gameCode, inline: true },
        { name: 'Players', value: `${data.playerCount}`, inline: true },
        { name: 'Duration', value: `${data.timerSeconds}s`, inline: true },
        { name: 'Language', value: getLanguageDisplay(data.language), inline: true },
        { name: 'Type', value: data.isRanked ? 'Ranked' : 'Casual', inline: true }
      ],
      timestamp
    }
  };

  return embeds[eventType] || null;
}

/**
 * Escape special characters for Telegram Markdown
 */
function escapeTelegramMarkdown(text?: string): string {
  if (!text) return '';
  return String(text).replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
}

/**
 * Format Telegram message for an event
 */
function formatTelegramMessage(eventType: NotificationEventType, data: RoomEventData): string | null {
  const messages: Record<NotificationEventType, string> = {
    room_created: [
      `*New Room Created*`,
      `Room: ${escapeTelegramMarkdown(data.roomName || data.gameCode)}`,
      `Code: \`${data.gameCode}\``,
      `Language: ${getLanguageDisplay(data.language)}`,
      `Host: ${escapeTelegramMarkdown(data.hostUsername || 'Host')} \\(${data.isAuthenticated ? 'Registered' : 'Guest'}\\)`,
      `Type: ${data.isRanked ? 'Ranked' : 'Casual'}`
    ].join('\n'),

    player_joined: [
      `*Player Joined*`,
      `Room: ${escapeTelegramMarkdown(data.roomName || data.gameCode)}`,
      `Player: ${escapeTelegramMarkdown(data.username || 'Player')} \\(${data.isAuthenticated ? 'Registered' : 'Guest'}\\)`,
      `Total Players: ${data.playerCount}`
    ].join('\n'),

    game_started: [
      `*Game Started*`,
      `Room: ${escapeTelegramMarkdown(data.roomName || data.gameCode)}`,
      `Players: ${data.playerCount}`,
      `Duration: ${data.timerSeconds}s`,
      `Language: ${getLanguageDisplay(data.language)}`,
      `Type: ${data.isRanked ? 'Ranked' : 'Casual'}`
    ].join('\n')
  };

  return messages[eventType] || null;
}

/**
 * Send notification to Discord webhook
 */
async function sendDiscordNotification(embed: DiscordEmbed): Promise<void> {
  if (!embed || !DISCORD_WEBHOOK_URL) return;

  try {
    const response = await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [embed]
      }),
      signal: AbortSignal.timeout(5000)
    });

    if (!response.ok) {
      logger.warn('NOTIFICATION', `Discord webhook failed: ${response.status}`);
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error('NOTIFICATION', `Discord error: ${errorMessage}`);
  }
}

/**
 * Send notification to Telegram bot
 */
async function sendTelegramNotification(message: string): Promise<void> {
  if (!message || !TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;

  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'MarkdownV2'
      }),
      signal: AbortSignal.timeout(5000)
    });

    if (!response.ok) {
      const errorBody = await response.text();
      logger.warn('NOTIFICATION', `Telegram API failed: ${response.status} - ${errorBody}`);
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error('NOTIFICATION', `Telegram error: ${errorMessage}`);
  }
}

/**
 * Ops/infra alerts (memory pressure, degraded boot, crashes) → Telegram.
 *
 * Deliberately separate from game-event notifications:
 *  - NOT gated by NOTIFICATIONS_ENABLED (that flag mutes game-event spam; infra
 *    alerts must fire whenever a chat is configured).
 *  - Plain text (no MarkdownV2) so RSS numbers / dots / parens don't need escaping.
 *  - Storm guard: at most one alert per OPS_ALERT_MIN_INTERVAL_MS so an
 *    uncaught-exception loop can't flood the chat (matched to the watchdog's
 *    30s tick so a warn→critical escalation is never dropped).
 */
const OPS_ALERT_MIN_INTERVAL_MS = 15_000;
let lastOpsAlertAt = 0;

export async function sendOpsAlert(text: string): Promise<void> {
  if (!text || !isTelegramConfigured()) return;
  const now = Date.now();
  if (now - lastOpsAlertAt < OPS_ALERT_MIN_INTERVAL_MS) return; // storm guard
  lastOpsAlertAt = now;
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text, disable_web_page_preview: true }),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      logger.warn('OPS_ALERT', `Telegram ops alert failed: ${response.status}`);
    }
  } catch (err) {
    logger.error('OPS_ALERT', `Telegram ops alert error: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/** Test-only: reset the storm-guard clock so cases don't bleed into each other. */
export function __resetOpsAlertThrottle(): void {
  lastOpsAlertAt = 0;
}

/**
 * Send notification to all configured channels
 */
async function sendNotification(eventType: NotificationEventType, data: RoomEventData): Promise<void> {
  if (!isNotificationsEnabled()) {
    return;
  }

  const promises: Promise<void>[] = [];

  // Discord
  if (isDiscordConfigured() && checkRateLimit('discord')) {
    const embed = formatDiscordEmbed(eventType, data);
    if (embed) {
      promises.push(
        sendDiscordNotification(embed).catch(err =>
          logger.error('NOTIFICATION', `Discord failed: ${err.message}`)
        )
      );
    }
  }

  // Telegram
  if (isTelegramConfigured() && checkRateLimit('telegram')) {
    const message = formatTelegramMessage(eventType, data);
    if (message) {
      promises.push(
        sendTelegramNotification(message).catch(err =>
          logger.error('NOTIFICATION', `Telegram failed: ${err.message}`)
        )
      );
    }
  }

  // Wait for all but don't throw
  await Promise.allSettled(promises);
}

/**
 * Notify that a room was created
 */
export async function notifyRoomCreated(data: RoomEventData): Promise<void> {
  return sendNotification('room_created', data);
}

/**
 * Notify that a player joined
 */
export async function notifyPlayerJoined(roomData: RoomEventData, playerData: PlayerData): Promise<void> {
  return sendNotification('player_joined', {
    ...roomData,
    username: playerData.username,
    isAuthenticated: playerData.isAuthenticated
  });
}

/**
 * Notify that a game started
 */
export async function notifyGameStarted(data: RoomEventData): Promise<void> {
  return sendNotification('game_started', data);
}

