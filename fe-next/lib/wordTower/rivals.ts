/**
 * Word Tower — rival record markers (pure, renderer-agnostic).
 *
 * Founder: show other players' towers so the climber wants to pass them. Each
 * rival is a leaderboard record at a height; its marker line is placed on the
 * same altitude scale as the parallax backdrop, so as you climb you literally
 * rise past their record. Crossing one fires a "passed!" celebration.
 */

export interface RivalMarker {
  id: string;
  name: string;
  /** The rival's record height (m). */
  heightM: number;
}

export interface PositionedRival extends RivalMarker {
  /** Screen-y (px) of the rival's record line for the current viewer altitude. */
  screenY: number;
}

/**
 * Screen-y for a rival's record line. The viewer's live tower top sits at
 * `buildLineY`; a higher record floats above it (smaller y), a record you've
 * passed sinks below (larger y). Same `pxPerM` as the parallax backdrop so the
 * marker scrolls in lockstep with the world.
 */
export function rivalScreenY(rivalHeightM: number, viewerHeightM: number, buildLineY: number, pxPerM: number): number {
  return buildLineY + (viewerHeightM - rivalHeightM) * pxPerM;
}

/** Rivals overtaken as the viewer climbs from `prevHeightM` to `curHeightM`. */
export function rivalsPassed(prevHeightM: number, curHeightM: number, rivals: ReadonlyArray<RivalMarker>): RivalMarker[] {
  if (curHeightM <= prevHeightM) return [];
  return rivals.filter((r) => r.heightM > prevHeightM && r.heightM <= curHeightM);
}

/** Rivals whose record line is on (or just off) the screen, with their screen-y. */
export function visibleRivalMarkers(
  viewerHeightM: number,
  rivals: ReadonlyArray<RivalMarker>,
  buildLineY: number,
  viewportH: number,
  pxPerM: number,
  margin = 48,
): PositionedRival[] {
  const out: PositionedRival[] = [];
  for (const r of rivals) {
    const screenY = rivalScreenY(r.heightM, viewerHeightM, buildLineY, pxPerM);
    if (screenY >= -margin && screenY <= viewportH + margin) out.push({ ...r, screenY });
  }
  return out;
}
