/**
 * Word Tower — drop verdict presentation (pure).
 *
 * Turns a {@link PlacementOutcome} into the props for the big, screen-anchored
 * verdict pop. The original feedback was a small pill at the crane with no
 * height read-out, so players "didn't know if they succeeded". This gives one
 * unmistakable moment: a large band-coloured label + the metres actually gained.
 */

import type { PlacementOutcome, PlacementQuality } from './cranePlacement';

/** Colour family per quality — matches the live band tint on the swinging beam. */
export type VerdictTone = 'lime' | 'cyan' | 'yellow' | 'red';

export interface DropVerdict {
  /** i18n key for the headline label (PERFECT! / NICE / SLOPPY / MISSED). */
  labelKey: string;
  /** Band colour family for styling the pop. */
  tone: VerdictTone;
  /** Signed metres-gained string, e.g. "+12m". */
  gainText: string;
  perfect: boolean;
  /** A miss that toppled a floor — UI shows the harsher beat. */
  toppled: boolean;
}

const TONE: Record<PlacementQuality, VerdictTone> = {
  perfect: 'lime',
  good: 'cyan',
  sloppy: 'yellow',
  miss: 'red',
};

/** i18n key for the headline verdict label of a quality band. */
export function verdictLabelKey(quality: PlacementQuality): string {
  return `wordTower.verdict.${quality}`;
}

/** Band colour family for a quality (mirrors the swinging-beam tint). */
export function verdictTone(quality: PlacementQuality): VerdictTone {
  return TONE[quality];
}

/**
 * Signed, rounded metre string. A *positive* gain never reads as "+0m" (that
 * looked like a failure), so anything above zero floors at "+1m"; a genuine
 * zero (or negative) gain shows "+0m".
 */
export function formatHeightGain(meters: number): string {
  if (!(meters > 0)) return '+0m';
  return `+${Math.max(1, Math.round(meters))}m`;
}

/** Bundle a placement outcome + metres gained into the verdict-pop props. */
export function buildDropVerdict(outcome: PlacementOutcome, metersGained: number): DropVerdict {
  return {
    labelKey: verdictLabelKey(outcome.quality),
    tone: verdictTone(outcome.quality),
    gainText: formatHeightGain(metersGained),
    perfect: outcome.perfect,
    toppled: outcome.topples,
  };
}
