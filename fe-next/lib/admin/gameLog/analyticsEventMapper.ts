/**
 * Pure mapper: an `analytics_events` (event_type='game_completed') row -> UnifiedGame.
 *
 * Why this exists: analytics_events is the ONLY source that captures every play,
 * including non-registered players, with game mode + attribution + device. The
 * per-product result tables (game_results, etc.) miss the bulk of anonymous plays.
 * This mapper turns the generic event row into the admin game-log shape.
 */
import type { UnifiedGame, GameProfile } from '@/components/admin/today-games/types';
import { parseUserAgent } from './parseUserAgent';

export interface AnalyticsEventRow {
  id: string;
  event_type: string;
  player_id: string | null;
  session_id: string | null;
  country_code: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  referrer: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null;
}

function bool(v: unknown): boolean | null {
  return typeof v === 'boolean' ? v : null;
}

export function mapAnalyticsEventToGame(
  row: AnalyticsEventRow,
  profile: GameProfile | null = null,
): UnifiedGame {
  const meta = row.metadata ?? {};

  const playerId = row.player_id ?? str(meta.userId);
  const isGuestMeta = bool(meta.isGuest);
  const is_guest = isGuestMeta ?? playerId == null;

  const mode = str(meta.gameMode) ?? str(meta.mode) ?? 'unknown';
  const isMultiplayer = bool(meta.isMultiplayer) ?? false;
  const ua = str(meta.user_agent);
  const { device_type, browser, os } = parseUserAgent(ua);

  const guestName = str(meta.guest_name);

  return {
    id: row.id,
    event_type: row.event_type,
    player_id: playerId,
    guest_session_id: row.session_id,
    game_code: str(meta.gameCode) ?? 'solo',
    score: num(meta.score) ?? 0,
    word_count: num(meta.wordCount) ?? 0,
    longest_word: null,
    placement: null,
    is_ranked: false,
    is_guest,
    mode,
    game_mode: mode,
    language: str(meta.language) ?? 'en',
    time_played: num(meta.durationSec) ?? 0,
    created_at: row.created_at,
    completed_at: row.created_at,
    profiles: profile,
    // attribution
    country: row.country_code,
    referrer_source: row.referrer,
    utm_source: row.utm_source,
    utm_medium: row.utm_medium,
    utm_campaign: row.utm_campaign,
    // multiplayer detail
    is_multiplayer: isMultiplayer,
    player_count: num(meta.playerCount),
    bot_count: num(meta.botCount),
    is_winner: bool(meta.isWinner),
    role: str(meta.role),
    // device
    device_type: device_type,
    browser,
    os,
    user_agent: ua,
    guest_name: guestName,
    platform: str(meta.platform),
    error_reason: str(meta.error_reason) ?? str(meta.reason),
    source: 'analytics',
  };
}
