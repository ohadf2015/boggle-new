/**
 * AchievementDock Tests
 *
 * Tests for the AchievementDock component that displays achievements during gameplay.
 * Focus on: proper rendering, expanded panel positioning, RTL support.
 *
 * Note: The expanded panel is rendered via Portal to document.body to escape
 * overflow:hidden containers. Tests must query from document.body for panel elements.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AchievementDock from '../AchievementDock';
import { LanguageProvider } from '@/contexts/LanguageContext';
import '@testing-library/jest-dom';

// Mock next/navigation for tests
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/en/singleplayer',
}));

// Mock framer-motion to allow class inspection and simplify animations
jest.mock('framer-motion', () => ({
  motion: {
    div: React.forwardRef<HTMLDivElement, React.PropsWithChildren<{ className?: string; style?: React.CSSProperties; onClick?: () => void }>>(
      function MotionDiv({ children, className, style, onClick, ...props }, ref) {
        return (
          <div ref={ref} className={className} style={style} onClick={onClick} data-testid="motion-div" {...props}>
            {children}
          </div>
        );
      }
    ),
    button: React.forwardRef<HTMLButtonElement, React.PropsWithChildren<{ className?: string; onClick?: () => void }>>(
      function MotionButton({ children, className, onClick, ...props }, ref) {
        return (
          <button ref={ref} className={className} onClick={onClick} data-testid="motion-button" {...props}>
            {children}
          </button>
        );
      }
    ),
    span: React.forwardRef<HTMLSpanElement, React.PropsWithChildren<{ className?: string }>>(
      function MotionSpan({ children, className, ...props }, ref) {
        return (
          <span ref={ref} className={className} data-testid="motion-span" {...props}>
            {children}
          </span>
        );
      }
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren<object>) => <>{children}</>,
}));

// Mock Radix UI tooltip
jest.mock('@radix-ui/react-tooltip', () => ({
  Provider: ({ children }: React.PropsWithChildren<object>) => <>{children}</>,
  Root: ({ children }: React.PropsWithChildren<object>) => <>{children}</>,
  Trigger: React.forwardRef<HTMLDivElement, React.PropsWithChildren<{ asChild?: boolean }>>(
    function TooltipTrigger({ children }, ref) {
      return <div ref={ref}>{children}</div>;
    }
  ),
  Portal: ({ children }: React.PropsWithChildren<object>) => <>{children}</>,
  Content: () => null,
}));

// Mock getBoundingClientRect for button positioning
const mockGetBoundingClientRect = jest.fn(() => ({
  top: 16,
  left: 300,
  right: 356, // 300 + 56 (button width)
  bottom: 72, // 16 + 56 (button height)
  width: 56,
  height: 56,
  x: 300,
  y: 16,
  toJSON: () => {},
}));

// Helper to clean up portaled elements after each test
afterEach(() => {
  // Remove any portaled elements that may have been added to document.body
  const portaledElements = document.body.querySelectorAll('.bg-neo-cream');
  portaledElements.forEach(el => el.remove());
});

describe('AchievementDock', () => {
  const testAchievements = [
    { key: 'FIRST_BLOOD', icon: '🩸' },
    { key: 'WORD_MASTER', icon: '📚' },
  ];

  const renderWithLanguage = (achievements: typeof testAchievements, language: 'en' | 'he' = 'en') => {
    return render(
      <LanguageProvider initialLanguage={language}>
        <AchievementDock achievements={achievements} />
      </LanguageProvider>
    );
  };

  // Setup mock for button position before each test
  beforeEach(() => {
    Element.prototype.getBoundingClientRect = mockGetBoundingClientRect;
    // Mock window.innerWidth for RTL/LTR calculations
    Object.defineProperty(window, 'innerWidth', { value: 400, writable: true });
  });

  describe('rendering', () => {
    test('should not render when no achievements', () => {
      const { container } = renderWithLanguage([]);
      expect(container.firstChild).toBeNull();
    });

    test('should render trophy button when achievements exist', () => {
      renderWithLanguage(testAchievements);

      // Should find the trophy emoji
      expect(screen.getByText('🏆')).toBeInTheDocument();
    });

    test('should show achievement count badge', () => {
      renderWithLanguage(testAchievements);

      // Should show count "2" for two achievements
      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });

  describe('expanded panel (Portal)', () => {
    test('should show expanded panel when button is clicked', async () => {
      renderWithLanguage(testAchievements);

      // Find and click the trophy button
      const trophyButton = screen.getByRole('button');
      fireEvent.click(trophyButton);

      // Panel should now be visible in document.body - check for achievement icons
      await waitFor(() => {
        expect(screen.getByText('🩸')).toBeInTheDocument();
        expect(screen.getByText('📚')).toBeInTheDocument();
      });
    });

    test('should render panel with proper structure via Portal', async () => {
      renderWithLanguage(testAchievements);

      const trophyButton = screen.getByRole('button');
      fireEvent.click(trophyButton);

      await waitFor(() => {
        // Panel is portaled to document.body - query from there
        const panel = document.body.querySelector('.bg-neo-cream');
        expect(panel).toBeInTheDocument();

        // Should have pink header
        const header = document.body.querySelector('.bg-neo-pink');
        expect(header).toBeInTheDocument();
      });
    });

    test('expanded panel should have fixed positioning with inline styles (LTR)', async () => {
      renderWithLanguage(testAchievements, 'en');

      const trophyButton = screen.getByRole('button');
      fireEvent.click(trophyButton);

      await waitFor(() => {
        // Panel uses fixed positioning via inline styles for Portal
        const panel = document.body.querySelector('.bg-neo-cream') as HTMLElement;
        expect(panel).toBeInTheDocument();
        // In LTR, should have right position in style
        expect(panel?.style.position).toBe('fixed');
        // Right position should be set (window.innerWidth - button.right = 400 - 356 = 44)
        expect(panel?.style.right).toBeTruthy();
      });
    });

    test('expanded panel should have fixed positioning with inline styles (RTL)', async () => {
      renderWithLanguage(testAchievements, 'he');

      const trophyButton = screen.getByRole('button');
      fireEvent.click(trophyButton);

      await waitFor(() => {
        // Panel uses fixed positioning via inline styles for Portal
        const panel = document.body.querySelector('.bg-neo-cream') as HTMLElement;
        expect(panel).toBeInTheDocument();
        // RTL should also use right positioning since the button is always
        // positioned on the right side of the screen (via className="right-4")
        expect(panel?.style.position).toBe('fixed');
        // Right position should be set (window.innerWidth - button.right = 400 - 356 = 44)
        expect(panel?.style.right).toBeTruthy();
      });
    });
  });

  describe('auto-expand on new achievement', () => {
    test('should auto-expand when new achievement is added', async () => {
      const { rerender } = render(
        <LanguageProvider initialLanguage="en">
          <AchievementDock achievements={[testAchievements[0]]} />
        </LanguageProvider>
      );

      // Initially panel should not be visible in document.body
      expect(document.body.querySelector('.bg-neo-cream')).not.toBeInTheDocument();

      // Add a new achievement
      rerender(
        <LanguageProvider initialLanguage="en">
          <AchievementDock achievements={testAchievements} />
        </LanguageProvider>
      );

      // Panel should auto-expand (portaled to document.body)
      await waitFor(() => {
        const panel = document.body.querySelector('.bg-neo-cream');
        expect(panel).toBeInTheDocument();
      }, { timeout: 1000 });
    });
  });

  describe('z-index and positioning', () => {
    test('should have high z-index for proper layering', () => {
      const { container } = renderWithLanguage(testAchievements);

      // Root container should have z-40
      const rootDiv = container.firstChild as HTMLElement;
      expect(rootDiv?.className).toContain('z-40');
    });

    test('trophy button should have proper neo-brutalist styling', () => {
      renderWithLanguage(testAchievements);

      const button = screen.getByRole('button');
      expect(button.className).toContain('bg-neo-lime');
      expect(button.className).toContain('border-4');
      expect(button.className).toContain('border-neo-black');
    });

    test('panel should have very high z-index to escape stacking contexts', async () => {
      renderWithLanguage(testAchievements);

      const trophyButton = screen.getByRole('button');
      fireEvent.click(trophyButton);

      await waitFor(() => {
        const panel = document.body.querySelector('.bg-neo-cream') as HTMLElement;
        expect(panel).toBeInTheDocument();
        // Panel should have z-index 9999 for Portal rendering
        expect(panel?.style.zIndex).toBe('9999');
      });
    });
  });
});
