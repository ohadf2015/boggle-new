/**
 * @jest-environment jsdom
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Test for BUG: Pages with overflow content get cut off
 *
 * Root cause: The layout wrapper div has `h-full` which constrains
 * its height to the parent's height (100dvh from screen-fit).
 * When page content exceeds viewport height, it gets clipped.
 *
 * Expected: The wrapper should NOT use h-full so content can flow
 * naturally and the body's overflow-y: auto can handle scrolling.
 */
describe('Layout Overflow Bug Fix', () => {
  let layoutSource: string;

  beforeAll(() => {
    // Read the actual layout source file
    const layoutPath = resolve(process.cwd(), 'app/[locale]/layout.tsx');
    layoutSource = readFileSync(layoutPath, 'utf-8');
  });

  it('should NOT have h-full on the inner wrapper div inside Providers', () => {
    // The layout has a wrapper div around main content
    // Pattern we're looking for (the BUG):
    // <div className="flex-1 flex flex-col min-h-0 relative h-full">
    //
    // Pattern that's correct (the FIX):
    // <div className="flex-1 flex flex-col min-h-0 relative">

    // Find the div wrapper inside Providers that wraps main content
    // This regex matches the classname of the inner wrapper div
    const wrapperClassMatch = layoutSource.match(/<div\s+className="([^"]*flex-1[^"]*min-h-0[^"]*relative[^"]*)"/);

    expect(wrapperClassMatch).toBeTruthy();

    if (wrapperClassMatch) {
      const wrapperClasses = wrapperClassMatch[1];

      // Should have flex-1 for flex grow
      expect(wrapperClasses).toContain('flex-1');

      // Should have min-h-0 to allow shrinking
      expect(wrapperClasses).toContain('min-h-0');

      // Should NOT have h-full - this causes the overflow clipping issue
      // h-full constrains the wrapper to parent height (100dvh from screen-fit),
      // preventing content from flowing naturally when it exceeds viewport height
      expect(wrapperClasses).not.toContain('h-full');
    }
  });

  it('body should have screen-fit class for proper scrolling', () => {
    // The body should have screen-fit class which provides overflow-y: auto
    expect(layoutSource).toContain('body className="antialiased screen-fit"');
  });

  it('main should use flex-1 and min-h-0 for flex layout', () => {
    // Main content should use flex-1 min-h-0 for proper flex behavior
    const mainMatch = layoutSource.match(/<main[^>]*className="([^"]*)"/);

    expect(mainMatch).toBeTruthy();

    if (mainMatch) {
      const mainClasses = mainMatch[1];
      expect(mainClasses).toContain('flex-1');
      expect(mainClasses).toContain('min-h-0');
    }
  });
});
