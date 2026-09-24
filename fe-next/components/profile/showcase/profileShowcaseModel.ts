/**
 * Pure view-model for the profile "showcase stage" (own /profile and public
 * /u/[username]). No React, no fetching — every rule the stage renders is
 * decided here so it is unit-tested once and shared by both routes and the
 * /avatar-test capture harness.
 */
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';
import { getPartRarity, RARITY_ORDER, type VisualTier } from '@/lib/avatar/rarity';
import { LEVEL_UNLOCK_LADDER, normalizeLevel, type LevelUnlock } from '@/lib/avatar/unlocks';
import type { ProfileViewSource } from '@/lib/avatar/avatarTelemetry';
import { isHallOfFameAchievement } from '@/utils/achievementTiers';

// ── Title ──

export type ProfileTitleId = 'rookie' | 'hunter' | 'wordsmith' | 'lexicon' | 'legend';

/** Level bands tuned to prod: median L1, p75 L2, p90 L7, p99 ~L30. */
const TITLE_BANDS: ReadonlyArray<readonly [number, ProfileTitleId]> = [
  [30, 'legend'],
  [15, 'lexicon'],
  [7, 'wordsmith'],
  [3, 'hunter'],
];

export function getProfileTitleId(level: number): ProfileTitleId {
  const lv = normalizeLevel(level);
  for (const [min, id] of TITLE_BANDS) if (lv >= min) return id;
  return 'rookie';
}

// ── Stage theme (backdrop follows the rarest thing you wear) ──

export interface StageTheme {
  rarity: VisualTier;
  /** Crest stars, 1 (common) → 4 (legendary). */
  stars: number;
  /** Backdrop gradient top / bottom. */
  from: string;
  to: string;
  /** Burst / pattern / crest color. */
  accent: string;
  /** Second pattern color (flame tips, bubbles). */
  accent2: string;
  pattern: 'dots' | 'rays' | 'bubbles' | 'flames';
}

const STAGE_THEMES: Record<VisualTier, StageTheme> = {
  // Hues follow the art's own rarity frames (epic = purple ring, legendary = gold ring).
  common: { rarity: 'common', stars: 1, from: '#1d5fa0', to: '#0f2c52', accent: '#00ffff', accent2: '#bfff00', pattern: 'dots' },
  rare: { rarity: 'rare', stars: 2, from: '#12a4a8', to: '#0b3f5e', accent: '#e2e8f0', accent2: '#00ffff', pattern: 'rays' },
  epic: { rarity: 'epic', stars: 3, from: '#8b3fe8', to: '#2c0d63', accent: '#e9d5ff', accent2: '#ff66cc', pattern: 'bubbles' },
  legendary: { rarity: 'legendary', stars: 4, from: '#e0213f', to: '#5c0617', accent: '#ffd700', accent2: '#ff8a00', pattern: 'flames' },
};

export function getStageTheme(rarity: VisualTier): StageTheme {
  return STAGE_THEMES[rarity] ?? STAGE_THEMES.common;
}

// ── Rarest equipped item ──

export interface EquippedHighlight {
  /** Rarity-table category (also the config key for these fields). */
  category: 'accessory' | 'hair' | 'eyes' | 'mouth' | 'base' | 'facialHair' | 'eyebrows';
  partId: string;
  rarity: VisualTier;
}

/** Tie-break order: the most visible slot wins. */
const HIGHLIGHT_SLOTS: readonly EquippedHighlight['category'][] = [
  'accessory', 'hair', 'eyes', 'mouth', 'base', 'facialHair', 'eyebrows',
];

export function getRarestEquipped(config: CustomAvatarConfig | null | undefined): EquippedHighlight | null {
  if (!config) return null;
  let best: EquippedHighlight | null = null;
  let bestRank = 0;
  for (const category of HIGHLIGHT_SLOTS) {
    const partId = (config as Record<string, unknown>)[category];
    if (typeof partId !== 'string' || !partId || partId === 'none') continue;
    const rarity = getPartRarity(category, partId);
    const rank = RARITY_ORDER.indexOf(rarity);
    if (rank > bestRank) {
      best = { category, partId, rarity };
      bestRank = rank;
    }
  }
  return best;
}

// ── Headline stats ──

export type HeadlineStatId = 'bestWord' | 'wins' | 'streak' | 'games' | 'winRate';

export interface HeadlineStat {
  id: HeadlineStatId;
  value: string | number;
}

export interface HeadlineStatInput {
  longestWord?: string | null;
  wins?: number | null;
  /** Own profile only (lives in player_engagement, not public). */
  streak?: number | null;
  games?: number | null;
  winRate?: number | null;
}

const positive = (n: number | null | undefined): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0;

/** 2-4 stats that matter; zeros/blanks are dropped so a new player never sees a wall of dashes. */
export function getHeadlineStats(input: HeadlineStatInput, max = 4): HeadlineStat[] {
  const out: HeadlineStat[] = [];
  const word = input.longestWord?.trim();
  if (word) out.push({ id: 'bestWord', value: word.toUpperCase() });
  if (positive(input.wins)) out.push({ id: 'wins', value: input.wins });
  if (positive(input.streak)) out.push({ id: 'streak', value: input.streak });
  if (positive(input.games)) out.push({ id: 'games', value: input.games });
  if (positive(input.winRate) && positive(input.wins)) out.push({ id: 'winRate', value: input.winRate });
  return out.slice(0, max);
}

// ── Pinned achievements ──

export interface PinnedAchievement {
  key: string;
  count: number;
}

export function pickPinnedAchievements(
  counts: Record<string, number> | null | undefined,
  n = 3,
): PinnedAchievement[] {
  return Object.entries(counts ?? {})
    .filter(([, c]) => typeof c === 'number' && c > 0)
    .map(([key, count]) => ({ key, count, hof: isHallOfFameAchievement(key) ? 1 : 0 }))
    .sort((a, b) => b.hof - a.hof || b.count - a.count || a.key.localeCompare(b.key))
    .slice(0, n)
    .map(({ key, count }) => ({ key, count }));
}

// ── Telemetry source (?from=<source>) ──

const SOURCE_RE = /^[a-z][a-z0-9_]{0,31}$/;

export function parseProfileViewSource(search: string | null | undefined): ProfileViewSource {
  if (!search) return 'direct';
  const raw = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search).get('from');
  return raw && SOURCE_RE.test(raw) ? raw : 'direct';
}

// ── Share ──

export function buildProfileShareUrl(origin: string, locale: string | null | undefined, username: string): string {
  return `${origin.replace(/\/+$/, '')}/${locale || 'en'}/u/${encodeURIComponent(username)}`;
}

// ── Name ──

/** Auto-generated usernames look like `Player_<uuid prefix>` (637/735 rows). */
const AUTO_USERNAME_RE = /^player_[0-9a-f]{4,}$/i;

export function friendlyDisplayName(
  displayName: string | null | undefined,
  username: string | null | undefined,
): { name: string; isPlaceholder: boolean } {
  for (const candidate of [displayName, username]) {
    const v = candidate?.trim();
    if (v && !AUTO_USERNAME_RE.test(v)) return { name: v, isPlaceholder: false };
  }
  return { name: '', isPlaceholder: true };
}

// ── Next ladder unlock (empty-state teaser for the rarest-item slot) ──

export function getNextUnlock(level: number | null | undefined): LevelUnlock | null {
  const lv = normalizeLevel(level);
  return LEVEL_UNLOCK_LADDER.find(u => u.level > lv) ?? null;
}
