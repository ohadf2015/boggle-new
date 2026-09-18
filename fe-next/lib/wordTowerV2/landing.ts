/**
 * Landing verdicts, MEASURED from where physics left the block.
 *
 * v1 decided perfect/good/sloppy from the crane's aim and then animated the
 * result. Here the verdict is read off the settled simulation — the label can
 * never disagree with what the player sees on the stack.
 */

export type LandingQuality = 'perfect' | 'good' | 'sloppy' | 'miss';

export interface LandedBlock {
  x: number;
  /** Bottom edge, physics px (ground is 0, up is negative). */
  bottomY: number;
  angleRad: number;
}

/** The block that was the tower top when this one was released. */
export interface SupportTop {
  x: number;
  topY: number;
  widthPx: number;
}

/** Offset as a fraction of the support's half-width. */
const PERFECT_RATIO = 0.08;
const GOOD_RATIO = 0.35;
/** Radians. A block settled more tilted than this rocked onto a corner. */
const PERFECT_TILT = 0.06;
/** A block resting this far (px) below the old top slid off the tower. */
const MISS_SLACK_PX = 12;
/** First drop lands on the ground: judged against a notional pad this wide. */
const GROUND_PAD_W = 150;

function offsetRatio(x: number, support: SupportTop | null): number {
  const cx = support?.x ?? 0;
  const halfW = (support?.widthPx ?? GROUND_PAD_W) / 2;
  return Math.abs(x - cx) / halfW;
}

export function classifyLanding(block: LandedBlock, support: SupportTop | null): LandingQuality {
  if (support && block.bottomY > support.topY + MISS_SLACK_PX) return 'miss';

  const r = offsetRatio(block.x, support);
  if (r < PERFECT_RATIO && Math.abs(block.angleRad) < PERFECT_TILT) return 'perfect';
  if (r < GOOD_RATIO) return 'good';
  return 'sloppy';
}
