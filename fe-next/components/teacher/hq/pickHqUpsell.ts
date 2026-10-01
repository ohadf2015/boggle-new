export interface HqUpsellInput {
  hasBanner: boolean;
  pinBanner: boolean;
  hasUsagePrompt: boolean;
}

export interface HqUpsell {
  /** Render the banner pinned on the deck. */
  pinned: boolean;
  /** What the Go Pro chip's sheet holds, or no chip at all. */
  chip: 'banner' | 'usage' | null;
  /** The free plan badge's "Upgrade" word — only when nothing louder is up. */
  planUpgradeWord: boolean;
}

/** The plan badge, the Go Pro chip, a pinned banner and the usage card used to stack; exactly one may speak. */
export function pickHqUpsell({ hasBanner, pinBanner, hasUsagePrompt }: HqUpsellInput): HqUpsell {
  if (hasBanner && pinBanner) return { pinned: true, chip: null, planUpgradeWord: false };
  if (hasBanner) return { pinned: false, chip: 'banner', planUpgradeWord: false };
  if (hasUsagePrompt) return { pinned: false, chip: 'usage', planUpgradeWord: false };
  return { pinned: false, chip: null, planUpgradeWord: true };
}
