/**
 * Test: GlobalBottomNav z-index must be higher than other fixed elements
 *
 * Bug Context:
 * - GlobalBottomNav has z-50 (components/GlobalBottomNav.tsx:97)
 * - Tutorial button in LandingView has z-[55] (components/landing/LandingView.tsx:500)
 * - MobileDrawer has z-[60] (components/layout/MobileDrawer.tsx)
 * - Header has z-[60] and z-70 overlay
 * - This makes bottom nav tabs unclickable
 *
 * Expected Behavior:
 * - GlobalBottomNav should have highest z-index (z-[80] or higher)
 * - Navigation tabs should be clickable at all times
 * - No fixed elements should cover the bottom nav
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { GlobalBottomNav } from '@/components/GlobalBottomNav';

// Mock dependencies
jest.mock('next/navigation', () => ({
  usePathname: () => '/en',
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
  }),
}));

jest.mock('@/contexts/NavigationContext', () => ({
  useNavigation: () => ({
    isInGame: false,
  }),
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: true,
  }),
}));

jest.mock('@/utils/ThemeContext', () => ({
  useTheme: jest.fn(() => ({ theme: 'dark' })),
}));

jest.mock('@/components/auth/AuthModal', () => ({
  __esModule: true,
  default: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => (
    isOpen ? <div data-testid="auth-modal" onClick={onClose}>AuthModal</div> : null
  ),
}));

jest.mock('@/hooks/useSafeArea', () => ({
  useSafeArea: () => ({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  }),
}));

describe('GlobalBottomNav z-index', () => {
  test('should have z-index higher than all other fixed elements', () => {
    const { container } = render(<GlobalBottomNav />);

    const nav = container.querySelector('nav');
    expect(nav).toBeInTheDocument();

    const className = nav?.className || '';

    // Known z-index values in the app:
    // - Tutorial button: z-[55]
    // - MobileDrawer: z-[60]
    // - Header overlay: z-70
    // - Various animations: z-[70] to z-[79]

    // GlobalBottomNav must be HIGHER than all of these (z-80 or above)
    const zIndexMatch = className.match(/z-(\d+)|z-\[(\d+)\]/);
    expect(zIndexMatch).toBeTruthy();

    const zIndex = zIndexMatch ? parseInt(zIndexMatch[1] || zIndexMatch[2], 10) : 0;

    // Must be at least z-80 to be above all overlays
    expect(zIndex).toBeGreaterThanOrEqual(80);
  });

  test('should be clickable above all overlay elements', () => {
    const { container } = render(
      <>
        {/* Simulate overlays with various z-indexes */}
        <div
          data-testid="tutorial-button"
          style={{
            position: 'fixed',
            bottom: '80px',
            right: '16px',
            zIndex: 55,
            width: '48px',
            height: '48px',
            backgroundColor: 'purple',
          }}
        />
        <div
          data-testid="drawer-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 60,
            backgroundColor: 'rgba(0,0,0,0.5)',
          }}
        />
        <div
          data-testid="header-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 70,
            backgroundColor: 'rgba(0,0,0,0.5)',
          }}
        />

        {/* Bottom nav should be above all of these */}
        <GlobalBottomNav />
      </>
    );

    const nav = container.querySelector('nav');
    const homeButton = screen.getByLabelText(/nav\.home/i);

    // Buttons should be present
    expect(nav).toBeInTheDocument();
    expect(homeButton).toBeInTheDocument();

    // Nav should have higher z-index than overlays
    const navZIndex = window.getComputedStyle(nav!).zIndex;
    const overlayZIndex = window.getComputedStyle(screen.getByTestId('header-overlay')).zIndex;

    // Even if getComputedStyle doesn't work in JSDOM, check className
    const className = nav?.className || '';
    expect(className).toMatch(/z-\[?80/); // Should have z-80 or higher
  });

  test('should not use z-50 (too low)', () => {
    const { container } = render(<GlobalBottomNav />);

    const nav = container.querySelector('nav');
    const className = nav?.className || '';

    // Should NOT use z-50 (conflicts with other elements)
    expect(className).not.toContain('z-50');
  });
});
