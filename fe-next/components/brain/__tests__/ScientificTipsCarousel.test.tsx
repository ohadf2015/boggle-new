/**
 * ScientificTipsCarousel Tests
 *
 * Tests for RTL arrow direction and dot indicators
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock framer-motion before imports
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div className={className} {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@/utils/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark' }),
}));

// Mock language context with dir control
const mockDir = { current: 'ltr' };
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: mockDir.current === 'rtl' ? 'he' : 'en',
    dir: mockDir.current,
  }),
}));

// Import component after mocks
import ScientificTipsCarousel from '../ScientificTipsCarousel';

describe('ScientificTipsCarousel', () => {
  beforeEach(() => {
    mockDir.current = 'ltr';
  });

  describe('RTL arrow icons', () => {
    it('renders navigation buttons with SVG icons in LTR mode', () => {
      mockDir.current = 'ltr';
      const { container } = render(<ScientificTipsCarousel />);

      // Get all navigation buttons (first and last in the navigation bar)
      const navButtons = container.querySelectorAll('button[class*="rounded-lg"]');
      expect(navButtons.length).toBeGreaterThanOrEqual(2);

      // Both buttons should have SVG icons
      const leftButton = navButtons[0];
      const rightButton = navButtons[navButtons.length - 1];

      expect(leftButton.querySelector('svg')).toBeInTheDocument();
      expect(rightButton.querySelector('svg')).toBeInTheDocument();
    });

    it('renders navigation buttons with SVG icons in RTL mode', () => {
      mockDir.current = 'rtl';
      const { container } = render(<ScientificTipsCarousel />);

      const navButtons = container.querySelectorAll('button[class*="rounded-lg"]');
      expect(navButtons.length).toBeGreaterThanOrEqual(2);

      // Both buttons should still have SVG icons in RTL mode
      const leftButton = navButtons[0];
      const rightButton = navButtons[navButtons.length - 1];

      expect(leftButton.querySelector('svg')).toBeInTheDocument();
      expect(rightButton.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('dot indicators', () => {
    it('renders dots with shrink-0 to prevent stretching', () => {
      const { container } = render(<ScientificTipsCarousel />);

      // Find dot buttons (small buttons with rounded-full)
      const dots = container.querySelectorAll('button.rounded-full');
      expect(dots.length).toBe(5); // 5 tips

      // Each dot should have shrink-0 to prevent stretching
      dots.forEach((dot) => {
        const className = dot.className;
        expect(className).toMatch(/shrink-0/);
      });
    });

    it('dots have aspect-square for circular appearance', () => {
      const { container } = render(<ScientificTipsCarousel />);

      const dots = container.querySelectorAll('button.rounded-full');
      dots.forEach((dot) => {
        const className = dot.className;
        // Should maintain aspect ratio with aspect-square
        expect(className).toMatch(/aspect-square/);
      });
    });

    it('renders dots with proper sizing classes - smaller circles for better appearance', () => {
      const { container } = render(<ScientificTipsCarousel />);

      const dots = container.querySelectorAll('button.rounded-full');
      dots.forEach((dot) => {
        const className = dot.className;
        // Should have smaller width and height classes (w-1.5 h-1.5 = 6px)
        expect(className).toMatch(/w-1\.5/);
        expect(className).toMatch(/h-1\.5/);
      });
    });
  });
});
