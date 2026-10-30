/**
 * Pure row shaping for the daily board: server entries → rows, per-mode merges,
 * the friends view, and the viewer's readout. No React, no I/O.
 */
import type { MergedLeaderboardEntry } from '@/lib/daily/mergeDailyLeaderboard';
import type { DailyModeId } from '@/lib/dailyModes';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';
import { participantKey } from './leaderboardLive';
import type {
  AllTimeParticipant,
  DailyParticipant,
  SeasonParticipant,
  ViewerIdentity,
} from './leaderboardTypes';

/** Mode dot colours, matching each daily card's accent on the hub. Full class strings for Tailwind. */
export const MODE_DOT: Record<DailyModeId, string> = {
  'word-hunt': 'bg-neo-orange',
  'word-wheel': 'bg-neo-yellow',
  'word-tower': 'bg-neo-cyan',
  connections: 'bg-neo-purple',
};

export function fromMergedEntries(entries: MergedLeaderboardEntry[]): DailyParticipant[] {
  return entries.map((e) => ({
    player_id: null,
    guest_fingerprint: null,
    display_name: e.name,
    avatar_emoji: e.avatarEmoji ?? '',
    avatar_color: e.avatarColor ?? '',
    avatar_image: e.avatarImage,
    custom_avatar: (e.customAvatar as CustomAvatarConfig | null) ?? null,
    country_code: e.countryCode ?? null,
    score: e.total,
    word_count: 0,
    time_seconds: 0,
    completed_at: '',
    rank_position: e.rank,
    row_key: e.key,
    by_mode: e.byMode,
    played_modes: e.playedModes,
    tower_height_m: e.towerHeightM,
    is_you: e.isYou || undefined,
    is_friend: e.isFriend || undefined,
  }));
}

export function isViewer(
  p: { is_you?: boolean; player_id: string | null; guest_fingerprint: string | null },
  viewer: ViewerIdentity,
): boolean {
  if (p.is_you) return true;
  if (viewer.playerId && p.player_id === viewer.playerId) return true;
  if (viewer.guestFingerprint && p.guest_fingerprint === viewer.guestFingerprint) return true;
  return false;
}

/** Friends plus the viewer, ranked 1..N among themselves. Empty when no friend is on the board. */
export function friendsBoard(
  rows: DailyParticipant[],
  isFriend: (p: DailyParticipant) => boolean,
  viewer: ViewerIdentity,
): DailyParticipant[] {
  if (!rows.some(isFriend)) return [];
  return rows
    .filter((p) => isFriend(p) || isViewer(p, viewer))
    .map((p, i) => ({ ...p, rank_position: i + 1 }));
}

/** Earlier wins; a missing time sorts last; then a stable key so polls never reshuffle ties. */
function tiebreak(aTime: string, bTime: string, aKey: string, bKey: string): number {
  if (aTime !== bTime) {
    if (!aTime) return 1;
    if (!bTime) return -1;
    return aTime < bTime ? -1 : 1;
  }
  return aKey < bKey ? -1 : aKey > bKey ? 1 : 0;
}

const keyOf = (p: Parameters<typeof participantKey>[0] & { display_name?: string }) =>
  participantKey(p) ?? p.display_name ?? '';

/** Per-mode board rows (hunt and/or wheel) merged per player and ranked. */
export function mergeTodayRows(huntRows: DailyParticipant[], wheelRows: DailyParticipant[]): DailyParticipant[] {
  const merged = new Map<string, DailyParticipant>();

  for (const h of huntRows) {
    const k = participantKey(h);
    if (!k) continue;
    const hs = h.efficiency_score ?? h.score ?? 0;
    merged.set(k, { ...h, score: hs, word_hunt_score: hs, word_wheel_score: 0 });
  }

  for (const w of wheelRows) {
    const k = participantKey(w);
    if (!k) continue;
    const ws = w.score ?? 0;
    const existing = merged.get(k);
    if (existing) {
      merged.set(k, {
        ...existing,
        score: (existing.score ?? 0) + ws,
        word_wheel_score: ws,
        completed_at: (existing.completed_at || '') > (w.completed_at || '') ? existing.completed_at : w.completed_at,
        avatar_image: existing.avatar_image ?? w.avatar_image ?? null,
        custom_avatar: existing.custom_avatar ?? w.custom_avatar ?? null,
        profile_picture_url: existing.profile_picture_url ?? w.profile_picture_url ?? null,
        country_code: existing.country_code ?? w.country_code ?? null,
        language: existing.language ?? w.language ?? null,
      });
    } else {
      merged.set(k, {
        ...w,
        score: ws,
        solved: undefined,
        attempts_used: undefined,
        efficiency_score: undefined,
        word_hunt_score: 0,
        word_wheel_score: ws,
      });
    }
  }

  return Array.from(merged.values())
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || tiebreak(a.completed_at, b.completed_at, keyOf(a), keyOf(b)))
    .map((p, i) => ({ ...p, rank_position: i + 1 }));
}

