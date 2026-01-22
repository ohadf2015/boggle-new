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
 * 2. Wrapper div with overflow-x-hidden (contains horizontal overflow, allows vertical scroll)
 * 3. Main with screen-fit-content (the actual scroll container with touch scrolling)
 *
 * IMPORTANT: Using overflow-x-hidden (NOT overflow-hidden) is critical for mobile touch scroll.
 * overflow-hidden blocks touch scroll events from propagating to child elements on mobile devices.
 * overflow-x-hidden only contains horizontal overflow while allowing vertical touch scroll to work.
 * The -webkit-overflow-scrolling: touch in screen-fit-content ensures smooth scrolling.
 */
describe('Layout Mobile Scroll Architecture', () => {
  let layoutSource: string;

  beforeAll(() => {
    // Read the actual layout source file
    const layoutPath = resolve(process.cwd(), 'app/[locale]/layout.tsx');
    layoutSource = readFileSync(layoutPath, 'utf-8');
  });

  it('wrapper div should have overflow-x-hidden to allow vertical touch scroll', () => {
    // The wrapper div must have overflow-x-hidden to:
    // 1. Contain horizontal overflow (prevent horizontal scrollbar)
    // 2. Allow vertical touch scroll events to propagate to child elements on mobile
    // Pattern: <div className="flex-1 flex flex-col min-h-0 relative overflow-x-hidden">
    const wrapperClassMatch = layoutSource.match(/<div\s+className="([^"]*flex-1[^"]*min-h-0[^"]*relative[^"]*)"/);

    expect(wrapperClassMatch).toBeTruthy();

    if (wrapperClassMatch) {
      const wrapperClasses = wrapperClassMatch[1];

      // Should have flex-1 for flex grow
      expect(wrapperClasses).toContain('flex-1');

      // Should have min-h-0 to allow shrinking in flex context
      expect(wrapperClasses).toContain('min-h-0');

      // CRITICAL: Should have overflow-x-hidden (NOT overflow-hidden)
      // overflow-hidden blocks touch scroll on mobile; overflow-x-hidden allows it
      expect(wrapperClasses).toContain('overflow-x-hidden');

      // Should NOT have overflow-hidden - this blocks mobile touch scroll
      expect(wrapperClasses).not.toContain('overflow-hidden ');
      expect(wrapperClasses).not.toMatch(/overflow-hidden$/);
      expect(wrapperClasses).not.toMatch(/overflow-hidden"/);

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
