import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import type { Language } from '@/types';

// Mock framer-motion to prevent animation issues in tests
jest.mock('framer-motion', () => {
  const ReactModule = require('react');

  const MockMotionDiv = ReactModule.forwardRef(
    function MockMotionDiv(props: Record<string, unknown>, ref: React.ForwardedRef<HTMLDivElement>) {
      const { children, className, 'data-testid': testId, drag, dragConstraints, dragElastic, onDragEnd, initial, animate, exit, transition, whileHover, whileTap, ...rest } = props;
      // Filter out framer-motion specific props
      void drag; void dragConstraints; void dragElastic; void onDragEnd;
      void initial; void animate; void exit; void transition; void whileHover; void whileTap;
      return ReactModule.createElement('div', { ref, className, 'data-testid': testId, ...rest }, children);
    }
  );

  const MockMotionButton = ReactModule.forwardRef(
    function MockMotionButton(props: Record<string, unknown>, ref: React.ForwardedRef<HTMLButtonElement>) {
      const { children, className, ...rest } = props;
      return ReactModule.createElement('button', { ref, className, ...rest }, children);
    }
  );

  return {
    motion: {
      div: MockMotionDiv,
      button: MockMotionButton,
    },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  };
});

// Mock MiniGrid to avoid complex interactions
jest.mock('../onboarding/MiniGrid', () => {
  return function MockMiniGrid() {
    return <div data-testid="mini-grid">Mini Grid</div>;
  };
});

// Import after mocks
import HowToPlay from '../HowToPlay';

const renderWithLanguage = (ui: React.ReactElement, locale: Language = 'en') => {
  return render(
    <LanguageProvider initialLanguage={locale}>{ui}</LanguageProvider>
  );
};

describe('HowToPlay Mobile Compact Design', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Compact Progress Indicators', () => {
    it('should render compact step dots instead of full tabs on mobile', () => {
      renderWithLanguage(<HowToPlay onClose={mockOnClose} />);

      // Should have step dots container
      const stepDotsContainer = document.querySelector('[data-testid="step-dots"]');
      expect(stepDotsContainer).toBeInTheDocument();

      // Should have 3 step dots
      const dots = stepDotsContainer?.querySelectorAll('button');
      expect(dots?.length).toBe(3);
    });

    it('should highlight active step dot', () => {
      renderWithLanguage(<HowToPlay onClose={mockOnClose} />);

      const dots = document.querySelectorAll('[data-testid="step-dots"] button');
      // First dot should be active (have active styling)
      expect(dots[0]).toHaveClass('bg-neo-cyan');
    });

    it('should allow clicking dots to navigate between steps', () => {
      renderWithLanguage(<HowToPlay onClose={mockOnClose} />);

      const dots = document.querySelectorAll('[data-testid="step-dots"] button');

      // Click second dot
      fireEvent.click(dots[1]);

      // Second dot should now be active
      expect(dots[1]).toHaveClass('bg-neo-lime');
    });
  });

  describe('Compact Step Content', () => {
    it('should have reduced min-height for mobile content', () => {
      renderWithLanguage(<HowToPlay onClose={mockOnClose} />);

      const stepContent = document.querySelector('[data-testid="step-content"]');
      expect(stepContent).toBeInTheDocument();

      // Should have compact min-height class
      expect(stepContent).toHaveClass('min-h-[200px]');
    });

    it('should have compact padding in step content', () => {
      renderWithLanguage(<HowToPlay onClose={mockOnClose} />);

      const stepContent = document.querySelector('[data-testid="step-content"]');
      // Should have compact padding (p-3 for mobile)
      expect(stepContent).toHaveClass('p-3');
    });
  });

  describe('Compact Navigation', () => {
    it('should have inline compact navigation at bottom', () => {
      renderWithLanguage(<HowToPlay onClose={mockOnClose} />);

      const navFooter = document.querySelector('[data-testid="nav-footer"]');
      expect(navFooter).toBeInTheDocument();

      // Should have compact padding
      expect(navFooter).toHaveClass('p-3');
    });

    it('should show step indicator (e.g. 1/3) in compact form', () => {
      renderWithLanguage(<HowToPlay onClose={mockOnClose} />);

      // Should show step number in compact format
      expect(screen.getByText('1/3')).toBeInTheDocument();
    });
  });

  describe('Compact Header', () => {
    it('should not have separate title banner on mobile', () => {
      renderWithLanguage(<HowToPlay onClose={mockOnClose} />);

      // Title should be integrated into header, not separate banner
      const titleBanner = document.querySelector('[data-testid="title-banner"]');
      // In compact mode, title is shown inline, not as separate banner
      expect(titleBanner).not.toBeInTheDocument();
    });

    it('should show current step title inline with dots', () => {
      renderWithLanguage(<HowToPlay onClose={mockOnClose} />);

      const header = document.querySelector('[data-testid="compact-header"]');
      expect(header).toBeInTheDocument();

      // Header should contain step icon and title
      expect(header?.textContent).toContain('Basics');
    });
  });

  describe('Swipe Navigation', () => {
    it('should have swipeable container for step content', () => {
      renderWithLanguage(<HowToPlay onClose={mockOnClose} />);

      const swipeContainer = document.querySelector('[data-testid="swipe-container"]');
      expect(swipeContainer).toBeInTheDocument();
    });
  });
});
