/**
 * QuickDrillsSection Tests
 *
 * Tests for responsive sizing and desktop display
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock framer-motion before imports
jest.mock('framer-motion', () => ({
  motion: {
    button: ({ children, className, ...props }: React.HTMLAttributes<HTMLButtonElement>) => (
      <button className={className} {...props}>{children}</button>
    ),
    div: ({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div className={className} {...props}>{children}</div>
    ),
  },
}));

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

jest.mock('@/utils/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark' }),
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
  }),
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    profile: { total_games: 10 },
  }),
}));

jest.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Import component after mocks
import QuickDrillsSection from '../QuickDrillsSection';

describe('QuickDrillsSection', () => {
  describe('responsive sizing for desktop', () => {
    it('renders with responsive grid gap classes for desktop', () => {
      const { container } = render(<QuickDrillsSection />);

      // Grid container should have responsive gap
      const gridContainer = container.querySelector('.grid');
      expect(gridContainer).toBeInTheDocument();
      expect(gridContainer?.className).toMatch(/md:gap-4|lg:gap-4/);
    });

    it('renders drill buttons with responsive padding for desktop', () => {
      const { container } = render(<QuickDrillsSection />);

      // Buttons should have responsive padding (md:p-4 or similar)
      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBeGreaterThan(0);

      const firstButton = buttons[0];
      expect(firstButton?.className).toMatch(/md:p-[34]|lg:p-[34]/);
    });

    it('renders icons with responsive sizing for desktop', () => {
      const { container } = render(<QuickDrillsSection />);

      // Icon containers should have responsive sizing (md:w-12 or similar)
      const iconContainers = container.querySelectorAll('.border-neo-black.flex.items-center.justify-center');
      expect(iconContainers.length).toBeGreaterThan(0);

      const firstIconContainer = iconContainers[0];
      expect(firstIconContainer?.className).toMatch(/md:w-1[012]|lg:w-1[012]/);
    });

    it('renders title text with responsive font size for desktop', () => {
      const { container } = render(<QuickDrillsSection />);

      // Title text should scale up on desktop
      const titleElements = container.querySelectorAll('.font-bold.text-left');
      expect(titleElements.length).toBeGreaterThan(0);

      const firstTitle = titleElements[0];
      expect(firstTitle?.className).toMatch(/md:text-sm|md:text-base|lg:text-sm|lg:text-base/);
    });

    it('renders section header with responsive font size for desktop', () => {
      render(<QuickDrillsSection />);

      // Section header should be visible and have responsive sizing
      const header = screen.getByText('brain.quickDrills');
      expect(header).toBeInTheDocument();
      expect(header?.className).toMatch(/md:text-xl|lg:text-xl/);
    });
  });

  describe('basic rendering', () => {
    it('renders all drill buttons', () => {
      const { container } = render(<QuickDrillsSection />);

      const buttons = container.querySelectorAll('button');
      // Should have 5 drills
      expect(buttons.length).toBe(5);
    });

    it('renders drill names', () => {
      render(<QuickDrillsSection />);

      // Should render translation keys for drill names
      expect(screen.getByText('brain.drills.lightning-round.name')).toBeInTheDocument();
      expect(screen.getByText('brain.drills.memory-hunt.name')).toBeInTheDocument();
      expect(screen.getByText('brain.drills.combo-master.name')).toBeInTheDocument();
    });
  });
});
