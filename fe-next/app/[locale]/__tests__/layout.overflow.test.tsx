/**
 * @jest-environment jsdom
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Test for mobile scroll architecture
 *
 * The correct scroll containment pattern requires:
 * 1. Body with screen-fit (provides min-height: 100dvh, overflow-y: auto, -webkit-overflow-scrolling: touch)
 * 2. Wrapper div with overflow-x-hidden (contains horizontal overflow only)
 * 3. Main with overflow-visible and proper z-index (allows content to flow naturally)
 *
 * IMPORTANT: Scroll is handled at the BODY level (screen-fit), NOT at the main level.
 * Having overflow-y: auto on BOTH body AND main creates a "scroll trap" on iOS where
 * overscroll-behavior-y: contain blocks momentum scrolling.
 *
 * The main element uses overflow-visible to allow child content to scroll naturally
 * and includes bottom padding (pb-16) for mobile bottom nav on small screens.
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

      // CRITICAL: Should have overflow-x constraint (NOT overflow-hidden)
      // overflow-hidden blocks touch scroll on mobile; overflow-x containment allows it
      // Can use either overflow-x-hidden or [overflow-x:clip] (clip is actually better)
      const hasOverflowXConstraint =
        wrapperClasses.includes('overflow-x-hidden') ||
        wrapperClasses.includes('[overflow-x:clip]');
      expect(hasOverflowXConstraint).toBe(true);

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

  it('main should use overflow-visible to allow content to flow naturally', () => {
    // Main content should use overflow-visible to:
    // 1. Allow child content to scroll naturally (scroll handled at body level)
    // 2. Support bottom padding for mobile nav (pb-16 sm:pb-0)
    // NOTE: Scroll is handled at body level, NOT at main level
    const mainMatch = layoutSource.match(/<main[^>]*className="([^"]*)"/);

    expect(mainMatch).toBeTruthy();

    if (mainMatch) {
      const mainClasses = mainMatch[1];
      // Main uses overflow-visible so child content can scroll at body level
      expect(mainClasses).toContain('overflow-visible');
      // Main has bottom padding for mobile nav (removed on sm+ screens)
      expect(mainClasses).toContain('pb-16');
      expect(mainClasses).toContain('sm:pb-0');
    }
  });
});
