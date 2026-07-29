/**
 * ScientificTipsCarousel Tests
 *
 * Tests for RTL arrow direction, dot indicators, and research citations
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock framer-motion before imports
vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, className, custom, variants, initial, animate, exit, transition, layoutId, ...props }: any) => (
      <div className={className} {...props}>{children}</div>
    ),
    span: ({ children, className, layoutId, transition, ...props }: any) => (
      <span className={className} {...props}>{children}</span>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/utils/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark' }),
}));

// Mock language context with dir control
const mockDir = { current: 'ltr' };
vi.mock('@/contexts/LanguageContext', () => ({
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

    it('dots have fixed height for consistent appearance', () => {
      const { container } = render(<ScientificTipsCarousel />);

      const dots = container.querySelectorAll('button.rounded-full');
      dots.forEach((dot) => {
        const className = dot.className;
        // All dots should have h-3 for consistent height
        expect(className).toMatch(/h-3/);
      });
    });

    it('renders dots with proper sizing classes (w-3 inactive, w-6 active)', () => {
      const { container } = render(<ScientificTipsCarousel />);

      const dots = container.querySelectorAll('button.rounded-full');
      // First dot is active by default
      expect(dots[0].className).toMatch(/w-6/);
      // Other dots are inactive
      expect(dots[1].className).toMatch(/w-3/);
    });
  });

  describe('research citations', () => {
    it('displays research-backed badge in header', () => {
      render(<ScientificTipsCarousel />);

      // Check for the research-backed badge translation key
      expect(screen.getByText('brain.researchBacked')).toBeInTheDocument();
    });

    it('renders source label for citations', () => {
      render(<ScientificTipsCarousel />);

      // Check for source label translation key
      expect(screen.getByText('brain.sourceLabel')).toBeInTheDocument();
    });

    it('renders external link button for source', () => {
      const { container } = render(<ScientificTipsCarousel />);

      // Find the external link anchor tag
      const externalLink = container.querySelector('a[target="_blank"]');
      expect(externalLink).toBeInTheDocument();
      expect(externalLink).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('displays tip content with translation key', () => {
      render(<ScientificTipsCarousel />);

      // Check for tip1 translation key (first tip shown by default)
      expect(screen.getByText('brain.tips.tip1')).toBeInTheDocument();
    });

    it('displays source citation with translation key', () => {
      render(<ScientificTipsCarousel />);

      // Check for source1 translation key (first source shown by default)
      expect(screen.getByText('brain.tips.source1')).toBeInTheDocument();
    });
  });

  describe('navigation functionality', () => {
    it('navigates to next tip when clicking next button', () => {
      render(<ScientificTipsCarousel />);

      // Find next button by aria-label
      const nextButton = screen.getByLabelText('common.next');
      fireEvent.click(nextButton);

      // After clicking next, tip2 should be displayed
      expect(screen.getByText('brain.tips.tip2')).toBeInTheDocument();
    });

    it('navigates to previous tip when clicking previous button', () => {
      render(<ScientificTipsCarousel />);

      // First go to tip2
      const nextButton = screen.getByLabelText('common.next');
      fireEvent.click(nextButton);

      // Then go back to tip1
      const prevButton = screen.getByLabelText('common.previous');
      fireEvent.click(prevButton);

      expect(screen.getByText('brain.tips.tip1')).toBeInTheDocument();
    });

    it('navigates to specific tip when clicking dot indicator', () => {
      render(<ScientificTipsCarousel />);

      // Click on third dot (tip3)
      const dots = screen.getAllByLabelText(/Go to tip/);
      fireEvent.click(dots[2]); // Index 2 = tip3

      expect(screen.getByText('brain.tips.tip3')).toBeInTheDocument();
    });

    it('wraps around when navigating past last tip', () => {
      render(<ScientificTipsCarousel />);

      // Go to last tip (tip5)
      const dots = screen.getAllByLabelText(/Go to tip/);
      fireEvent.click(dots[4]); // Index 4 = tip5

      // Then click next to wrap to tip1
      const nextButton = screen.getByLabelText('common.next');
      fireEvent.click(nextButton);

      expect(screen.getByText('brain.tips.tip1')).toBeInTheDocument();
    });
  });

  describe('progress bar', () => {
    it('renders progress bar at bottom of carousel', () => {
      const { container } = render(<ScientificTipsCarousel />);

      // Find the progress bar container (h-1 class)
      const progressBar = container.querySelector('.h-1');
      expect(progressBar).toBeInTheDocument();
    });
  });
});
