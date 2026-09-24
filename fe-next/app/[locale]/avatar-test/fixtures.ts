/**
 * Fixtures for the /avatar-test capture harness (no auth, no DB, noindex).
 * Critics open e.g. /he/avatar-test?level=7&view=editor and get a
 * deterministic player at that level. Lock state comes from the SAME
 * isPartUsable predicate the real useAvatarPremium hook uses — the harness can
 * never show a lock state production wouldn't.
 */
import type { AvatarPremium } from '@/components/avatar/AvatarBuilderModal';
import { type CustomAvatarConfig, DEFAULT_AVATAR_CONFIG } from '@/shared/types/customAvatar';
import { LEVEL_UNLOCK_LADDER, isPartUsable } from '@/lib/avatar/unlocks';

export const AVATAR_LAB_VIEWS = ['editor', 'profile', 'reveal', 'lite', 'grid'] as const;
export type AvatarLabView = (typeof AVATAR_LAB_VIEWS)[number];

export const LAB_MIN_LEVEL = 1;
export const LAB_MAX_LEVEL = 50;
/** No DB row → /api/avatar/png 404s → AvatarLite shows its flat disc. */
export const FIXTURE_PLAYER_ID = '00000000-0000-4000-8000-00000000a1ab';
export const FIXTURE_COINS = 1500;

type RawParams = Record<string, string | string[] | undefined>;

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export function parseAvatarLabParams(raw: RawParams): { level: number; view: AvatarLabView } {
  const n = Math.floor(Number(first(raw.level)));
  const level = Number.isFinite(n) ? Math.min(LAB_MAX_LEVEL, Math.max(LAB_MIN_LEVEL, n)) : LAB_MIN_LEVEL;
  const v = first(raw.view);
  const view = (AVATAR_LAB_VIEWS as readonly string[]).includes(v ?? '') ? (v as AvatarLabView) : 'grid';
  return { level, view };
}

/** A premium object for the builder at a given level. Purchases are inert. */
export function buildFixturePremium(level: number): AvatarPremium {
  return {
    isPartUnlocked: (category, value) => isPartUsable(category, value, { ownedKeys: [], level }),
    unlockTemporarily: () => {},
    purchaseWithGold: async () => false,
    isPurchasing: false,
    permanentUnlocks: [],
    coins: FIXTURE_COINS,
  };
}

/** Default avatar wearing the newest level unlock in each category (≤ level). */
export function fixtureConfigForLevel(level: number): CustomAvatarConfig {
  const config: Record<string, unknown> = { ...DEFAULT_AVATAR_CONFIG };
  for (const u of LEVEL_UNLOCK_LADDER) {
    if (u.level <= level) config[u.category] = u.partId;
  }
  return config as CustomAvatarConfig;
}
