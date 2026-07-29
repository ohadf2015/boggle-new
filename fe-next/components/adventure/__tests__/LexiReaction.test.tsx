/**
 * LexiReaction Component Tests
 *
 * Tests reaction display, RTL positioning, tap-to-speed, and reduced motion.
 */

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { LexiReaction } from '../LexiReaction';
import type { LexiReaction as LexiReactionType } from '@/hooks/useLexiReactions';

// Mock dependencies
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'adventure.lexi.longWord.default': 'Wow! Long word!',
        'adventure.lexi.combo3x.default': "You're on a roll!",
      };
      return translations[key] || key;
    },
  }),
}));

const mockDevicePerformance = {
  prefersReducedMotion: false,
  isMobile: false,
  enableComplexAnimations: true,
  enableGlowEffects: true,
  isLowEnd: false,
};

vi.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => mockDevicePerformance,
}));

// Mock InteractiveMascot
vi.mock('@/components/ui/InteractiveMascot', () => ({
  InteractiveMascot: ({ variant, size }: { variant: string; size: string }) => (
    <div data-testid="interactive-mascot" data-variant={variant} data-size={size}>
      Mascot
    </div>
  ),
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div {...props}>{children}</div>
    ),
    span: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <span {...props}>{children}</span>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

describe('LexiReaction', () => {
  const createReaction = (overrides?: Partial<LexiReactionType>): LexiReactionType => ({
    id: 1,
    type: 'celebration',
    variant: 'celebrating',
    messageKey: 'adventure.lexi.longWord.default',
    priority: 'normal',
    ...overrides,
  });

  const mockOnDismiss = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    mockOnDismiss.mockClear();
    mockDevicePerformance.prefersReducedMotion = false;
    document.documentElement.dir = 'ltr';
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('rendering', () => {
    it('renders nothing when reaction is null', () => {
      render(<LexiReaction reaction={null} onDismiss={mockOnDismiss} />);

      expect(screen.queryByTestId('lexi-reaction')).not.toBeInTheDocument();
    });

    it('renders reaction when provided', () => {
      const reaction = createReaction();

      render(<LexiReaction reaction={reaction} onDismiss={mockOnDismiss} />);

      expect(screen.getByTestId('lexi-reaction')).toBeInTheDocument();
      expect(screen.getByText('Wow! Long word!')).toBeInTheDocument();
      expect(screen.getByTestId('interactive-mascot')).toBeInTheDocument();
    });

    it('displays mascot with correct variant', () => {
      const reaction = createReaction({ variant: 'victory' });

      render(<LexiReaction reaction={reaction} onDismiss={mockOnDismiss} />);

      const mascot = screen.getByTestId('interactive-mascot');
      expect(mascot).toHaveAttribute('data-variant', 'victory');
    });
  });

  describe('RTL positioning', () => {
    it('positions on right side for LTR', () => {
      document.documentElement.dir = 'ltr';
      const reaction = createReaction();

      render(<LexiReaction reaction={reaction} onDismiss={mockOnDismiss} />);

      const container = screen.getByTestId('lexi-reaction');
      expect(container).toHaveClass('right-4');
      expect(container).not.toHaveClass('left-4');
    });

    it('positions on left side for RTL', () => {
      document.documentElement.dir = 'rtl';
      const reaction = createReaction();

      // Trigger re-render after RTL change
      const { rerender } = render(
        <LexiReaction reaction={reaction} onDismiss={mockOnDismiss} />
      );

      // Force MutationObserver callback (simulated)
      rerender(<LexiReaction reaction={reaction} onDismiss={mockOnDismiss} />);

      const container = screen.getByTestId('lexi-reaction');
      expect(container).toHaveClass('left-4');
    });
  });

  describe('tap-to-speed interaction', () => {
    it('calls onDismiss on double tap', async () => {
      const reaction = createReaction();

      render(<LexiReaction reaction={reaction} onDismiss={mockOnDismiss} />);

      const container = screen.getByTestId('lexi-reaction');

      // First tap
      fireEvent.click(container);
      // Second tap within threshold
      fireEvent.click(container);

      expect(mockOnDismiss).toHaveBeenCalledTimes(1);
    });

    it('speeds up animation on single tap', () => {
      const reaction = createReaction();

      render(<LexiReaction reaction={reaction} onDismiss={mockOnDismiss} />);

      const container = screen.getByTestId('lexi-reaction');

      // Single tap
      fireEvent.click(container);

      // Wait for timeout to not trigger double-tap
      act(() => {
        vi.advanceTimersByTime(400);
      });

      // Speed indicator should appear (if visible in DOM)
      // The animation speed change is internal state
      expect(mockOnDismiss).not.toHaveBeenCalled();
    });
  });

  describe('auto-dismiss', () => {
    it('calls onDismiss after display duration', () => {
      const reaction = createReaction();

      render(<LexiReaction reaction={reaction} onDismiss={mockOnDismiss} />);

      // Fast-forward past display duration
      act(() => {
        vi.advanceTimersByTime(2500);
      });

      expect(mockOnDismiss).toHaveBeenCalledTimes(1);
    });

    it('dismisses faster when animation is sped up', () => {
      const reaction = createReaction();

      render(<LexiReaction reaction={reaction} onDismiss={mockOnDismiss} />);

      const container = screen.getByTestId('lexi-reaction');

      // Speed up with single tap
      fireEvent.click(container);

      // Wait past threshold to avoid double-tap
      act(() => {
        vi.advanceTimersByTime(400);
      });

      // At 2x speed, should dismiss in ~1000ms instead of 2000ms
      act(() => {
        vi.advanceTimersByTime(700);
      });

      expect(mockOnDismiss).toHaveBeenCalled();
    });
  });

  describe('reduced motion', () => {
    it('renders static version when prefersReducedMotion is true', () => {
      mockDevicePerformance.prefersReducedMotion = true;
      const reaction = createReaction();

      render(<LexiReaction reaction={reaction} onDismiss={mockOnDismiss} />);

      // Should still render, but with static content
      expect(screen.getByTestId('lexi-reaction')).toBeInTheDocument();
      expect(screen.getByText('Wow! Long word!')).toBeInTheDocument();
    });

    it('dismisses on single tap with reduced motion', () => {
      mockDevicePerformance.prefersReducedMotion = true;
      const reaction = createReaction();

      render(<LexiReaction reaction={reaction} onDismiss={mockOnDismiss} />);

      const container = screen.getByTestId('lexi-reaction');
      fireEvent.click(container);

      // Single tap should dismiss immediately in reduced motion
      expect(mockOnDismiss).toHaveBeenCalledTimes(1);
    });
  });

  describe('accessibility', () => {
    it('has correct aria-label', () => {
      const reaction = createReaction();

      render(<LexiReaction reaction={reaction} onDismiss={mockOnDismiss} />);

      const container = screen.getByTestId('lexi-reaction');
      expect(container).toHaveAttribute('aria-label');
    });

    it('is keyboard accessible', () => {
      const reaction = createReaction();

      render(<LexiReaction reaction={reaction} onDismiss={mockOnDismiss} />);

      const container = screen.getByTestId('lexi-reaction');

      // Can be focused
      expect(container).toHaveAttribute('tabIndex', '0');

      // Enter key triggers interaction
      fireEvent.keyDown(container, { key: 'Enter' });
      fireEvent.keyDown(container, { key: 'Enter' });

      expect(mockOnDismiss).toHaveBeenCalled();
    });
  });

  describe('translation fallback', () => {
    it('uses default key when world-specific is not found', () => {
      const reaction = createReaction({
        messageKey: 'adventure.lexi.longWord.world1',
      });

      render(<LexiReaction reaction={reaction} onDismiss={mockOnDismiss} />);

      // Should fall back to default translation
      expect(screen.getByText('Wow! Long word!')).toBeInTheDocument();
    });
  });
});
