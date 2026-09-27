/**
 * TV scaling for the teacher's launch stage.
 *
 * The launch picker is sized for a laptop. On a 1920/2560 classroom wall it
 * stayed an 880px card, unreadable from the back row. Rather than re-size every
 * child, the content column gets a CSS `zoom` on TV-sized screens: everything
 * scales together and the layout (and its no-scroll fit) is unchanged, because
 * the zoomed box still takes its size from the parent and its content lays out
 * in the smaller, zoomed coordinate space.
 *
 * Gated on width AND height: a wide-but-short window must not scale, or GO LIVE
 * falls below the fold. Tiers are ordered; the later (larger) tier wins in CSS
 * because it appears later in the generated stylesheet order for equal
 * specificity — both match on a 2560x1440 wall. `tvStageZoom` mirrors the same
 * rule for tests.
 *
 * Each className is a WHOLE literal: Tailwind v4 only emits utilities it can
 * see verbatim in source.
 */

export interface TvStageZoomTier {
  minWidth: number;
  minHeight: number;
  zoom: number;
  className: string;
}

export const TV_STAGE_ZOOM_TIERS: readonly TvStageZoomTier[] = [
  {
    minWidth: 1700,
    minHeight: 950,
    zoom: 1.3,
    className: '[@media(min-width:1700px)_and_(min-height:950px)]:[zoom:1.3]',
  },
  {
    minWidth: 2200,
    minHeight: 1250,
    zoom: 1.7,
    className: '[@media(min-width:2200px)_and_(min-height:1250px)]:[zoom:1.7]',
  },
] as const;

export const TV_STAGE_ZOOM_CLASS = TV_STAGE_ZOOM_TIERS.map((tier) => tier.className).join(' ');

/** The zoom a `width`x`height` viewport gets. 1 = unscaled. */
export function tvStageZoom(width: number, height: number): number {
  let zoom = 1;
  for (const tier of TV_STAGE_ZOOM_TIERS) {
    if (width >= tier.minWidth && height >= tier.minHeight) zoom = tier.zoom;
  }
  return zoom;
}
