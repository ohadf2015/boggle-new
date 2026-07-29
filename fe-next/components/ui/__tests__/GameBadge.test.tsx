/**
 * Tests for GameBadge Component
 *
 * Comprehensive test suite covering all variants, animations,
 * sizes, and functionality of the consolidated GameBadge component.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Sparkles, Trophy, X } from 'lucide-react';
import { GameBadge } from '../GameBadge';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  m: {
    span: ({ children, className, onClick, ...props }: any) => (
      <span className={className} onClick={onClick} data-testid="motion-span" {...props}>
        {children}
      </span>
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock useSafeTimeout - tracks timeout internally like the real hook
vi.mock('@/hooks/useSafeTimeout', () => {
  let currentTimeout: NodeJS.Timeout | null = null;
  return {
    useSafeTimeout: () => ({
      set: (callback: () => void, delay: number) => {
        // Clear any existing timeout
        if (currentTimeout) {
          global.clearTimeout(currentTimeout);
        }
        currentTimeout = global.setTimeout(callback, delay);
      },
      clear: () => {
        if (currentTimeout) {
          global.clearTimeout(currentTimeout);
          currentTimeout = null;
        }
      },
    }),
  };
});

describe('GameBadge', () => {
  beforeEach(() => {
    jest.clearAllTimers();
    vi.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  describe('Rendering', () => {
    it('should render with default props', () => {
      render(<GameBadge>Test Badge</GameBadge>);
      expect(screen.getByText('Test Badge')).toBeInTheDocument();
    });

    it('should render children correctly', () => {
      render(
        <GameBadge>
          <span>Custom Content</span>
        </GameBadge>
      );
      expect(screen.getByText('Custom Content')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <GameBadge className="custom-class">Test</GameBadge>
      );
      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });
  });

  describe('Variants', () => {
    it('should render new-player variant', () => {
      const { container } = render(
        <GameBadge variant="new-player">NEW</GameBadge>
      );
      const badge = container.querySelector('span');
      expect(badge).toHaveClass('bg-neo-pink');
      expect(badge).toHaveClass('text-neo-black'); // Black text for contrast on pink
    });

    it('should render new-feature variant', () => {
      const { container } = render(
        <GameBadge variant="new-feature">NEW!</GameBadge>
      );
      const badge = container.querySelector('span');
      expect(badge).toHaveClass('bg-neo-lime');
      expect(badge).toHaveClass('text-neo-black');
    });

    it('should render late-joiner variant', () => {
      const { container } = render(
        <GameBadge variant="late-joiner">Late</GameBadge>
      );
      const badge = container.querySelector('span');
      expect(badge).toHaveClass('bg-neo-pink/20');
    });

    it('should render rank variant', () => {
      const { container } = render(
        <GameBadge variant="rank">Rank 1</GameBadge>
      );
      const badge = container.querySelector('span');
      expect(badge).toHaveClass('bg-amber-400');
    });

    it('should render score-success variant', () => {
      const { container } = render(
        <GameBadge variant="score-success">Solved!</GameBadge>
      );
      const badge = container.querySelector('span');
      expect(badge).toHaveClass('bg-emerald-500');
    });

    it('should render score-fail variant', () => {
      const { container } = render(
        <GameBadge variant="score-fail">Failed</GameBadge>
      );
      const badge = container.querySelector('span');
      expect(badge).toHaveClass('bg-neo-gray');
    });

    it('should render streak variant', () => {
      const { container } = render(
        <GameBadge variant="streak">🔥 5</GameBadge>
      );
      const badge = container.querySelector('span');
      expect(badge).toHaveClass('bg-orange-500');
    });

    it('should render default variant', () => {
      const { container } = render(
        <GameBadge variant="default">Default</GameBadge>
      );
      const badge = container.querySelector('span');
      expect(badge).toHaveClass('bg-neo-navy');
    });
  });

  describe('Sizes', () => {
    it('should render xs size', () => {
      const { container } = render(
        <GameBadge size="xs">XS</GameBadge>
      );
      const badge = container.querySelector('span');
      expect(badge).toHaveClass('text-[8px]');
      expect(badge).toHaveClass('px-1');
    });

    it('should render sm size (default)', () => {
      const { container } = render(
        <GameBadge size="sm">SM</GameBadge>
      );
      const badge = container.querySelector('span');
      expect(badge).toHaveClass('text-[10px]');
      expect(badge).toHaveClass('px-1.5');
    });

    it('should render md size', () => {
      const { container } = render(
        <GameBadge size="md">MD</GameBadge>
      );
      const badge = container.querySelector('span');
      expect(badge).toHaveClass('text-xs');
      expect(badge).toHaveClass('px-2');
    });
  });

  describe('Icons', () => {
    it('should render Lucide icon component', () => {
      const { container } = render(
        <GameBadge icon={Sparkles}>With Icon</GameBadge>
      );
      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('should render emoji as string icon', () => {
      render(
        <GameBadge icon="🚀">With Emoji</GameBadge>
      );
      expect(screen.getByText('🚀')).toBeInTheDocument();
    });

    it('should render without icon when not provided', () => {
      const { container } = render(
        <GameBadge>No Icon</GameBadge>
      );
      const icon = container.querySelector('svg');
      expect(icon).not.toBeInTheDocument();
    });

    it('should apply correct icon size for xs', () => {
      const { container } = render(
        <GameBadge icon={Trophy} size="xs">XS Icon</GameBadge>
      );
      const icon = container.querySelector('svg');
      expect(icon).toHaveClass('w-2');
      expect(icon).toHaveClass('h-2');
    });

    it('should apply correct icon size for sm', () => {
      const { container } = render(
        <GameBadge icon={Trophy} size="sm">SM Icon</GameBadge>
      );
      const icon = container.querySelector('svg');
      expect(icon).toHaveClass('w-2.5');
      expect(icon).toHaveClass('h-2.5');
    });

    it('should apply correct icon size for md', () => {
      const { container } = render(
        <GameBadge icon={Trophy} size="md">MD Icon</GameBadge>
      );
      const icon = container.querySelector('svg');
      expect(icon).toHaveClass('w-3');
      expect(icon).toHaveClass('h-3');
    });
  });

  describe('Click Handling', () => {
    it('should call onClick when clicked', () => {
      const handleClick = vi.fn();
      render(
        <GameBadge onClick={handleClick}>Click Me</GameBadge>
      );

      fireEvent.click(screen.getByText('Click Me'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should apply cursor-pointer class when onClick is provided', () => {
      const { container } = render(
        <GameBadge onClick={() => {}}>Clickable</GameBadge>
      );
      const badge = container.querySelector('span');
      expect(badge).toHaveClass('cursor-pointer');
    });

    it('should not apply cursor-pointer when onClick is not provided', () => {
      const { container } = render(
        <GameBadge>Not Clickable</GameBadge>
      );
      const badge = container.querySelector('span');
      expect(badge).not.toHaveClass('cursor-pointer');
    });
  });

  describe('Auto-Hide Functionality', () => {
    it('should auto-hide after specified time', async () => {
      const onAutoHide = vi.fn();
      render(
        <GameBadge autoHideMs={1000} onAutoHide={onAutoHide}>
          Auto Hide
        </GameBadge>
      );

      expect(screen.getByText('Auto Hide')).toBeInTheDocument();

      // Fast-forward time
      vi.advanceTimersByTime(1000);

      await waitFor(() => {
        expect(onAutoHide).toHaveBeenCalledTimes(1);
      });
    });

    it('should not auto-hide when autoHideMs is 0', async () => {
      const onAutoHide = vi.fn();
      render(
        <GameBadge autoHideMs={0} onAutoHide={onAutoHide}>
          No Auto Hide
        </GameBadge>
      );

      vi.advanceTimersByTime(10000);

      await waitFor(() => {
        expect(screen.getByText('No Auto Hide')).toBeInTheDocument();
        expect(onAutoHide).not.toHaveBeenCalled();
      });
    });

    it('should not auto-hide when autoHideMs is not provided', async () => {
      const onAutoHide = vi.fn();
      render(
        <GameBadge onAutoHide={onAutoHide}>
          No Auto Hide
        </GameBadge>
      );

      vi.advanceTimersByTime(10000);

      await waitFor(() => {
        expect(screen.getByText('No Auto Hide')).toBeInTheDocument();
        expect(onAutoHide).not.toHaveBeenCalled();
      });
    });

    it('should cleanup timer on unmount', () => {
      const onAutoHide = vi.fn();
      const { unmount } = render(
        <GameBadge autoHideMs={5000} onAutoHide={onAutoHide}>
          Will Unmount
        </GameBadge>
      );

      unmount();

      vi.advanceTimersByTime(5000);

      expect(onAutoHide).not.toHaveBeenCalled();
    });
  });

  describe('Animations', () => {
    it('should render with spring animation (default)', () => {
      const { container } = render(
        <GameBadge animate="spring">Spring</GameBadge>
      );
      expect(container.querySelector('[data-testid="motion-span"]')).toBeInTheDocument();
    });

    it('should render with pulse animation', () => {
      const { container } = render(
        <GameBadge animate="pulse">Pulse</GameBadge>
      );
      expect(container.querySelector('[data-testid="motion-span"]')).toBeInTheDocument();
    });

    it('should render with pop animation', () => {
      const { container } = render(
        <GameBadge animate="pop">Pop</GameBadge>
      );
      expect(container.querySelector('[data-testid="motion-span"]')).toBeInTheDocument();
    });

    it('should render with wobble animation on icon', () => {
      render(
        <GameBadge icon={Trophy} animate="wobble">Wobble</GameBadge>
      );
      expect(screen.getByText('Wobble')).toBeInTheDocument();
    });

    it('should render without animation when animate is false', () => {
      const { container } = render(
        <GameBadge animate={false}>No Animation</GameBadge>
      );
      expect(container.querySelector('[data-testid="motion-span"]')).not.toBeInTheDocument();
      expect(screen.getByText('No Animation')).toBeInTheDocument();
    });
  });

  describe('Neo-Brutalist Styling', () => {
    it('should apply Neo-Brutalist base classes', () => {
      const { container } = render(
        <GameBadge>Styled</GameBadge>
      );
      const badge = container.querySelector('span');
      expect(badge).toHaveClass('rounded-neo');
      expect(badge).toHaveClass('border-2');
      expect(badge).toHaveClass('shadow-hard-sm');
      expect(badge).toHaveClass('font-black');
      expect(badge).toHaveClass('uppercase');
    });

    it('should apply hover and active transform when clickable', () => {
      const { container } = render(
        <GameBadge onClick={() => {}}>Clickable</GameBadge>
      );
      const badge = container.querySelector('span');
      expect(badge).toHaveClass('hover:scale-[1.02]');
      expect(badge).toHaveClass('active:scale-[0.98]');
    });
  });

  describe('Real Game Scenarios', () => {
    it('should render new player badge correctly', () => {
      const { container } = render(
        <GameBadge variant="new-player" icon={Sparkles} size="sm" animate="spring">
          NEW
        </GameBadge>
      );

      expect(screen.getByText('NEW')).toBeInTheDocument();
      expect(container.querySelector('svg')).toBeInTheDocument();
      expect(container.querySelector('.bg-neo-pink')).toBeInTheDocument();
    });

    it('should render late joiner badge with auto-hide', () => {
      const onHide = vi.fn();
      render(
        <GameBadge
          variant="late-joiner"
          icon="🚀"
          animate="wobble"
          autoHideMs={30000}
          onAutoHide={onHide}
        >
          LATE JOINER
        </GameBadge>
      );

      expect(screen.getByText('LATE JOINER')).toBeInTheDocument();
      expect(screen.getByText('🚀')).toBeInTheDocument();

      vi.advanceTimersByTime(30000);

      waitFor(() => {
        expect(onHide).toHaveBeenCalled();
      });
    });

    it('should render rank badge with trophy', () => {
      const { container } = render(
        <GameBadge variant="rank" icon={Trophy} animate="pop" size="md">
          Rank 1/100
        </GameBadge>
      );

      expect(screen.getByText('Rank 1/100')).toBeInTheDocument();
      expect(container.querySelector('svg')).toBeInTheDocument();
      expect(container.querySelector('.bg-amber-400')).toBeInTheDocument();
    });

    it('should render score success badge', () => {
      const { container } = render(
        <GameBadge variant="score-success" icon={Trophy} size="sm">
          5/10
        </GameBadge>
      );

      expect(screen.getByText('5/10')).toBeInTheDocument();
      expect(container.querySelector('.bg-emerald-500')).toBeInTheDocument();
    });

    it('should render score fail badge', () => {
      const { container } = render(
        <GameBadge variant="score-fail" icon={X} size="sm">
          X/10
        </GameBadge>
      );

      expect(screen.getByText('X/10')).toBeInTheDocument();
      expect(container.querySelector('.bg-neo-gray')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty children gracefully', () => {
      const { container } = render(
        <GameBadge>{''}</GameBadge>
      );
      expect(container.querySelector('span')).toBeInTheDocument();
    });

    it('should handle very long text', () => {
      const longText = 'This is a very long badge text that might overflow';
      render(<GameBadge>{longText}</GameBadge>);
      expect(screen.getByText(longText)).toBeInTheDocument();
    });

    it('should handle null children', () => {
      const { container } = render(
        <GameBadge>{null}</GameBadge>
      );
      expect(container.querySelector('span')).toBeInTheDocument();
    });

    it('should handle multiple children', () => {
      render(
        <GameBadge>
          <span>Part 1</span>
          <span>Part 2</span>
        </GameBadge>
      );
      expect(screen.getByText('Part 1')).toBeInTheDocument();
      expect(screen.getByText('Part 2')).toBeInTheDocument();
    });
  });
});
