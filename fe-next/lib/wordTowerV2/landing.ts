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

/**
 * Offset as a fraction of the support's half-width. Was .08/.35: a ~9ms perfect
 * window. feel.test.ts pins these in ms against the real swing.
 */
export const PERFECT_RATIO = 0.14;
export const GOOD_RATIO = 0.5;
/** Radians. A block settled more tilted than this rocked onto a corner. */
const PERFECT_TILT = 0.06;
/** A block resting this far (px) below the old top slid off the tower. */
const MISS_SLACK_PX = 12;
/** First drop lands on the ground: judged against a notional pad this wide. */
const GROUND_PAD_W = 200;

function offsetRatio(x: number, support: SupportTop | null): number {
  const cx = support?.x ?? 0;
  const halfW = (support?.widthPx ?? GROUND_PAD_W) / 2;
  return Math.abs(x - cx) / halfW;
}

/**
 * Half-width of the perfect band over a support `widthPx` wide — what the
 * landing mark draws. Same maths as classifyLanding, so a Crane Yard upgrade
 * widens the band the player SEES by exactly what the judge accepts.
 */
export function perfectHalfWidth(widthPx: number, windowMult = 1): number {
  return PERFECT_RATIO * windowMult * (widthPx / 2);
}

/**
 * `windowMult` widens ONLY the perfect band (the Crane Yard perk). It defaults
 * to 1, so every existing caller — and feel.test's measured window — is
 * untouched.
 */
export function classifyLanding(block: LandedBlock, support: SupportTop | null, windowMult = 1): LandingQuality {
  if (support && block.bottomY > support.topY + MISS_SLACK_PX) return 'miss';

  const r = offsetRatio(block.x, support);
  if (r < PERFECT_RATIO * windowMult && Math.abs(block.angleRad) < PERFECT_TILT) return 'perfect';
  if (r < GOOD_RATIO) return 'good';
  return 'sloppy';
}

/** Perfect ONLY because the Crane Yard widened the band — the moment the upgrade gets named on screen. */
export function perkMadePerfect(block: LandedBlock, support: SupportTop | null, windowMult: number): boolean {
  return windowMult > 1 && classifyLanding(block, support, windowMult) === 'perfect' && classifyLanding(block, support, 1) !== 'perfect';
}
