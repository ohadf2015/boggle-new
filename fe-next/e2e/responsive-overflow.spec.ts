import { test, expect } from '@playwright/test';
import { goto, waitForHydration } from './helpers/test-utils';

/**
 * Responsive overflow guard.
 *
 * Regression cover for the friends-header "off-canvas button" bug (commit
 * b57e2f76): a non-wrapping flex row pushed action buttons past the right
 * viewport edge on narrow/tall devices (Samsung S25 Ultra). This test would
 * have caught it.
 *
 * The hard assertion is that the PAGE has no horizontal scroll
 * (`scrollWidth <= innerWidth`). That is the precise "something is pushed
 * off-canvas" symptom, and — unlike scanning every element's bounding box — it
 * does NOT false-positive on intentionally horizontally-scrollable strips
 * (e.g. the friends tab bar uses `overflow-x-auto`), whose clipped overflow
 * never expands the page.
 *
 * Element-level diagnostics are gathered only to make a failure actionable.
 */

// Extreme widths: 280 = Galaxy Fold cover screen, 320 = smallest modern phone,
// 360 = common Android, 412 = Pixel/S-series portrait, 480 = the `xs` breakpoint.
const WIDTHS = [280, 320, 360, 412, 480];

// Public routes that render without auth. /friends renders its header + sign-in
// card unauthenticated, so its layout is still exercised.
const ROUTES = ['/', '/friends'];

/** Returns class names of elements whose box extends past the viewport, ignoring
 *  descendants of horizontally-scrollable (clipped) containers. Diagnostics only. */
async function offenders(page: import('@playwright/test').Page): Promise<string[]> {
  return page.evaluate(() => {
    const vw = window.innerWidth;
    const inScrollContainer = (el: Element): boolean => {
      let node: Element | null = el.parentElement;
      while (node && node !== document.body) {
        const ox = getComputedStyle(node).overflowX;
        if (ox === 'auto' || ox === 'scroll' || ox === 'hidden') return true;
        node = node.parentElement;
      }
      return false;
    };
    return Array.from(document.body.querySelectorAll('*'))
      .filter((el) => {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return false;
        if (r.right <= vw + 1 && r.left >= -1) return false;
        return !inScrollContainer(el);
      })
      .slice(0, 8)
      .map((el) => `${el.tagName.toLowerCase()}.${(el.getAttribute('class') || '').slice(0, 80)}`);
  });
}

test.describe('Responsive overflow guard', () => {
  for (const route of ROUTES) {
    for (const width of WIDTHS) {
      test(`${route} has no horizontal overflow at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 880 });
        await goto(page, route);
        await waitForHydration(page);

        const horizontallyScrolls = await page.evaluate(
          () => document.documentElement.scrollWidth > window.innerWidth + 1
        );

        if (horizontallyScrolls) {
          // Surface the culprits in the failure message.
          const culprits = await offenders(page);
          throw new Error(
            `Horizontal overflow at ${width}px on ${route}. Offending elements:\n` +
              (culprits.length ? culprits.join('\n') : '(none isolated — check fixed-width children)')
          );
        }

        expect(horizontallyScrolls).toBe(false);
      });
    }
  }
});
