import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import type { Language } from '@/types';

// Mock framer-motion to prevent animation issues in tests
vi.mock('framer-motion', () => {
  const ReactModule = require('react');

  const MockMotionDiv = ReactModule.forwardRef(
    function MockMotionDiv(props: Record<string, unknown>, ref: React.ForwardedRef<HTMLDivElement>) {
      const { children, className, 'data-testid': testId, drag, dragConstraints, dragElastic, onDragEnd, initial, animate, exit, transition, whileHover, whileTap, style, ...rest } = props;
      // Filter out framer-motion specific props
      void drag; void dragConstraints; void dragElastic; void onDragEnd;
      void initial; void animate; void exit; void transition; void whileHover; void whileTap; void style;
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
    m: {
      div: MockMotionDiv,
      button: MockMotionButton,
    },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  };
});

// Mock MiniGrid to avoid complex interactions
vi.mock('../onboarding/MiniGrid', () => {
  const MockMiniGrid = () => {
    return <div data-testid="mini-grid">Mini Grid</div>;
  };
  return { default: MockMiniGrid };
});

// Import after mocks
import HowToPlay from '../HowToPlay';

const renderWithLanguage = (ui: React.ReactElement, locale: Language = 'en') => {
  return render(
    <LanguageProvider initialLanguage={locale}>{ui}</LanguageProvider>
  );
};

describe('HowToPlay Neo-Brutalist Design', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Progress Section', () => {
    it('should render progress bar and step counter', () => {
      renderWithLanguage(<HowToPlay onClose={mockOnClose} />);

      const progressSection = document.querySelector('[data-testid="progress-section"]');
      expect(progressSection).toBeInTheDocument();

      // Should show "Mission Briefing" title
      expect(screen.getByText('Mission Briefing')).toBeInTheDocument();

      // Should show step counter (1 / 3 format with spaces)
      expect(screen.getByText('1 / 3')).toBeInTheDocument();
    });

    it('should update step counter when navigating', () => {
      renderWithLanguage(<HowToPlay onClose={mockOnClose} />);

      // Click Next to go to step 2
      fireEvent.click(screen.getByText('Next'));
      expect(screen.getByText('2 / 3')).toBeInTheDocument();
    });
  });

  describe('Dynamic Header', () => {
    it('should render compact header with step title and icon', () => {
      renderWithLanguage(<HowToPlay onClose={mockOnClose} />);

      const header = document.querySelector('[data-testid="compact-header"]');
      expect(header).toBeInTheDocument();

      // Header should contain step title
      expect(header?.textContent).toContain('Basics');
    });

    it('should not have a separate title-banner element', () => {
      renderWithLanguage(<HowToPlay onClose={mockOnClose} />);

      const titleBanner = document.querySelector('[data-testid="title-banner"]');
      expect(titleBanner).not.toBeInTheDocument();
    });

    it('should have close button', () => {
      renderWithLanguage(<HowToPlay onClose={mockOnClose} />);

      const closeBtn = screen.getByRole('button', { name: /close/i });
      expect(closeBtn).toBeInTheDocument();

      fireEvent.click(closeBtn);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Step Content', () => {
    it('should have step content area with min-height', () => {
      renderWithLanguage(<HowToPlay onClose={mockOnClose} />);

      const stepContent = document.querySelector('[data-testid="step-content"]');
      expect(stepContent).toBeInTheDocument();
      expect(stepContent).toHaveClass('min-h-[260px]');
    });

    it('should have scrollable overflow for long content', () => {
      renderWithLanguage(<HowToPlay onClose={mockOnClose} />);

      const stepContent = document.querySelector('[data-testid="step-content"]');
      expect(stepContent).toHaveClass('overflow-y-auto');
    });
  });

  describe('Navigation Footer', () => {
    it('should render navigation footer with back and next buttons', () => {
      renderWithLanguage(<HowToPlay onClose={mockOnClose} />);

      const navFooter = document.querySelector('[data-testid="nav-footer"]');
      expect(navFooter).toBeInTheDocument();

      expect(screen.getByText('Back')).toBeInTheDocument();
      expect(screen.getByText('Next')).toBeInTheDocument();
    });

    it('should disable back button on first step', () => {
      renderWithLanguage(<HowToPlay onClose={mockOnClose} />);

      const backBtn = screen.getByText('Back').closest('button');
      expect(backBtn).toBeDisabled();
    });

    it('should show Done button on last step', () => {
      renderWithLanguage(<HowToPlay onClose={mockOnClose} />);

      // Navigate to last step
      fireEvent.click(screen.getByText('Next'));
      fireEvent.click(screen.getByText('Next'));

      expect(screen.getByText('Done')).toBeInTheDocument();
    });

    it('should have step dots visible on desktop (sm+)', () => {
      renderWithLanguage(<HowToPlay onClose={mockOnClose} />);

      const stepDots = document.querySelector('[data-testid="step-dots"]');
      expect(stepDots).toBeInTheDocument();
      // Step dots are hidden on mobile, visible on sm+
      expect(stepDots).toHaveClass('hidden', 'sm:flex');

      const dots = stepDots?.querySelectorAll('button');
      expect(dots?.length).toBe(3);
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
