// Load-progress math for the Showcase3D scroll-scrub hero.
//
// The hero paints a 324-frame JPG sequence onto a canvas, driven by scroll.
// Until enough frames are decoded the canvas is blank, so we show a branded
// loader. These pure helpers decide what to display and when the sequence is
// "playable" enough to reveal — kept framework-free so they can be unit-tested
// without a DOM or GSAP.

// Frames needed before the opening scrub feels smooth. The rest stream in the
// background; if the user out-scrolls the loaded set the canvas simply holds the
// last decoded frame. ~24 small JPGs decode fast even on a slow connection, so
// this reveals quickly without a janky empty first chapter.
export const PLAYABLE_FRAME_COUNT = 24;

/** Loaded fraction as an integer 0..100, safe against 0/negative/overflow. */
export const loadPercent = (loaded: number, total: number): number => {
  if (total <= 0) return 0;
  const pct = (loaded / total) * 100;
  return Math.round(Math.min(100, Math.max(0, pct)));
};

/**
 * Has enough of the sequence decoded to reveal the hero?
 * True once the playable threshold is met — or once every frame of a short
 * sequence (total < threshold, e.g. reduced-motion) is in.
 */
export const isPlayable = (loaded: number, total: number): boolean => {
  if (total <= 0) return false;
  return loaded >= Math.min(total, PLAYABLE_FRAME_COUNT);
};
