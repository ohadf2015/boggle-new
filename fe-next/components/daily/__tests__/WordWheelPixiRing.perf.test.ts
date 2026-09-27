import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * WordWheelPixiRing — per-frame performance contract
 *
 * This decorative Pixi ring sits on the daily Word Wheel (a high-traffic hot
 * path) and redraws every animation frame. Two regressions are easy to
 * reintroduce and costly on mobile:
 *
 *  1. Layout thrash: calling getBoundingClientRect() INSIDE the ticker forces a
 *     synchronous reflow every ~16ms during a drag. The canvas rect only
 *     changes on scroll/resize, so it must be cached outside the ticker and
 *     refreshed on those events.
 *  2. Wasted redraws while the tab is hidden: the ticker must early-return when
 *     document.hidden so it does no draw work for an invisible canvas.
 *
 * Source-contract test (matches the established pattern for imperative Pixi /
 * socket code that is impractical to drive through a full render harness).
 */
const source = readFileSync(
  resolve(__dirname, '../WordWheelPixiRing.tsx'),
  'utf8',
);

// Isolate the per-frame callback body: from the rAF `frame` function to the
// setup arrow's close. We bound it generously and assert on what must / must
// not appear. (Was `app.ticker.add(` before the ticker→rAF migration that
// stopped Pixi's own ticker to avoid a post-destroy null-context crash.)
function tickerBody(src: string): string {
  const start = src.indexOf('const frame = (time: number) => {');
  expect(start).toBeGreaterThan(-1);
  // Ends where the frame closure is handed to the visibility-resume path —
  // a stable anchor inside setup(), unlike the old `setup();` call site which
  // moved when the ResizeObserver took over kicking off setup.
  const end = src.indexOf('      frameRef = frame;');
  expect(end).toBeGreaterThan(start);
  return src.slice(start, end);
}

describe('WordWheelPixiRing — per-frame perf contract', () => {
  it('does not call getBoundingClientRect inside the ticker (no per-frame reflow)', () => {
    expect(tickerBody(source)).not.toMatch(/getBoundingClientRect/);
  });

  it('caches the canvas rect and refreshes it on scroll/resize', () => {
    // The rect must be read somewhere outside the ticker and kept fresh.
    expect(source).toMatch(/getBoundingClientRect/); // still read, just not per-frame
    expect(source).toMatch(/addEventListener\(\s*['"](scroll|resize)['"]/);
  });

  it('skips draw work while the tab is hidden', () => {
    expect(tickerBody(source)).toMatch(/document\.hidden/);
  });
});
