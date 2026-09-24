/**
 * Typed telemetry for the avatar + profile loop. Before this there was NO
 * editor telemetry at all (only 31% customize, 0.17% view a profile), so none
 * of the rebuild could be measured. Everything funnels through the existing
 * growth tracker (PostHog `growth:<event>` + analytics_events).
 */
import { trackGrowthEvent } from '@/utils/growthTracking';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';
import { locales } from '@/i18n/config';
import { getConfigRarity, getPartRarity, maxRarity } from './rarity';
import type { LevelUnlock } from './unlocks';

/** Where the editor was opened from. Free-form so new entry points don't need a type bump. */
export type AvatarEditorSource =
  | 'profile'
  | 'onboarding'
  | 'lobby'
  | 'host'
  | 'landing'
  | 'tutorial'
  | 'reveal'
  | 'avatar-test'
  | (string & {});

export type ProfileViewSource = 'header' | 'post_game' | 'leaderboard' | 'direct' | 'reveal' | (string & {});

export function trackAvatarEditorOpened(source: AvatarEditorSource): void {
  trackGrowthEvent('avatar_editor_opened', { source });
}

export function trackAvatarPartChanged(category: string, value: unknown): void {
  trackGrowthEvent('avatar_part_changed', { category, rarity: getPartRarity(category, String(value ?? '')) });
}

/** Number of config fields that differ between two avatars. */
export function countChangedFields(before: CustomAvatarConfig, after: CustomAvatarConfig): number {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]) as Set<keyof CustomAvatarConfig>;
  let n = 0;
  for (const k of keys) if (before[k] !== after[k]) n += 1;
  return n;
}

export function trackAvatarSaved(before: CustomAvatarConfig, after: CustomAvatarConfig): void {
  trackGrowthEvent('avatar_saved', { changedCount: countChangedFields(before, after), rarityMax: getConfigRarity(after) });
}

export function trackAvatarUnlockRevealed(unlocks: readonly LevelUnlock[], level: number): void {
  if (unlocks.length === 0) return;
  trackGrowthEvent('avatar_unlock_revealed', {
    count: unlocks.length,
    rarityMax: maxRarity(unlocks.map(u => u.rarity)),
    level,
  });
}

/** `isPublicProfile` is kept so existing PostHog insights on profile_viewed keep working. */
export function trackProfileViewed(source: ProfileViewSource, isOwn: boolean): void {
  trackGrowthEvent('profile_viewed', { source, isOwn, isPublicProfile: !isOwn });
}

const LOCALE_SET = new Set<string>(locales);

/** Fallback editor source: first route segment after the locale ("/he/profile" → "profile"). */
export function editorSourceFromPath(pathname: string | null | undefined): AvatarEditorSource {
  if (pathname == null) return 'unknown';
  const segs = pathname.split('/').filter(Boolean);
  if (segs.length > 0 && LOCALE_SET.has(segs[0])) segs.shift();
  return segs[0] ?? 'home';
}
