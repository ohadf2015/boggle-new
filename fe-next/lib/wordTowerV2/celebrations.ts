/**
 * Word Tower v2 celebration copy + the one banner queue. Pure.
 *
 * Two lanes, so toasts can never pile up the way round 5's four independent
 * pops did in one column:
 *   - CALLOUT: the landing verdict / combo / big word — short, newest wins.
 *   - BANNER: crates, new skies, a new best, badges — queued by priority, one
 *     at a time, capped.
 * Callouts pick one of several variants so a run doesn't shout the same word.
 */
import type { LandingQuality } from './landing';

export type Tone = 'lime' | 'cyan' | 'yellow' | 'red' | 'pink' | 'purple' | 'orange';

export const CALLOUT_VARIANTS: Record<LandingQuality, number> = { perfect: 4, good: 4, sloppy: 3, miss: 3 };

const TONE: Record<LandingQuality, Tone> = { perfect: 'lime', good: 'cyan', sloppy: 'yellow', miss: 'red' };

export interface CalloutCopy {
  textKey: string;
  tone: Tone;
  params?: Record<string, number>;
}

function comboTier(combo: number): string {
  if (combo >= 8) return 'legendary';
  if (combo >= 5) return 'unstoppable';
  if (combo >= 4) return 'quad';
  if (combo >= 3) return 'triple';
  return 'double';
}

/** `roll` in [0,1) picks the variant. */
export function landingCallout(quality: LandingQuality, combo: number, roll: number): CalloutCopy {
  if (quality === 'perfect' && combo >= 2) {
    return { textKey: `wordTowerV2.call.combo.${comboTier(combo)}`, tone: 'orange', params: { n: combo } };
  }
  const i = Math.min(CALLOUT_VARIANTS[quality] - 1, Math.floor(roll * CALLOUT_VARIANTS[quality]));
  return { textKey: `wordTowerV2.call.${quality}.${i}`, tone: TONE[quality] };
}

export function wordCallout(len: number): string | null {
  if (len >= 8) return 'wordTowerV2.call.word.mega';
  if (len >= 6) return 'wordTowerV2.call.word.big';
  return null;
}

export type BannerKind = 'reward' | 'zone' | 'best' | 'achievement';

export interface Banner {
  key: number;
  kind: BannerKind;
  /** Reward id, biome id or achievement id. */
  id: string;
  priority: number;
}

export const BANNER_PRIORITY: Record<BannerKind, number> = { achievement: 4, best: 3, reward: 2, zone: 1 };
const MAX_QUEUED = 4;

/** Insert by priority (stable), dropping the lowest once over the cap. */
export function pushBanner(queue: Banner[], banner: Banner): Banner[] {
  const next = [...queue];
  const at = next.findIndex((b) => b.priority < banner.priority);
  next.splice(at === -1 ? next.length : at, 0, banner);
  return next.slice(0, MAX_QUEUED);
}
