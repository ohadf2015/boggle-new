/**
 * Word Tower — altitude landmarks (pure, renderer-agnostic).
 *
 * Founder: "more altitude indications — clouds, skyscrapers and more cool
 * elements." World reference points placed on the same altitude scale as the
 * parallax backdrop + rival rail, so as you climb they scroll past and the
 * height feels real ("you're above the clouds now"). Reuses {@link rivalScreenY}
 * so it lines up exactly with the rest of the world.
 */
import { rivalScreenY } from './rivals';

export interface Landmark {
  id: string;
  /** Altitude (m) the landmark sits at. */
  m: number;
  icon: string;
  /** i18n key for the short label. */
  key: string;
}

export interface PositionedLandmark extends Landmark {
  /** Screen-y (px) for the current viewer altitude. */
  screenY: number;
}

export const WORD_TOWER_LANDMARKS: Landmark[] = [
  { id: 'skyscraper', m: 30, icon: '🏢', key: 'wordTower.landmark.skyscraper' },
  { id: 'cloudBase', m: 100, icon: '☁️', key: 'wordTower.landmark.cloudBase' },
  { id: 'jetStream', m: 350, icon: '✈️', key: 'wordTower.landmark.jetStream' },
  { id: 'weatherBalloon', m: 700, icon: '🎈', key: 'wordTower.landmark.weatherBalloon' },
  { id: 'karman', m: 1200, icon: '🛰️', key: 'wordTower.landmark.karman' },
  { id: 'aurora', m: 1900, icon: '🌌', key: 'wordTower.landmark.aurora' },
  { id: 'deepSpace', m: 2800, icon: '👽', key: 'wordTower.landmark.deepSpace' },
];

/** Landmarks whose line is on (or just off) screen, with their screen-y. */
export function visibleLandmarks(
  viewerHeightM: number,
  buildLineY: number,
  viewportH: number,
  pxPerM: number,
  margin = 40,
): PositionedLandmark[] {
  const out: PositionedLandmark[] = [];
  for (const l of WORD_TOWER_LANDMARKS) {
    const screenY = rivalScreenY(l.m, viewerHeightM, buildLineY, pxPerM);
    if (screenY >= -margin && screenY <= viewportH + margin) out.push({ ...l, screenY });
  }
  return out;
}