export function mergeAllTimeRows(huntRows: AllTimeParticipant[], wheelRows: AllTimeParticipant[]): AllTimeParticipant[] {
  const merged = new Map<string, AllTimeParticipant>();
  for (const h of huntRows) {
    const k = participantKey(h);
    if (k) merged.set(k, { ...h });
  }
  for (const w of wheelRows) {
    const k = participantKey(w);
    if (!k) continue;
    const e = merged.get(k);
    merged.set(k, e ? {
      ...e,
      total_efficiency_score: (e.total_efficiency_score || 0) + (w.total_efficiency_score || 0),
      total_games: (e.total_games || 0) + (w.total_games || 0),
      games_won: (e.games_won || 0) + (w.games_won || 0),
      best_efficiency: Math.max(e.best_efficiency || 0, w.best_efficiency || 0),
      last_played_at: (e.last_played_at || '') > (w.last_played_at || '') ? e.last_played_at : w.last_played_at,
      avatar_image: e.avatar_image ?? w.avatar_image ?? null,
      custom_avatar: e.custom_avatar ?? w.custom_avatar ?? null,
      profile_picture_url: e.profile_picture_url ?? w.profile_picture_url ?? null,
      country_code: e.country_code ?? w.country_code ?? null,
    } : { ...w });
  }
  return Array.from(merged.values())
    .sort((a, b) => (b.total_efficiency_score || 0) - (a.total_efficiency_score || 0)
      || (b.games_won || 0) - (a.games_won || 0)
      || tiebreak('', '', keyOf(a), keyOf(b)))
    .map((p, i) => ({ ...p, rank_position: i + 1 }));
}

type SeasonRow = Omit<SeasonParticipant, 'word_hunt_score' | 'word_wheel_score'>;

export function mergeSeasonRows(huntRows: SeasonRow[], wheelRows: SeasonRow[]): SeasonParticipant[] {
  const merged = new Map<string, SeasonParticipant>();
  for (const h of huntRows) {
    if (!h.player_id) continue;
    merged.set(h.player_id, {
      ...h,
      season_score: h.season_score || 0,
      days_played: h.days_played || 0,
      solves: h.solves || 0,
      languages: h.languages || [],
      word_hunt_score: h.season_score || 0,
      word_wheel_score: 0,
    });
  }
  for (const w of wheelRows) {
    if (!w.player_id) continue;
    const e = merged.get(w.player_id);
    const ws = w.season_score || 0;
    merged.set(w.player_id, e ? {
      ...e,
      season_score: e.season_score + ws,
      days_played: e.days_played + (w.days_played || 0),
      languages: Array.from(new Set([...e.languages, ...(w.languages || [])])),
      last_played_at: (e.last_played_at || '') > (w.last_played_at || '') ? e.last_played_at : (w.last_played_at ?? null),
      word_wheel_score: ws,
      avatar_image: e.avatar_image ?? w.avatar_image ?? null,
      custom_avatar: e.custom_avatar ?? w.custom_avatar ?? null,
      profile_picture_url: e.profile_picture_url ?? w.profile_picture_url ?? null,
      country_code: e.country_code ?? w.country_code ?? null,
    } : {
      ...w,
      season_score: ws,
      days_played: w.days_played || 0,
      solves: 0,
      languages: w.languages || [],
      word_hunt_score: 0,
      word_wheel_score: ws,
    });
  }
  return Array.from(merged.values())
    .sort((a, b) => b.season_score - a.season_score
      || b.solves - a.solves
      || tiebreak(a.last_played_at || '', b.last_played_at || '', a.player_id, b.player_id))
    .map((p, i) => ({ ...p, rank_position: i + 1 }));
}

export interface YouReadout {
  rank: number;
  total: number;
  topPercent: number;
}

/** "#7 of 42 · top 17%". Null on a board of one — being ahead of nobody says nothing. */
export function youReadout(rank: number | null | undefined, total: number): YouReadout | null {
  if (!rank || total < 2) return null;
  const size = Math.max(total, rank);
  return { rank, total: size, topPercent: Math.max(1, Math.ceil((rank / size) * 100)) };
}
