/**
 * Hidden-achievement bus: the single seam between gameplay (which DETECTS) and the
 * global UI listener (which CELEBRATES). Gameplay calls evaluate*()/trigger; it
 * never imports UI. The listener subscribes to one window CustomEvent.
 *
 * trigger = dedup (markEarned) → on first earn: dispatch event + light analytics.
 * Everything here is cosmetic and best-effort — it must never throw into the game.
 */

import { trackGrowthEvent } from '@/utils/growthTracking';
import type { HiddenAchievementId } from './hiddenAchievements';
import { markEarned } from './hiddenAchievementState';
import {
  detectSelectionAchievements,
  detectWordAchievements,
  type SelectionAchievementContext,
  type WordAchievementContext,
} from './detectHiddenAchievements';

export const HIDDEN_ACHIEVEMENT_EVENT = 'lexiclash:hidden-achievement';

export interface HiddenAchievementEventDetail {
  id: HiddenAchievementId;
}

/**
 * Award a hidden achievement once. Returns true iff this was the first time
 * (event dispatched + analytics fired); false if already earned or unavailable.
 */
export function triggerHiddenAchievement(id: HiddenAchievementId): boolean {
  if (!markEarned(id)) return false;

  try {
    trackGrowthEvent('achievement_earned', {
      achievementId: id,
      achievementTier: 'hidden',
    });
  } catch {
    /* analytics is best-effort */
  }

  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent<HiddenAchievementEventDetail>(HIDDEN_ACHIEVEMENT_EVENT, {
          detail: { id },
        }),
      );
    }
  } catch {
    /* surfacing is cosmetic */
  }

  return true;
}

/** Run selection-gesture detectors and trigger each qualifying achievement. */
export function evaluateSelectionAchievements(
  ctx: SelectionAchievementContext,
): void {
  for (const id of detectSelectionAchievements(ctx)) triggerHiddenAchievement(id);
}

/** Run word-pattern detectors and trigger each qualifying achievement. */
export function evaluateWordAchievements(ctx: WordAchievementContext): void {
  for (const id of detectWordAchievements(ctx)) triggerHiddenAchievement(id);
}
