/**
 * Tests for Stat Component
 *
 * Comprehensive test suite covering all variants, sizes,
 * icon styles, and functionality of the consolidated Stat component.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Hash, Trophy, Target } from 'lucide-react';
import { Stat } from '../Stat';

describe('Stat', () => {
  describe('Basic Rendering', () => {
    it('should render value and label', () => {
      render(<Stat value={42} label="Words" />);
      expect(screen.getByText('42')).toBeInTheDocument();
      expect(screen.getByText('Words')).toBeInTheDocument();
    });

    it('should render string values', () => {
      render(<Stat value="95%" label="Accuracy" />);
      expect(screen.getByText('95%')).toBeInTheDocument();
    });

    it('should render number values', () => {
      render(<Stat value={1234} label="Score" />);
      expect(screen.getByText('1234')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <Stat value={10} label="Test" className="custom-class" />
      );
      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });

    it('should render with aria-label for accessibility', () => {
      render(<Stat value={42} label="Words" />);
      expect(screen.getByRole('status')).toHaveAttribute(
        'aria-label',
        'Words: 42'
      );
    });

    it('should use custom aria-label when provided', () => {
      render(
        <Stat
          value={42}
          label="Words"
          aria-label="Custom label"
        />
      );
      expect(screen.getByRole('status')).toHaveAttribute(
        'aria-label',
        'Custom label'
      );
    });
  });

  describe('Variants', () => {
    it('should render default variant', () => {
      const { container } = render(
        <Stat value={10} label="Test" variant="default" />
      );
      expect(container.querySelector('.bg-neo-navy\\/50')).toBeInTheDocument();
    });

    it('should render accent variant', () => {
      const { container } = render(
        <Stat value={10} label="Test" variant="accent" />
      );
      expect(container.querySelector('.bg-neo-cyan\\/20')).toBeInTheDocument();
    });

    it('should render success variant', () => {
      const { container } = render(
        <Stat value={10} label="Test" variant="success" />
      );
      expect(container.querySelector('.bg-neo-lime\\/20')).toBeInTheDocument();
    });

    it('should render warning variant', () => {
      const { container } = render(
        <Stat value={10} label="Test" variant="warning" />
      );
      expect(container.querySelector('.bg-neo-yellow\\/20')).toBeInTheDocument();
    });

    it('should render info variant', () => {
      const { container } = render(
        <Stat value={10} label="Test" variant="info" />
      );
      expect(container.querySelector('.bg-neo-pink\\/20')).toBeInTheDocument();
    });

    it('should render highlight variant with gradient', () => {
      const { container} = render(
        <Stat value={10} label="Test" variant="highlight" />
      );
      expect(container.querySelector('.bg-linear-to-br')).toBeInTheDocument();
    });
  });

  describe('Sizes', () => {
    it('should render sm size', () => {
      const { container } = render(
        <Stat value={10} label="Test" size="sm" />
      );
      const stat = container.querySelector('[role="status"]');
      expect(stat).toHaveClass('p-2');
      expect(stat?.querySelector('div')?.className).toContain('text-sm');
    });

    it('should render md size (default)', () => {
      const { container } = render(
        <Stat value={10} label="Test" size="md" />
      );
      const stat = container.querySelector('[role="status"]');
      expect(stat).toHaveClass('p-2');
    });

    it('should render lg size', () => {
      const { container } = render(
        <Stat value={10} label="Test" size="lg" />
      );
      const stat = container.querySelector('[role="status"]');
      expect(stat).toHaveClass('p-3');
    });
  });

  describe('Icon Styles', () => {
    describe('Icon in box (StatBadge style)', () => {
      it('should render icon in colored box', () => {
        const { container } = render(
          <Stat
            value={42}
            label="Words"
            icon={Hash}
            iconStyle="box"
            iconBgColor="bg-neo-lime"
          />
        );

        // Should have icon container with background color
        const iconContainer = container.querySelector('.bg-neo-lime');
        expect(iconContainer).toBeInTheDocument();
        expect(iconContainer).toHaveClass('rounded');
        expect(iconContainer).toHaveClass('border-neo-black');

        // Should have the icon component
        expect(container.querySelector('svg')).toBeInTheDocument();
      });

      it('should apply custom icon colors', () => {
        const { container } = render(
          <Stat
            value={42}
            label="Words"
            icon={Hash}
            iconStyle="box"
            iconBgColor="bg-neo-pink"
            iconColor="text-white"
          />
        );

        const iconContainer = container.querySelector('.bg-neo-pink');
        expect(iconContainer).toBeInTheDocument();
        expect(container.querySelector('.text-white')).toBeInTheDocument();
      });

      it('should handle icon elements (not just components)', () => {
        const { container } = render(
          <Stat
            value={42}
            label="Test"
            icon={<span>⭐</span>}
            iconStyle="box"
          />
        );

        expect(screen.getByText('⭐')).toBeInTheDocument();
        expect(container.querySelector('.bg-neo-lime')).toBeInTheDocument();
      });
    });

    describe('Icon above value (StatDisplay/StatCard style)', () => {
      it('should render icon above value', () => {
        const { container } = render(
          <Stat
            value={42}
            label="Score"
            icon={Trophy}
            iconStyle="above"
          />
        );

        const icon = container.querySelector('svg');
        expect(icon).toBeInTheDocument();

        // Icon should not be in a colored box
        expect(container.querySelector('.bg-neo-lime')).not.toBeInTheDocument();
      });

      it('should handle icon elements above value', () => {
        render(
          <Stat
            value={42}
            label="Test"
            icon={<span>🏆</span>}
            iconStyle="above"
          />
        );

        expect(screen.getByText('🏆')).toBeInTheDocument();
      });

      it('should default to above style when icon is provided', () => {
        const { container } = render(
          <Stat value={42} label="Test" icon={Trophy} />
        );

        // Should render icon but not in a box
        expect(container.querySelector('svg')).toBeInTheDocument();
        expect(container.querySelector('.bg-neo-lime')).not.toBeInTheDocument();
      });
    });

    describe('No icon', () => {
      it('should render without icon when iconStyle is none', () => {
        const { container } = render(
          <Stat
            value={42}
            label="Test"
            icon={Trophy}
            iconStyle="none"
          />
        );

        expect(container.querySelector('svg')).not.toBeInTheDocument();
      });

      it('should render without icon when icon is not provided', () => {
        const { container } = render(
          <Stat value={42} label="Test" />
        );

        expect(container.querySelector('svg')).not.toBeInTheDocument();
      });
    });
  });

  describe('Interactive vs Non-Interactive', () => {
    it('should render as interactive by default', () => {
      const { container } = render(
        <Stat value={42} label="Test" />
      );

      const stat = container.querySelector('[role="status"]');
      expect(stat).toHaveClass('border-2'); // Solid border
      expect(stat).toHaveClass('shadow-xs'); // Has shadow
      expect(stat).not.toHaveClass('cursor-default');
    });

    it('should render as non-interactive when specified', () => {
      const { container } = render(
        <Stat value={42} label="Test" interactive={false} />
      );

      const stat = container.querySelector('[role="status"]');
      expect(stat).toHaveClass('border-dashed'); // Dashed border
      expect(stat).toHaveClass('shadow-none'); // No shadow
      expect(stat).toHaveClass('cursor-default');
      expect(stat).toHaveClass('select-none');
    });

    it('should apply hover effects when interactive and clickable', () => {
      const handleClick = vi.fn();
      const { container } = render(
        <Stat value={42} label="Test" onClick={handleClick} interactive={true} />
      );

      const stat = container.querySelector('[role="status"]');
      expect(stat).toHaveClass('cursor-pointer');
      expect(stat).toHaveClass('hover:scale-[1.02]');
      expect(stat).toHaveClass('active:scale-[0.98]');
    });

    it('should not apply hover effects when non-interactive', () => {
      const handleClick = vi.fn();
      const { container } = render(
        <Stat value={42} label="Test" onClick={handleClick} interactive={false} />
      );

      const stat = container.querySelector('[role="status"]');
      expect(stat).not.toHaveClass('cursor-pointer');
      expect(stat).not.toHaveClass('hover:scale-[1.02]');
    });
  });

  describe('Click Handling', () => {
    it('should call onClick when clicked (interactive)', () => {
      const handleClick = vi.fn();
      render(
        <Stat value={42} label="Test" onClick={handleClick} />
      );

      fireEvent.click(screen.getByRole('status'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should call onClick when clicked (non-interactive but has onClick)', () => {
      const handleClick = vi.fn();
      render(
        <Stat value={42} label="Test" onClick={handleClick} interactive={false} />
      );

      fireEvent.click(screen.getByRole('status'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should not error when clicked without onClick handler', () => {
      render(<Stat value={42} label="Test" />);

      expect(() => {
        fireEvent.click(screen.getByRole('status'));
      }).not.toThrow();
    });
  });

  describe('Sub-Value', () => {
    it('should render sub-value when provided', () => {
      render(
        <Stat
          value={1234}
          label="Score"
          subValue="Personal Best"
        />
      );

      expect(screen.getByText('Personal Best')).toBeInTheDocument();
    });

    it('should not render sub-value when not provided', () => {
      const { container } = render(
        <Stat value={1234} label="Score" />
      );

      // Should only have value and label, no third text element
      const textElements = container.querySelectorAll('div[role="status"] > div');
      expect(textElements).toHaveLength(2); // value + label
    });

    it('should include sub-value in accessibility label', () => {
      render(
        <Stat
          value={1234}
          label="Score"
          subValue="Best"
        />
      );

      expect(screen.getByRole('status')).toHaveAttribute(
        'aria-label',
        'Score: 1234 (Best)'
      );
    });
  });

  describe('Real-World Use Cases', () => {
    it('should replicate StatBadge functionality', () => {
      const { container } = render(
        <Stat
          icon={Hash}
          value={42}
          label="Words"
          iconStyle="box"
          iconBgColor="bg-neo-lime"
          size="md"
        />
      );

      expect(screen.getByText('42')).toBeInTheDocument();
      expect(screen.getByText('Words')).toBeInTheDocument();
      expect(container.querySelector('.bg-neo-lime')).toBeInTheDocument();
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('should replicate StatDisplay functionality', () => {
      const { container } = render(
        <Stat
          value="95%"
          label="Accuracy"
          variant="success"
          interactive={false}
        />
      );

      expect(screen.getByText('95%')).toBeInTheDocument();
      expect(screen.getByText('Accuracy')).toBeInTheDocument();
      expect(container.querySelector('.border-dashed')).toBeInTheDocument();
      expect(container.querySelector('.shadow-none')).toBeInTheDocument();
    });

    it('should replicate profile StatCard functionality', () => {
      render(
        <Stat
          icon={Trophy}
          value={1234}
          label="High Score"
          variant="highlight"
          size="lg"
          iconStyle="above"
        />
      );

      expect(screen.getByText('1234')).toBeInTheDocument();
      expect(screen.getByText('High Score')).toBeInTheDocument();
    });

    it('should handle dark mode scenarios', () => {
      const { container } = render(
        <Stat
          value={42}
          label="Test"
          variant="default"
        />
      );

      // Should have dark-themed classes on wrapper (dark-only design)
      const stat = container.querySelector('[role="status"]');
      expect(stat?.className).toContain('bg-neo-navy/50');

      // Value text uses neo-cream color
      const valueDiv = stat?.querySelector('.font-black');
      expect(valueDiv?.className).toContain('text-neo-white');
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero value', () => {
      render(<Stat value={0} label="Count" />);
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('should handle negative values', () => {
      render(<Stat value={-5} label="Delta" />);
      expect(screen.getByText('-5')).toBeInTheDocument();
    });

    it('should handle very large numbers', () => {
      render(<Stat value={999999} label="Score" />);
      expect(screen.getByText('999999')).toBeInTheDocument();
    });

    it('should handle empty string labels', () => {
      render(<Stat value={42} label="" />);
      expect(screen.getByText('42')).toBeInTheDocument();
    });

    it('should handle very long labels', () => {
      const longLabel = 'This is a very long label that might wrap';
      render(<Stat value={42} label={longLabel} />);
      expect(screen.getByText(longLabel)).toBeInTheDocument();
    });

    it('should handle very long values', () => {
      const longValue = '1,234,567,890';
      render(<Stat value={longValue} label="Big Number" />);
      expect(screen.getByText(longValue)).toBeInTheDocument();
    });
  });

  describe('Responsive Behavior', () => {
    it('should apply responsive classes for md size', () => {
      const { container } = render(
        <Stat value={42} label="Test" size="md" />
      );

      const stat = container.querySelector('[role="status"]');
      expect(stat?.className).toContain('sm:p-3');
    });

    it('should apply responsive classes for lg size', () => {
      const { container } = render(
        <Stat value={42} label="Test" size="lg" />
      );

      const stat = container.querySelector('[role="status"]');
      expect(stat?.className).toContain('sm:p-4');
    });
  });
});
