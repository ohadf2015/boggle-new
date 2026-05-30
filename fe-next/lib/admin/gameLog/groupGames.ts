/**
 * Group per-player analytics rows into one row per GAME.
 *
 * The admin game log fetches `analytics_events` rows (game_started /
 * game_completed / game_abandoned) — one row per player per lifecycle event.
 * This pure module collapses them into game GROUPS so the founder can
 * investigate a game as a single unit (all players, host acquisition, status),
 * then expand to the per-player detail.
 *
 * Grouping key (verified against live data 2026-05-30):
 *  - Multiplayer (is_multiplayer) → `mp:{gameCode}:{YYYY-MM-DD}`. Date-scoped
 *    because 6-char room codes recycle across days.
 *  - Otherwise (solo/practice/…) → `solo:{event id}`. Each solo play is its own
 *    group — solo plays often share a puzzle/seed gameCode, so we must NOT
 *    collapse them by code.
 *
 * Per-player merge: a player's game_started + terminal event collapse into one
 * GamePlayer keyed by player_id ?? guest_session_id. Host role + utm_source live
 * on game_started in real data, so we pull host info from whichever row has it.
 */
import type { UnifiedGame, GameProfile } from '@/components/admin/today-games/types';
import { bucketForMode } from './modeBuckets';
import {
  classifyAcquisition,
  type AcquisitionTag,
} from '@/components/admin/today-games/utils/classifyAcquisition';

export type GameStatus = 'completed' | 'abandoned' | 'errored';

export interface GamePlayer {
  /** Stable identity within the group: player_id ?? guest_session_id ?? event id. */
  key: string;
  playerId: string | null;
  guestSessionId: string | null;
  isGuest: boolean;
  displayName: string;
  profile: GameProfile | null;
  isHost: boolean;
  role: string | null;
  score: number;
  wordCount: number;
  isWinner: boolean | null;
  country: string | null;
  platform: string | null;
  deviceType: string | null;
  os: string | null;
  browser: string | null;
  userAgent: string | null;
  acquisition: AcquisitionTag;
  status: GameStatus;
  errorReason: string | null;
  /** Number of raw analytics rows merged into this player. */
  eventCount: number;
  firstSeen: string;
}

export interface GameGroup {
  key: string;
  gameCode: string | null;
  isMultiplayer: boolean;
  isRanked: boolean;
  modeRaw: string;
  typeBucket: string;
  language: string;
  createdAt: string;
  endedAt: string | null;
  status: GameStatus;
  host: GamePlayer | null;
  hostAcquisition: AcquisitionTag | null;
  players: GamePlayer[];
  playerCount: number;
  botCount: number | null;
  topScore: number;
  totalWords: number;
  errorReasons: string[];
}

const TERMINAL = new Set(['game_completed', 'game_abandoned']);

function dayOf(iso: string): string {
  // YYYY-MM-DD in UTC. created_at is always an ISO/timestamptz string.
  return iso.slice(0, 10);
}

function isMpRow(g: UnifiedGame): boolean {
  return Boolean(g.is_multiplayer && g.game_code && g.game_code !== 'solo');
}

function playerKeyFor(g: UnifiedGame): string {
  return g.player_id ?? g.guest_session_id ?? g.id;
}

function shortGuest(sessionId: string | null): string {
  if (!sessionId) return 'Guest';
  // guest_1780164352053_09js4zd6s → Guest 09js4zd6s (last segment)
  const seg = sessionId.split('_').filter(Boolean).pop() ?? sessionId;
  return `Guest ${seg.slice(0, 6)}`;
}

/** A player is authed iff a player_id resolved (real account) — never a guest then. */
function isGuestPlayer(g: UnifiedGame): boolean {
  return !g.player_id;
}

function displayNameFor(g: UnifiedGame): string {
  if (g.profiles?.username) return g.profiles.username;
  if (g.guest_name) return g.guest_name;
  // Authed user whose profile join missed → a Player handle, NOT "Guest".
  if (g.player_id) return `Player ${g.player_id.slice(0, 8)}`;
  return shortGuest(g.guest_session_id);
}

function errorReasonOf(g: UnifiedGame): string | null {
  return g.error_reason ?? null;
}

/** Rank for choosing which event's stats win: terminal > started. */
function eventRank(eventType: string | undefined): number {
  if (eventType === 'game_completed') return 3;
  if (eventType === 'game_abandoned') return 2;
  return 1; // game_started / unknown
}

interface PlayerAccumulator {
  key: string;
  rows: UnifiedGame[];
  best: UnifiedGame; // highest-rank row (terminal preferred) for stats
  firstSeen: string;
}

