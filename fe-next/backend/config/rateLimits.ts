/**
 * Rate limit configuration — per-action limits for Socket.IO events
 *
 * Action -> { points: max events, duration: window in seconds }
 */
export const RATE_LIMITS = {
  wordSubmit: { points: 5, duration: 1, description: 'Word submissions per second' },
  chatMessage: { points: 3, duration: 1, description: 'Chat messages per second' },
  emojiReaction: { points: 2, duration: 1, description: 'Emoji reactions per second' },
  lobbyEmote: { points: 2, duration: 1, description: 'Lobby face emotes per second' },
  roomCreate: { points: 1, duration: 10, description: 'Room creation per 10 seconds' },
  default: { points: 50, duration: 10, description: 'Default socket events per 10 seconds' },
  http: { points: 600, duration: 60, description: 'HTTP API requests per minute (per IP, global). Raised from 100 — modern SPA fan-out (profile/stats/ranked/streak/chest/leaderboard polls) plus carrier-NAT shared IPs were tripping the old 100/min ceiling. Hot endpoints (leaderboard GETs) are skipped entirely in httpRateLimitMiddleware.' },
  connection: { points: 20, duration: 60, description: 'Socket connections per IP per minute' },
} as const;
