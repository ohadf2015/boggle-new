/**
 * Glow-Up display selector — the runtime guarantee that AI portraits are ADDITIVE.
 *
 * A baked Higgsfield portrait loses the live SVG avatar's reactivity (moods, tier
 * effects, game-mode frames) and is heavier on dense rosters. So a portrait is
 * shown ONLY on premium hero surfaces, and ONLY when every condition holds:
 *   - the feature flag is enabled,
 *   - a render url exists and its status is 'ready',
 *   - the render is not stale (config unchanged since it was generated).
 * Any failing condition ⇒ fall back to the live SVG avatar. Leaderboards and
 * in-game never pass the flag/surface and so always render live.
 *
 * See docs/superpowers/specs/2026-06-20-higgsfield-avatar-system-design.md (Track B).
 */

import type { CustomAvatarConfig } from '@/shared/types/customAvatar';
import { isRenderStale } from './glowUpSeed';

export type AvatarRenderStatus = 'pending' | 'ready' | 'failed';

export interface AvatarDisplayInput {
  config: CustomAvatarConfig;
  /** Whether the avatar-glow-up feature flag is enabled for this user/surface. */
  flagEnabled: boolean;
  renderUrl?: string | null;
  renderStatus?: AvatarRenderStatus | null;
  renderSeedHash?: string | null;
}

export type AvatarDisplay =
  | { kind: 'render'; url: string }
  | { kind: 'live' };

const LIVE: AvatarDisplay = { kind: 'live' };

/** Decide whether to show the AI portrait or the live SVG avatar. */
export function selectAvatarDisplay(input: AvatarDisplayInput): AvatarDisplay {
  const { config, flagEnabled, renderUrl, renderStatus, renderSeedHash } = input;

  if (!flagEnabled) return LIVE;
  if (!renderUrl) return LIVE;
  if (renderStatus !== 'ready') return LIVE;
  if (isRenderStale(config, renderSeedHash)) return LIVE;

  return { kind: 'render', url: renderUrl };
}
