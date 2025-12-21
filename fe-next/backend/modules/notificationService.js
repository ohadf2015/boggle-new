/**
 * Notification Service
 * Sends game event notifications to Discord webhooks and Telegram bots
 * Fire-and-forget design - never blocks game flow
 */

const logger = require('../utils/logger');

// Configuration from environment
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const NOTIFICATIONS_ENABLED = process.env.NOTIFICATIONS_ENABLED === 'true';

// Rate limiting state
const rateLimiters = {
  discord: { tokens: 30, lastRefill: Date.now(), refillRate: 30, refillInterval: 60000 },
  telegram: { tokens: 20, lastRefill: Date.now(), refillRate: 20, refillInterval: 60000 }
};

/**
 * Check if notifications are enabled
 */
function isNotificationsEnabled() {
  return NOTIFICATIONS_ENABLED;
}

/**
 * Check if Discord is configured
 */
function isDiscordConfigured() {
  return !!DISCORD_WEBHOOK_URL;
}

/**
 * Check if Telegram is configured
 */
function isTelegramConfigured() {
  return !!(TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID);
}

/**
 * Check and consume rate limit token
 * @param {string} service - 'discord' or 'telegram'
 * @returns {boolean} - true if allowed, false if rate limited
 */
function checkRateLimit(service) {
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
function getLanguageDisplay(lang) {
  const languages = {
    en: 'English',
    he: 'Hebrew',
    sv: 'Swedish',
    ja: 'Japanese'
  };
  return languages[lang] || lang;
}

/**
 * Format Discord embed for an event
 */
function formatDiscordEmbed(eventType, data) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.lexiclash.live';
  const timestamp = new Date().toISOString();

  const embeds = {
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
function escapeTelegramMarkdown(text) {
  if (!text) return '';
  return String(text).replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
}

/**
 * Format Telegram message for an event
 */
function formatTelegramMessage(eventType, data) {
  const messages = {
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
async function sendDiscordNotification(embed) {
  if (!embed || !DISCORD_WEBHOOK_URL) return;

  try {
    const response = await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [embed]
      })
    });

    if (!response.ok) {
      logger.warn('NOTIFICATION', `Discord webhook failed: ${response.status}`);
    }
  } catch (err) {
    logger.error('NOTIFICATION', `Discord error: ${err.message}`);
  }
}

/**
 * Send notification to Telegram bot
 */
async function sendTelegramNotification(message) {
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
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      logger.warn('NOTIFICATION', `Telegram API failed: ${response.status} - ${errorBody}`);
    }
  } catch (err) {
    logger.error('NOTIFICATION', `Telegram error: ${err.message}`);
  }
}

/**
 * Send notification to all configured channels
 * @param {string} eventType - 'room_created', 'player_joined', 'game_started'
 * @param {Object} data - Event data
 */
async function sendNotification(eventType, data) {
  if (!isNotificationsEnabled()) {
    return;
  }

  const promises = [];

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
 * @param {Object} data - Room data
 */
async function notifyRoomCreated(data) {
  return sendNotification('room_created', data);
}

/**
 * Notify that a player joined
 * @param {Object} roomData - Room data
 * @param {Object} playerData - Player data
 */
async function notifyPlayerJoined(roomData, playerData) {
  return sendNotification('player_joined', {
    ...roomData,
    username: playerData.username,
    isAuthenticated: playerData.isAuthenticated
  });
}

/**
 * Notify that a game started
 * @param {Object} data - Game data
 */
async function notifyGameStarted(data) {
  return sendNotification('game_started', data);
}

module.exports = {
  isNotificationsEnabled,
  isDiscordConfigured,
  isTelegramConfigured,
  notifyRoomCreated,
  notifyPlayerJoined,
  notifyGameStarted
};
