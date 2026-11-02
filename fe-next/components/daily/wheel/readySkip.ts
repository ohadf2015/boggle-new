/**
 * Word Wheel ready-card skip. Returning players skip it, and so does a
 * `?start=1` link. Practice and catch-up keep their own gates (untimed wheel / ad).
 */
export function wordWheelSkipsReady(opts: {
  startParam: boolean;
  hasEverPlayed: boolean;
  isCatchup: boolean;
  isPractice: boolean;
}): boolean {
  if (opts.isPractice || opts.isCatchup) return false;
  return opts.startParam || opts.hasEverPlayed;
}
