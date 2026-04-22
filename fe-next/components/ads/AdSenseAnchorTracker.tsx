'use client';

import { useAdSenseAnchorHeight } from '@/hooks/useAdSenseAnchorHeight';

/**
 * Mounts the AdSense anchor-ad tracker so fixed bottom UI (e.g. GlobalBottomNav)
 * can offset itself above Google's auto-placed sticky bottom ad via the
 * `--adsense-anchor-height` CSS variable.
 */
export function AdSenseAnchorTracker() {
  useAdSenseAnchorHeight();
  return null;
}

export default AdSenseAnchorTracker;
