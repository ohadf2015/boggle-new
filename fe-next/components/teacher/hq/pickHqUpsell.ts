export interface HqUpsellInput {
  hasBanner: boolean;
  pinBanner: boolean;
  hasUsagePrompt: boolean;
  hasPro?: boolean;
  /** The class pulse (progress counts) is on screen — the contextual home for a free teacher's ask. Null while unknown. */
  pulseHome?: boolean | null;
}

export interface HqUpsell {
  /** Render the banner pinned on the deck. */
  pinned: boolean;
  /** What the Pro sheet holds, or no sheet at all. */
  chip: 'banner' | 'usage' | null;
  /** The Go Pro chip itself is shown in the top row. */
  chipVisible: boolean;
  /** The ask lives inside the class pulse (and opens the sheet when there is one). */
  pulse: boolean;
  /** The free plan badge's "Upgrade" word — only when nothing louder is up. */
  planUpgradeWord: boolean;
}

/** The plan badge, the Go Pro chip, a pinned banner, the usage card and the pulse used to stack; exactly one may speak. */
export function pickHqUpsell({
  hasBanner,
  pinBanner,
  hasUsagePrompt,
  hasPro = false,
  pulseHome = false,
}: HqUpsellInput): HqUpsell {
  if (hasBanner && pinBanner) {
    return { pinned: true, chip: null, chipVisible: false, pulse: false, planUpgradeWord: false };
  }
  const chip = hasBanner ? 'banner' : hasUsagePrompt ? 'usage' : null;
  if (!hasPro && pulseHome === null) {
    return { pinned: false, chip, chipVisible: false, pulse: false, planUpgradeWord: false };
  }
  if (!hasPro && pulseHome) {
    return { pinned: false, chip, chipVisible: false, pulse: true, planUpgradeWord: false };
  }
  return { pinned: false, chip, chipVisible: chip !== null, pulse: false, planUpgradeWord: chip === null && !hasPro };
}
