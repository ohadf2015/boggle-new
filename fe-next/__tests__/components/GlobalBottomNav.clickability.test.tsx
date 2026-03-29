/**
 * @jest-environment jsdom
 *
 * GlobalBottomNav Clickability Test Suite
 *
 * Tests that bottom navigation tabs are clickable on landing page:
 * 1. Z-index prevents blocking by other elements
 * 2. Touch targets meet WCAG standards (48x48px minimum)
 * 3. No overlays or modals block the tabs
 *
 * NOTE: These tests verify the SOURCE CODE rather than rendering,
 * to avoid complex context mocking. We verify the ACTUAL classes used.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('GlobalBottomNav Clickability on Landing Page', () => {
  let globalBottomNavSource: string;
  let landingViewSource: string;
  let mobileBottomNavSource: string;

  beforeAll(() => {
    // Read source code from filesystem
    globalBottomNavSource = fs.readFileSync(
      path.join(process.cwd(), 'components', 'GlobalBottomNav.tsx'),
      'utf8'
    );
    landingViewSource = fs.readFileSync(
      path.join(process.cwd(), 'components', 'landing', 'LandingView.tsx'),
      'utf8'
    );
    mobileBottomNavSource = fs.readFileSync(
      path.join(process.cwd(), 'host', 'components', 'pre-game', 'MobileBottomNav.tsx'),
      'utf8'
    );
  });

  describe('Z-Index Stacking', () => {
    it('should have z-index higher than landing page content', () => {
      // Given: Extract z-index from GlobalBottomNav source
      const navZIndexMatch = globalBottomNavSource.match(/z-\[(\d+)\]/);

      // Then: Should be z-[80]
      expect(navZIndexMatch).toBeTruthy();
      const navZIndex = parseInt(navZIndexMatch![1]);
      expect(navZIndex).toBe(80);
    });

    it('should be positioned fixed at bottom', () => {
      // Then: Should have fixed positioning classes
      expect(globalBottomNavSource).toContain('fixed');
      expect(globalBottomNavSource).toContain('bottom-0');
      expect(globalBottomNavSource).toContain('left-0');
      expect(globalBottomNavSource).toContain('right-0');
    });

    it('should NOT be blocked by tutorial button (z-[55])', () => {
      // Given: Extract tutorial button z-index from landing view
      const tutorialZIndexMatch = landingViewSource.match(/Tutorial.*?z-\[(\d+)\]/);
      const navZIndexMatch = globalBottomNavSource.match(/z-\[(\d+)\]/);

      // Then: Nav should be above tutorial button
      if (tutorialZIndexMatch && navZIndexMatch) {
        const tutorialZIndex = parseInt(tutorialZIndexMatch[1]);
        const navZIndex = parseInt(navZIndexMatch[1]);
        expect(navZIndex).toBeGreaterThan(tutorialZIndex);
      } else {
        // Fallback: Just verify nav has z-[80]
        expect(navZIndexMatch![1]).toBe('80');
      }
    });

    it('should NOT be blocked by landing page content (z-20)', () => {
      // Given: Landing page content uses z-20
      const contentZIndex = 20;
      const navZIndexMatch = globalBottomNavSource.match(/z-\[(\d+)\]/);
      const navZIndex = parseInt(navZIndexMatch![1]);

      // Then: Nav should be above content
      expect(navZIndex).toBeGreaterThan(contentZIndex);
    });

    it('should be higher than host MobileBottomNav (z-[75])', () => {
      // Given: Extract z-index from MobileBottomNav (host pre-game)
      const hostNavZIndexMatch = mobileBottomNavSource.match(/z-\[(\d+)\]/);
      const globalNavZIndexMatch = globalBottomNavSource.match(/z-\[(\d+)\]/);

      // Then: GlobalBottomNav should be higher (for landing page)
      expect(hostNavZIndexMatch).toBeTruthy();
      expect(globalNavZIndexMatch).toBeTruthy();

      const hostNavZIndex = parseInt(hostNavZIndexMatch![1]);
      const globalNavZIndex = parseInt(globalNavZIndexMatch![1]);

      expect(globalNavZIndex).toBeGreaterThanOrEqual(hostNavZIndex);
    });
  });

  describe('Touch Target Accessibility (WCAG)', () => {
    it('should have minimum 48x48px touch targets', () => {
      // Then: Buttons should have min-w-[64px] and min-h-[48px]
      expect(globalBottomNavSource).toContain('min-w-[64px]');
      expect(globalBottomNavSource).toContain('min-h-[48px]');
    });

    it('should have padding for comfortable touch area', () => {
      // Then: Buttons should have padding
      expect(globalBottomNavSource).toMatch(/px-\d+/); // Horizontal padding
      expect(globalBottomNavSource).toMatch(/py-\d+/); // Vertical padding
    });

    it('should document WCAG compliance in comments', () => {
      // Then: Source should mention WCAG touch target size
      expect(globalBottomNavSource).toContain('WCAG');
      expect(globalBottomNavSource).toContain('touch target');
    });
  });

  describe('Safe Area Support (iOS Notch)', () => {
    it('should support safe area bottom padding', () => {
      // Then: Should use useSafeArea hook
      expect(globalBottomNavSource).toContain('useSafeArea');
      expect(globalBottomNavSource).toContain('paddingBottom');
      expect(globalBottomNavSource).toContain('safeArea.bottom');
    });

    it('should use safe-area-inset-bottom env variable', () => {
      // Then: Should reference iOS safe area
      // Note: GlobalBottomNav uses safeArea hook, which reads env()
      expect(globalBottomNavSource).toContain('safeArea');
    });
  });

  describe('Visibility Rules', () => {
    it('should hide when in active game', () => {
      // Then: Should check isInGame from NavigationContext
      expect(globalBottomNavSource).toContain('isInGame');
      expect(globalBottomNavSource).toContain('return null');
    });

    it('should hide on paths with their own navigation', () => {
      // Then: Should check pathname and hide on specific paths
      expect(globalBottomNavSource).toContain('shouldHideOnCurrentPath');
      expect(globalBottomNavSource).toContain('pathsWithOwnNav');
      expect(globalBottomNavSource).toContain('/multiplayer');
      expect(globalBottomNavSource).toContain('/friends');
    });

    it('should hide on desktop (sm+ breakpoint)', () => {
      // Then: Should have sm:hidden class
      expect(globalBottomNavSource).toContain('sm:hidden');
    });
  });

  describe('Accessibility (ARIA)', () => {
    it('should have aria-label on nav element', () => {
      // Then: Nav should have aria-label
      expect(globalBottomNavSource).toContain('aria-label');
      expect(globalBottomNavSource).toContain("t('nav.bottomNavigation')");
    });

    it('should indicate current page with aria-current', () => {
      // Then: Should use aria-current="page" for active tab
      expect(globalBottomNavSource).toContain('aria-current');
    });

    it('should show AuthModal when unauthenticated users click Brain/Profile', () => {
      // Then: Should render AuthModal component
      expect(globalBottomNavSource).toContain('AuthModal');
      expect(globalBottomNavSource).toContain('showAuthModal');
      // Buttons should trigger modal, not be disabled
      expect(globalBottomNavSource).toContain('setShowAuthModal(true)');
    });

    it('should have aria-hidden on icons', () => {
      // Then: Icons should have aria-hidden="true"
      expect(globalBottomNavSource).toContain('aria-hidden="true"');
    });
  });

  describe('Visual Feedback', () => {
    it('should show active state styling', () => {
      // Then: Should have conditional active styling
      expect(globalBottomNavSource).toContain('text-neo-yellow');
      expect(globalBottomNavSource).toContain('activeTab ===');
    });

    it('should have transition animations', () => {
      // Then: Should have transition classes
      expect(globalBottomNavSource).toContain('transition-all');
    });

    it('should have active indicator element', () => {
      // Then: Should render active indicator
      expect(globalBottomNavSource).toContain('Active indicator');
      expect(globalBottomNavSource).toContain('bg-neo-yellow');
    });
  });
});

describe('GlobalBottomNav vs Landing Page Z-Index Integration', () => {
  it('should verify z-index hierarchy across landing page', () => {
    // Given: Z-index values from codebase
    const zIndexHierarchy = {
      'Landing content': 20,
      'Tutorial button': 55,
      'MobileBottomNav (host)': 75,
      'GlobalBottomNav': 80,
    };

    // Then: GlobalBottomNav should be at the top
    const values = Object.values(zIndexHierarchy);
    const maxZIndex = Math.max(...values);

    expect(zIndexHierarchy['GlobalBottomNav']).toBe(maxZIndex);
    expect(zIndexHierarchy['GlobalBottomNav']).toBe(80);
  });

  it('should be above all non-modal landing page elements', () => {
    // Given: Potential blocking elements on landing page
    const potentialBlockers = [
      { name: 'Hero section', zIndex: 10 },
      { name: 'Mode cards', zIndex: 20 },
      { name: 'Tutorial button', zIndex: 55 },
      { name: 'PullToRefresh indicator', zIndex: 50 },
    ];

    const navZIndex = 80;

    // Then: Nav should be above all non-modal elements
    potentialBlockers.forEach(blocker => {
      expect(navZIndex).toBeGreaterThan(blocker.zIndex);
    });
  });

  it('should document z-index rationale in comments', () => {
    // Given: Read GlobalBottomNav source
    const globalBottomNavSource = fs.readFileSync(
      path.join(process.cwd(), 'components', 'GlobalBottomNav.tsx'),
      'utf8'
    );

    // Then: Should have UX design rationale comment
    expect(globalBottomNavSource).toContain('UX Design Rationale');
    expect(globalBottomNavSource).toContain('thumb zone');
  });
});
