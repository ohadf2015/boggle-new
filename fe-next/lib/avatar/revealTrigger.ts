/**
 * Unlock-reveal trigger — decides WHAT to reveal after a level-up, from the
 * level-up payload held in memory. Deliberately NO stored seen-marker: a
 * localStorage/DB marker plus an async profile refresh is exactly the
 * dual-source re-pop bug class (.claude/rules/60 Class 1). The only memory is
 * this module's session state, which dies with the tab:
 *   - `revealedThrough`: highest level already revealed this session, so a
 *     stale `oldLevel` (profile not refreshed between games) can't re-reveal;
 *   - `shownKeys`: reveal keys already shown (telemetry fires once);
 *   - `unseen`: a reveal happened and the header entry hasn't been tapped yet;
 *   - `published`: a reveal waiting for a host (singleplayer publishes here).
 *
 * Pure-ish, no React. Imports only unlocks/rarity/xp math — never catalog.ts
 * (first-paint surfaces import this file).
 */
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';
import { getLevelFromXp } from '@/backend/modules/xpManager';
import { LEVEL_UNLOCK_LADDER, getNewUnlocksBetween, normalizeLevel, type LevelUnlock } from './unlocks';
import { maxRarity, type VisualTier } from './rarity';

export interface LevelUpLike {
  oldLevel?: number | null;
  newLevel: number;
}

export interface UnlockReveal {
  /** `${fromLevel}->${level}` — identity of this reveal. */
  key: string;
  fromLevel: number;
  level: number;
  unlocks: LevelUnlock[];
  rarity: VisualTier;
}

// ── session memory (in-memory only) ──
let revealedThrough = 0;
let shownKeys = new Set<string>();
let unseen = false;
let published: UnlockReveal | null = null;
const listeners = new Set<() => void>();

function emit(): void {
  for (const l of listeners) l();
}

export function __resetRevealSessionForTests(): void {
  revealedThrough = 0;
  shownKeys = new Set();
  unseen = false;
  published = null;
  listeners.clear();
}

/** The reveal for a level-up payload, minus anything already revealed this session. */
export function buildUnlockReveal(
  payload: LevelUpLike | null | undefined,
  opts: { includeRevealed?: boolean } = {},
): UnlockReveal | null {
  if (!payload) return null;
  const level = normalizeLevel(payload.newLevel);
  const rawOld = payload.oldLevel == null ? level - 1 : normalizeLevel(payload.oldLevel);
  const fromLevel = opts.includeRevealed ? rawOld : Math.max(rawOld, revealedThrough);
  const unlocks = getNewUnlocksBetween(fromLevel, level);
  if (unlocks.length === 0) return null;
  return {
    key: `${fromLevel}->${level}`,
    fromLevel,
    level,
    unlocks,
    rarity: maxRarity(unlocks.map(u => u.rarity)),
  };
}

/** Records that a reveal was on screen. True only the first time for its key. */
export function markRevealShown(reveal: UnlockReveal): boolean {
  revealedThrough = Math.max(revealedThrough, reveal.level);
  if (shownKeys.has(reveal.key)) return false;
  shownKeys.add(reveal.key);
  unseen = true;
  emit();
  return true;
}

export function hasUnseenUnlock(): boolean {
  return unseen;
}

export function clearUnseenUnlock(): void {
  if (!unseen) return;
  unseen = false;
  emit();
}

// ── publish / subscribe (singleplayer + any surface without a queue) ──

export function publishLevelUp(payload: LevelUpLike | null | undefined): UnlockReveal | null {
  const reveal = buildUnlockReveal(payload);
  if (!reveal) return null;
  published = reveal;
  emit();
  return reveal;
}

export function getPublishedReveal(): UnlockReveal | null {
  return published;
}

export function clearPublishedReveal(): void {
  if (!published) return;
  published = null;
  emit();
}

export function subscribeReveal(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

// ── adapters ──

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

/**
 * /api/stats/record-game answers `{ leveledUp, newLevel, newTotalXp, xpEarned }`
 * but no old level. The XP before this game is authoritative for it (the
 * client profile's current_level can be stale between games).
 */
export function levelUpFromRecordGame(resp: unknown): LevelUpLike | null {
  if (!resp || typeof resp !== 'object') return null;
  const r = resp as Record<string, unknown>;
  if (r.leveledUp !== true) return null;
  const newLevel = num(r.newLevel);
  const total = num(r.newTotalXp);
  if (newLevel == null || total == null) return null;
  const before = getLevelFromXp(Math.max(0, total - (num(r.xpEarned) ?? 0)));
  return { oldLevel: Math.min(before, newLevel - 1), newLevel };
}

/** First ladder rung above this level, or null past the top. */
export function getNextUnlock(level: number | null | undefined): LevelUnlock | null {
  const lvl = normalizeLevel(level);
  return LEVEL_UNLOCK_LADDER.find(u => u.level > lvl) ?? null;
}

/** Copy of the config wearing the unlocked part (its category IS the config key). */
export function applyUnlockToConfig(config: CustomAvatarConfig, unlock: LevelUnlock): CustomAvatarConfig {
  return { ...config, [unlock.category]: unlock.partId } as CustomAvatarConfig;
}

/** t() key for the unlock's display name. Colors are keyed by hex. */
export function revealPartNameKey(unlock: Pick<LevelUnlock, 'category' | 'partId'>): string {
  if (unlock.category === 'bgColor') return `revealUnlock.parts.bg${unlock.partId.replace('#', '').toUpperCase()}`;
  return `revealUnlock.parts.${unlock.partId}`;
}

/** t() key for the unlock's category label (existing avatarBuilder keys). */
export const REVEAL_CATEGORY_KEY: Record<LevelUnlock['category'], string> = {
  base: 'avatarBuilder.base',
  hair: 'avatarBuilder.hair',
  eyes: 'avatarBuilder.eyes',
  mouth: 'avatarBuilder.mouth',
  accessory: 'avatarBuilder.accessories',
  bgColor: 'avatarBuilder.background',
};
