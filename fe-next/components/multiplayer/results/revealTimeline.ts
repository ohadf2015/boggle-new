/**
 * The results reveal, as data (DESIGN.md §c "Results reveal"). Phone/desktop:
 *
 *   TIME! (0.5s) → standings rise from last place to 2nd (350ms each, the whole
 *   climb capped so an 8-seat room is not slower than a 4-seat one) → 1st slams
 *   in with the crown (0.7s) → your card's counters roll (1.2s) → footer CTAs
 *   slide up.
 *
 * Pure: the component turns this into timeouts (see useRevealStage) and a
 * `stage` number; every beat's visibility is `stage >= stageOf(name)`, so a
 * skip is simply "stage = last" and reduced motion starts there.
 */
export const REVEAL = {
  /** The TIME! slam before any number shows. */
  timeMs: 500,
  /** One standings row rising (last → 2nd). */
  rowMs: 350,
  /** Cap for the whole climb, so a big room doesn't drag. */
  climbCapMs: 1050,
  /** 1st place slam + crown before the card rolls. */
  firstMs: 700,
  /** Your card's counters roll. */
  countMs: 1200,
  /** Footer slide-up. */
  footerMs: 450,
} as const;

export type RevealEventName = 'header' | `row-${number}` | 'card' | 'footer';

export interface RevealEvent {
  name: RevealEventName;
  /** ms after mount at which this beat becomes visible. */
  at: number;
}

export interface RevealTimeline {
  events: RevealEvent[];
  doneAt: number;
  /** The stage (1-based index into events) at which a beat is visible. */
  stageOf: (name: RevealEventName) => number;
}

export function buildRevealTimeline(rowCount: number): RevealTimeline {
  const n = Math.max(1, Math.floor(rowCount));
  const climbSteps = n - 1;
  const perRow = climbSteps > 0 ? Math.min(REVEAL.rowMs, REVEAL.climbCapMs / climbSteps) : 0;

  const events: RevealEvent[] = [{ name: 'header', at: REVEAL.timeMs }];
  let at = REVEAL.timeMs;
  for (let rank = n; rank >= 2; rank--) {
    events.push({ name: `row-${rank}`, at: Math.round(at) });
    at += perRow;
  }
  const firstAt = Math.round(at);
  events.push({ name: 'row-1', at: firstAt });
  events.push({ name: 'card', at: firstAt + REVEAL.firstMs });
  events.push({ name: 'footer', at: firstAt + REVEAL.firstMs + REVEAL.countMs });

  const index = new Map(events.map((e, i) => [e.name, i + 1]));
  return {
    events,
    doneAt: firstAt + REVEAL.firstMs + REVEAL.countMs + REVEAL.footerMs,
    stageOf: (name) => index.get(name) ?? 0,
  };
}
