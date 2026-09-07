/**
 * Streak sharing.
 *
 * The shared artifact is the tier-matched OG card (`/api/og/streak`) so the
 * picture a friend receives looks like the screen the player was just looking
 * at. Handing the platform a stale generic card is how a share stops feeling
 * like a brag and starts feeling like an ad.
 *
 * The File → canShare → text → clipboard fallback chain is NOT reimplemented
 * here: it already exists in `shareImageWithNativeShare`.
 */
import { shareImageWithNativeShare, type ShareImageResult } from './shareImageGenerator';
import type { StreakTierConfig } from '@/lib/streakTierRewards';

type Translate = (key: string, fallback?: string, params?: Record<string, string | number>) => string;

/** OG card dimensions — matches the route's ImageResponse size. */
const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

export function buildStreakShareText(streak: number, t: Translate): string {
  const line = t('daily.streakShare.text', `${streak}-day streak on LexiClash`, { days: streak });
  return `${line}\nlexiclash.live`;
}

export function streakOgUrl({
  streak,
  tierId,
  origin,
  lang,
}: {
  streak: number;
  tierId: StreakTierConfig['id'];
  origin?: string;
  lang?: string;
}): string {
  const base = origin
    || process.env.REACT_APP_PUBLIC_URL
    || (typeof window !== 'undefined' ? window.location.origin : 'https://lexiclash.live');
  const params = new URLSearchParams({ streak: String(streak), tier: tierId });
  if (lang) params.set('lang', lang);
  return `${base}/api/og/streak?${params}`;
}

/**
 * Share the player's streak. Resolves true if the platform accepted a share
 * (image or text), false if it could not share at all or the player cancelled.
 */
export async function shareStreak({
  streak,
  tierId,
  t,
  lang,
}: {
  streak: number;
  tierId: StreakTierConfig['id'];
  t: Translate;
  lang?: string;
}): Promise<boolean> {
  const shareText = buildStreakShareText(streak, t);

  let imageResult: ShareImageResult | null = null;
  try {
    const res = await fetch(streakOgUrl({ streak, tierId, lang }));
    if (res.ok) {
      const blob = await res.blob();
      imageResult = {
        blob,
        dataUrl: URL.createObjectURL(blob),
        width: OG_WIDTH,
        height: OG_HEIGHT,
      };
    }
  } catch {
    // Offline, or the OG route is down. The text share below still works, and
    // losing the picture is not a reason to lose the share.
  }

  if (imageResult) {
    try {
      return await shareImageWithNativeShare(imageResult, shareText);
    } finally {
      URL.revokeObjectURL(imageResult.dataUrl);
    }
  }

  if (typeof navigator !== 'undefined' && 'share' in navigator && typeof navigator.share === 'function') {
    try {
      await navigator.share({ text: shareText });
      return true;
    } catch {
      return false;
    }
  }

  // Last resort: leave it on the clipboard so the brag is not simply lost.
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(shareText);
      return true;
    } catch {
      return false;
    }
  }

  return false;
}
