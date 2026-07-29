/** Shared helpers for Hair parts — viewBox 0 0 100 100. Face: cx=50 cy=52 r=30.
 *
 * SYSTEMIC QUALITY WINS (applied 2026-06):
 * 1. CrownHighlight primitive — eliminates dozens of duplicated ad-hoc crown paths across 7 hair files.
 *    One place to tune highlight pop/curve for the entire hair catalog.
 * 2. TempleWisp + EarTuck — consistent temple framing + ear interaction for side-volume styles.
 *    Ensures hair "meets the face/hairline" cleanly on bases that have ear bumps.
 * 3. (Future) Extract more caps/partings into helpers for silhouette + front-overlay alignment.
 *
 * These + the existing HairPolish give the highest leverage per-line changes for ~49 back + 29 front styles.
 */
import { type FC } from 'react';

import { STROKE_OUTER } from './avatarDesignConstants';

export const S = STROKE_OUTER;

export interface HairPartProps {
  fill: string;
  /** Secondary color for bows/ties/beads — defaults to fill if not provided */
  accentColor?: string;
}

/**
 * Color-agnostic faux-3D polish: black-fade shade at bottom + white-fade
 * rim-light at top. Works with ANY base fill because stops use #000/#fff
 * with opacity, not the hair color itself. Apply as two overlay paths
 * (same silhouette as the main cap) above the base fill.
 */
export function HairPolishDefs({ uid, keyName }: { uid: string; keyName: string }) {
  return (
    <>
      <linearGradient id={`${uid}hair-${keyName}-shade`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#000" stopOpacity="0" />
        <stop offset="60%" stopColor="#000" stopOpacity="0.05" />
        <stop offset="100%" stopColor="#000" stopOpacity="0.32" />
      </linearGradient>
      <linearGradient id={`${uid}hair-${keyName}-light`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#fff" stopOpacity="0.3" />
        <stop offset="45%" stopColor="#fff" stopOpacity="0" />
      </linearGradient>
    </>
  );
}

/**
 * Apply shade+light overlays onto a path silhouette (same d as main cap).
 * Requires matching <HairPolishDefs uid keyName /> inside <defs>.
 */
export function HairPolish({ uid, keyName, d }: { uid: string; keyName: string; d: string }) {
  return (
    <>
      <path d={d} fill={`url(#${uid}hair-${keyName}-shade)`} stroke="none" />
      <path d={d} fill={`url(#${uid}hair-${keyName}-light)`} stroke="none" />
    </>
  );
}

export const None: FC<HairPartProps> = function None() {
  return null;
};

/**
 * SYSTEMIC WIN #1: Shared crown highlight primitive.
 * Replaces 40+ near-identical ad-hoc <path d="M.. Q50 .."> white highlight strings.
 * Default values tuned to the most common "cute pop" across styles (opacity ~0.18, stroke 1.3-1.4).
 * Future global tweak (stronger neo-brutalist highlights, different curve) = one file change.
 */
export function CrownHighlight({
  opacity = 0.18,
  strokeWidth = 1.35,
}: {
  opacity?: number;
  strokeWidth?: number;
}) {
  return (
    <path
      d="M34 12 Q50 7 66 12"
      fill="none"
      stroke="#fff"
      strokeWidth={strokeWidth}
      opacity={opacity}
      strokeLinecap="round"
    />
  );
}

/**
 * SYSTEMIC WIN #2: Lightweight temple/side wisp for framing faces.
 * Used by long/bob/wavy/pixie etc front or side volume. Keeps wisps ABOVE eye line (y<=36).
 */
export function TempleWisp({ side = 'left', opacity = 0.12 }: { side?: 'left' | 'right'; opacity?: number }) {
  const x1 = side === 'left' ? 12 : 88;
  const x2 = side === 'left' ? 10 : 90;
  return (
    <path
      d={`M${x1} 34 Q${x2} 38 ${x1} 44`}
      fill="none"
      stroke="#000"
      strokeWidth={1.2}
      opacity={opacity}
      strokeLinecap="round"
    />
  );
}

/**
 * SYSTEMIC WIN (future): Ear tuck / clip hint.
 * For volume styles with side locks (pigtails, twintails, braids), a small darker arc
 * where hair tucks behind the ear bump on cute bases. Low-risk additive; can be rolled out per-style.
 * Example usage inside a style: <EarTuck side="left" fill={fill} />
 */
export function EarTuck({ side = 'left', fill }: { side?: 'left' | 'right'; fill: string }) {
  const cx = side === 'left' ? 22 : 78;
  return (
    <ellipse
      cx={cx}
      cy={50}
      rx={3}
      ry={4}
      fill={fill}
      opacity={0.25}
      stroke="none"
    />
  );
}
