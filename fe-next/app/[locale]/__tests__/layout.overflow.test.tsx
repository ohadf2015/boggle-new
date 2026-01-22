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
 * 2. Wrapper div with overflow-clip (prevents growing beyond body, allows touch scroll)
 * 3. Main with screen-fit-content (the actual scroll container with touch scrolling)
 *
 * Using overflow-clip instead of overflow-hidden is critical for mobile touch scrolling.
 * overflow-hidden creates a scroll context that can trap touch events, requiring 2-finger
 * scroll on some devices. overflow-clip clips visually without this side effect.
 */
describe('Layout Mobile Scroll Architecture', () => {
  let layoutSource: string;

  beforeAll(() => {
    // Read the actual layout source file
    const layoutPath = resolve(process.cwd(), 'app/[locale]/layout.tsx');
    layoutSource = readFileSync(layoutPath, 'utf-8');
  });

  it('wrapper div should have overflow-clip to prevent growing beyond body', () => {
    // The wrapper div must have overflow-clip to constrain content visually
    // overflow-clip is used instead of overflow-hidden to avoid touch scroll issues
    // Pattern: <div className="flex-1 flex flex-col min-h-0 relative overflow-clip">
    const wrapperClassMatch = layoutSource.match(/<div\s+className="([^"]*flex-1[^"]*min-h-0[^"]*relative[^"]*)"/);

    expect(wrapperClassMatch).toBeTruthy();

    if (wrapperClassMatch) {
      const wrapperClasses = wrapperClassMatch[1];

      // Should have flex-1 for flex grow
      expect(wrapperClasses).toContain('flex-1');

      // Should have min-h-0 to allow shrinking in flex context
      expect(wrapperClasses).toContain('min-h-0');

      // CRITICAL: Should have overflow-clip to prevent wrapper from growing beyond viewport
      // Using overflow-clip instead of overflow-hidden to avoid touch scroll issues
      // overflow-clip clips content visually but doesn't create a scroll context that traps touch events
      expect(wrapperClasses).toContain('overflow-clip');

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
