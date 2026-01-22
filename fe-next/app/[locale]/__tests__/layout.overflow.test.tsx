/**
 * @jest-environment jsdom
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Test for mobile scroll architecture
 *
 * The correct scroll containment pattern requires:
 * 1. Body with screen-fit (provides min-height: 100dvh, overflow-y: auto)
 * 2. Wrapper div with overflow-hidden (prevents growing beyond body, creates BFC)
 * 3. Main with screen-fit-content (the actual scroll container with touch scrolling)
 *
 * Using overflow-hidden (not overflow-clip) is important for cross-browser compatibility.
 * overflow-hidden creates a Block Formatting Context (BFC) that Android browsers handle
 * correctly. overflow-clip doesn't create a BFC and can cause scroll issues on Android 10+.
 * The -webkit-overflow-scrolling: touch in screen-fit-content ensures smooth scrolling.
 */
describe('Layout Mobile Scroll Architecture', () => {
  let layoutSource: string;

  beforeAll(() => {
    // Read the actual layout source file
    const layoutPath = resolve(process.cwd(), 'app/[locale]/layout.tsx');
    layoutSource = readFileSync(layoutPath, 'utf-8');
  });

  it('wrapper div should have overflow-hidden to prevent growing beyond body', () => {
    // The wrapper div must have overflow-hidden to constrain content and create BFC
    // overflow-hidden creates a Block Formatting Context that Android browsers handle correctly
    // Pattern: <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
    const wrapperClassMatch = layoutSource.match(/<div\s+className="([^"]*flex-1[^"]*min-h-0[^"]*relative[^"]*)"/);

    expect(wrapperClassMatch).toBeTruthy();

    if (wrapperClassMatch) {
      const wrapperClasses = wrapperClassMatch[1];

      // Should have flex-1 for flex grow
      expect(wrapperClasses).toContain('flex-1');

      // Should have min-h-0 to allow shrinking in flex context
      expect(wrapperClasses).toContain('min-h-0');

      // CRITICAL: Should have overflow-hidden to prevent wrapper from growing beyond viewport
      // overflow-hidden creates a BFC that ensures proper scroll behavior on Android
      // The -webkit-overflow-scrolling: touch in screen-fit-content handles smooth touch scrolling
      expect(wrapperClasses).toContain('overflow-hidden');

      // Should NOT have h-full - this causes height conflicts
      expect(wrapperClasses).not.toContain('h-full');
    }
  });

  it('body should have screen-fit class for proper viewport sizing', () => {
    // The body should have screen-fit class which provides:
    // min-height: 100dvh, display: flex, flex-direction: column, overflow-y: auto
    expect(layoutSource).toContain('body className="antialiased screen-fit"');
  });

  it('main should use screen-fit-content for mobile scroll support', () => {
    // Main content should use screen-fit-content class which provides:
    // flex: 1, min-height: 0, overflow-y: auto, -webkit-overflow-scrolling: touch
    // This makes main the actual scroll container for mobile devices
    const mainMatch = layoutSource.match(/<main[^>]*className="([^"]*)"/);

    expect(mainMatch).toBeTruthy();

    if (mainMatch) {
      const mainClasses = mainMatch[1];
      // CRITICAL: Main must have screen-fit-content for mobile scrolling
      expect(mainClasses).toContain('screen-fit-content');
    }
  });
});