function buildPlayer(acc: PlayerAccumulator): GamePlayer {
  const rows = acc.rows;
  const best = acc.best;
  // Host info / utm can live on a non-terminal (started) row — scan all rows.
  const hostRow = rows.find((r) => (r.role ?? '').toLowerCase() === 'host');
  const isHost = Boolean(hostRow);
  const role = hostRow?.role ?? best.role ?? rows.find((r) => r.role)?.role ?? null;

  const attribRow =
    rows.find((r) => r.utm_source || r.referrer_source) ?? best;
  const acquisition = classifyAcquisition({
    utm_source: attribRow.utm_source,
    utm_medium: attribRow.utm_medium,
    utm_campaign: attribRow.utm_campaign,
    referrer_source: attribRow.referrer_source,
    is_guest: isGuestPlayer(best),
  });

  const errorReason =
    rows.map(errorReasonOf).find((r): r is string => Boolean(r)) ?? null;
  const hasCompleted = rows.some((r) => r.event_type === 'game_completed');
  const status: GameStatus = errorReason
    ? 'errored'
    : hasCompleted
      ? 'completed'
      : 'abandoned';

  return {
    key: acc.key,
    playerId: best.player_id,
    guestSessionId: best.guest_session_id,
    isGuest: isGuestPlayer(best),
    displayName: displayNameFor(best),
    profile: best.profiles,
    isHost,
    role,
    score: best.score ?? 0,
    wordCount: best.word_count ?? 0,
    isWinner: best.is_winner ?? null,
    country: best.country ?? null,
    platform: best.platform ?? null,
    deviceType: best.device_type ?? null,
    os: best.os ?? null,
    browser: best.browser ?? null,
    userAgent: best.user_agent ?? null,
    acquisition,
    status,
    errorReason,
    eventCount: rows.length,
    firstSeen: acc.firstSeen,
  };
}

function buildGroup(key: string, rows: UnifiedGame[]): GameGroup {
  // Merge rows into players.
  const byPlayer = new Map<string, PlayerAccumulator>();
  for (const r of rows) {
    const pk = playerKeyFor(r);
    const existing = byPlayer.get(pk);
    if (!existing) {
      byPlayer.set(pk, { key: pk, rows: [r], best: r, firstSeen: r.created_at });
      continue;
    }
    existing.rows.push(r);
    if (r.created_at < existing.firstSeen) existing.firstSeen = r.created_at;
    if (eventRank(r.event_type) >= eventRank(existing.best.event_type)) {
      existing.best = r;
    }
  }

  const players = [...byPlayer.values()]
    .map(buildPlayer)
    .sort((a, b) => {
      if (a.isHost !== b.isHost) return a.isHost ? -1 : 1; // host first
      return b.score - a.score;
    });

  const sample = rows[0];
  const isMultiplayer = rows.some((r) => r.is_multiplayer) ?? false;
  const modeRaw = rows.find((r) => r.mode && r.mode !== 'unknown')?.mode ?? sample.mode;

  const createdAt = rows.reduce(
    (min, r) => (r.created_at < min ? r.created_at : min),
    rows[0].created_at,
  );
  const terminalRows = rows.filter((r) => TERMINAL.has(r.event_type ?? ''));
  const endedAt =
    terminalRows.length > 0
      ? terminalRows.reduce((max, r) => (r.created_at > max ? r.created_at : max), terminalRows[0].created_at)
      : null;

  const errorReasons = [
    ...new Set(rows.map(errorReasonOf).filter((r): r is string => Boolean(r))),
  ];
  const hasCompleted = rows.some((r) => r.event_type === 'game_completed');
  const status: GameStatus = errorReasons.length > 0
    ? 'errored'
    : hasCompleted
      ? 'completed'
      : 'abandoned';

  const host = players.find((p) => p.isHost) ?? players[0] ?? null;
  const hostAcquisition = host?.acquisition ?? null;

  const botCounts = rows.map((r) => r.bot_count).filter((n): n is number => typeof n === 'number');

  return {
    key,
    gameCode: isMultiplayer ? sample.game_code : null,
    isMultiplayer,
    isRanked: rows.some((r) => r.is_ranked),
    modeRaw,
    typeBucket: bucketForMode(modeRaw),
    language: rows.find((r) => r.language)?.language ?? 'en',
    createdAt,
    endedAt,
    status,
    host,
    hostAcquisition,
    players,
    playerCount: players.length,
    botCount: botCounts.length > 0 ? Math.max(...botCounts) : null,
    topScore: players.reduce((m, p) => Math.max(m, p.score), 0),
    totalWords: players.reduce((s, p) => s + p.wordCount, 0),
    errorReasons,
  };
}

export function groupGames(rows: UnifiedGame[]): GameGroup[] {
  const byGroup = new Map<string, UnifiedGame[]>();
  for (const r of rows) {
    const mp = isMpRow(r);
    // Solo plays have no reliable per-play correlation id (session_id spans a whole
    // session; gameCode is often shared or absent; solo completions OUTNUMBER solo
    // starts in real data). So a solo play = one TERMINAL event; standalone solo
    // game_started rows are lifecycle noise and are dropped to avoid phantom
    // "abandoned" duplicates. MP rooms still group by gameCode+day, where a
    // started-without-terminal correctly reads as an abandoned room.
    if (!mp && !TERMINAL.has(r.event_type ?? '')) continue;
    const k = mp ? `mp:${r.game_code}:${dayOf(r.created_at)}` : `solo:${r.id}`;
    const arr = byGroup.get(k);
    if (arr) arr.push(r);
    else byGroup.set(k, [r]);
  }
  return [...byGroup.entries()]
    .map(([k, gs]) => buildGroup(k, gs))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
}
