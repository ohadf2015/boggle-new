/**
 * Tests for Collapsible Component
 *
 * Comprehensive test suite covering controlled/uncontrolled modes,
 * variants, badge styles, and functionality of the consolidated Collapsible component.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Hash, Trophy } from 'lucide-react';
import { Collapsible } from '../Collapsible';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, className, ...props }: any) => (
      <div className={className} data-testid="motion-div" {...props}>
        {children}
      </div>
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock useIsDesktop hook
vi.mock('@/hooks/useMediaQuery', () => ({
  useIsDesktop: vi.fn(() => false),
}));

import { useIsDesktop } from '@/hooks/useMediaQuery';
const mockUseIsDesktop = useIsDesktop as jest.MockedFunction<typeof useIsDesktop>;

describe('Collapsible', () => {
  beforeEach(() => {
    mockUseIsDesktop.mockReturnValue(false);
  });

  describe('Basic Rendering', () => {
    it('should render label and children', () => {
      render(
        <Collapsible label="Test Section" defaultExpanded={true}>
          <div>Test Content</div>
        </Collapsible>
      );

      expect(screen.getByText('Test Section')).toBeInTheDocument();
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('should render with custom className', () => {
      const { container } = render(
        <Collapsible label="Test" className="custom-class">
          <div>Content</div>
        </Collapsible>
      );

      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });

    it('should render aria attributes', () => {
      render(
        <Collapsible label="Test Section">
          <div>Content</div>
        </Collapsible>
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-expanded');
      expect(button).toHaveAttribute('aria-controls');
    });
  });

  describe('Controlled Mode', () => {
    it('should work in controlled mode', () => {
      const handleToggle = vi.fn();
      const { rerender } = render(
        <Collapsible label="Controlled" isOpen={false} onToggle={handleToggle}>
          <div>Content</div>
        </Collapsible>
      );

      expect(screen.queryByText('Content')).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button'));
      expect(handleToggle).toHaveBeenCalledWith(true);

      // Simulate parent updating isOpen
      rerender(
        <Collapsible label="Controlled" isOpen={true} onToggle={handleToggle}>
          <div>Content</div>
        </Collapsible>
      );

      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('should respect controlled isOpen state', () => {
      render(
        <Collapsible label="Test" isOpen={true} onToggle={() => {}}>
          <div>Visible Content</div>
        </Collapsible>
      );

      expect(screen.getByText('Visible Content')).toBeInTheDocument();
    });

    it('should call onToggle with correct state', () => {
      const handleToggle = vi.fn();
      render(
        <Collapsible label="Test" isOpen={false} onToggle={handleToggle}>
          <div>Content</div>
        </Collapsible>
      );

      fireEvent.click(screen.getByRole('button'));
      expect(handleToggle).toHaveBeenCalledWith(true);
    });
  });

  describe('Uncontrolled Mode', () => {
    it('should work in uncontrolled mode', () => {
      render(
        <Collapsible label="Uncontrolled" defaultExpanded={false}>
          <div>Hidden Content</div>
        </Collapsible>
      );

      expect(screen.queryByText('Hidden Content')).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button'));

      expect(screen.getByText('Hidden Content')).toBeInTheDocument();
    });

    it('should respect defaultExpanded prop', () => {
      render(
        <Collapsible label="Test" defaultExpanded={true}>
          <div>Visible Content</div>
        </Collapsible>
      );

      expect(screen.getByText('Visible Content')).toBeInTheDocument();
    });

    it('should toggle open/close on button click', () => {
      render(
        <Collapsible label="Test" defaultExpanded={false}>
          <div>Toggle Content</div>
        </Collapsible>
      );

      const button = screen.getByRole('button');

      // Initially closed
      expect(screen.queryByText('Toggle Content')).not.toBeInTheDocument();

      // Open
      fireEvent.click(button);
      expect(screen.getByText('Toggle Content')).toBeInTheDocument();

      // Close
      fireEvent.click(button);
      expect(screen.queryByText('Toggle Content')).not.toBeInTheDocument();
    });

    it('should call optional onToggle callback in uncontrolled mode', () => {
      const handleToggle = vi.fn();
      render(
        <Collapsible label="Test" defaultExpanded={false} onToggle={handleToggle}>
          <div>Content</div>
        </Collapsible>
      );

      fireEvent.click(screen.getByRole('button'));
      expect(handleToggle).toHaveBeenCalledWith(true);

      fireEvent.click(screen.getByRole('button'));
      expect(handleToggle).toHaveBeenCalledWith(false);
    });
  });

  describe('Desktop Detection', () => {
    it('should collapse on desktop when useDesktopDetection is true', () => {
      mockUseIsDesktop.mockReturnValue(true);

      render(
        <Collapsible
          label="Desktop Test"
          defaultExpanded={true}
          useDesktopDetection={true}
        >
          <div>Content</div>
        </Collapsible>
      );

      // Should be collapsed despite defaultExpanded=true
      expect(screen.queryByText('Content')).not.toBeInTheDocument();
    });

    it('should respect defaultExpanded when useDesktopDetection is false', () => {
      mockUseIsDesktop.mockReturnValue(true);

      render(
        <Collapsible
          label="Desktop Test"
          defaultExpanded={true}
          useDesktopDetection={false}
        >
          <div>Content</div>
        </Collapsible>
      );

      // Should be expanded because useDesktopDetection is false
      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('should not apply desktop detection in controlled mode', () => {
      mockUseIsDesktop.mockReturnValue(true);

      render(
        <Collapsible
          label="Controlled"
          isOpen={true}
          onToggle={() => {}}
          useDesktopDetection={true}
        >
          <div>Content</div>
        </Collapsible>
      );

      // Should be open because controlled mode ignores desktop detection
      expect(screen.getByText('Content')).toBeInTheDocument();
    });
  });

  describe('Variants', () => {
    const variants = ['primary', 'secondary', 'tertiary', 'default', 'highlight', 'subtle'] as const;

    variants.forEach((variant) => {
      it(`should render ${variant} variant`, () => {
        const { container } = render(
          <Collapsible label="Test" variant={variant}>
            <div>Content</div>
          </Collapsible>
        );

        const button = container.querySelector('button');
        expect(button).toBeInTheDocument();
      });
    });

    it('should apply variant-specific styles', () => {
      const { container } = render(
        <Collapsible label="Test" variant="primary">
          <div>Content</div>
        </Collapsible>
      );

      const button = container.querySelector('button');
      expect(button?.className).toContain('bg-neo-navy');
    });
  });

  describe('Badge Styles', () => {
    it('should render styled badge', () => {
      render(
        <Collapsible label="Test" badge={5} badgeStyle="badge">
          <div>Content</div>
        </Collapsible>
      );

      const badge = screen.getByText('5');
      expect(badge).toBeInTheDocument();
      expect(badge.className).toContain('rounded-neo');
      expect(badge.className).toContain('border');
    });

    it('should render inline count', () => {
      render(
        <Collapsible label="Test" badge={10} badgeStyle="count">
          <div>Content</div>
        </Collapsible>
      );

      expect(screen.getByText('(10)')).toBeInTheDocument();
    });

    it('should render string badge', () => {
      render(
        <Collapsible label="Test" badge="NEW" badgeStyle="badge">
          <div>Content</div>
        </Collapsible>
      );

      expect(screen.getByText('NEW')).toBeInTheDocument();
    });

    it('should not render badge when not provided', () => {
      render(
        <Collapsible label="Test">
          <div>Content</div>
        </Collapsible>
      );

      // Badge would be rendered as styled badge or inline count
      expect(screen.queryByText(/^\(\d+\)$/)).not.toBeInTheDocument();
      // Check that there's no badge element in the button's first child div
      const labelContainer = screen.getByRole('button').querySelector('div');
      const badge = labelContainer?.querySelector('.rounded-neo.border.border-neo-black');
      expect(badge).not.toBeInTheDocument();
    });
  });

  describe('Bordered vs Borderless', () => {
    it('should render with bordered wrapper when bordered=true', () => {
      const { container } = render(
        <Collapsible label="Test" bordered={true}>
          <div>Content</div>
        </Collapsible>
      );

      const wrapper = container.querySelector('.border-2.border-neo-black');
      expect(wrapper).toBeInTheDocument();
    });

    it('should render without bordered wrapper by default', () => {
      const { container } = render(
        <Collapsible label="Test">
          <div>Content</div>
        </Collapsible>
      );

      const button = container.querySelector('button');
      expect(button?.className).toContain('rounded-neo');
    });

    it('should apply different padding for bordered vs borderless', () => {
      const { container: bordered } = render(
        <Collapsible label="Bordered" bordered={true}>
          <div>Content</div>
        </Collapsible>
      );

      const { container: borderless } = render(
        <Collapsible label="Borderless" bordered={false}>
          <div>Content</div>
        </Collapsible>
      );

      const borderedButton = bordered.querySelector('button');
      const borderlessButton = borderless.querySelector('button');

      expect(borderedButton?.className).toContain('p-2.5');
      expect(borderlessButton?.className).toContain('p-1.5');
    });
  });

  describe('Icons', () => {
    it('should render Lucide icon component', () => {
      const { container } = render(
        <Collapsible label="Test" icon={Hash}>
          <div>Content</div>
        </Collapsible>
      );

      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('should render icon element', () => {
      render(
        <Collapsible label="Test" icon={<span>⭐</span>}>
          <div>Content</div>
        </Collapsible>
      );

      expect(screen.getByText('⭐')).toBeInTheDocument();
    });

    it('should render without icon when not provided', () => {
      const { container } = render(
        <Collapsible label="Test">
          <div>Content</div>
        </Collapsible>
      );

      // ChevronDown icon is always present, check that label container has no icon
      const button = container.querySelector('button');
      const labelContainer = button?.querySelector('div');
      const iconContainer = labelContainer?.querySelector('.shrink-0');
      expect(iconContainer).not.toBeInTheDocument();
    });
  });

  describe('Mobile Labels', () => {
    it('should render both full and mobile labels', () => {
      render(
        <Collapsible label="Full Label" mobileLabel="Short">
          <div>Content</div>
        </Collapsible>
      );

      expect(screen.getByText('Full Label')).toBeInTheDocument();
      expect(screen.getByText('Short')).toBeInTheDocument();
    });

    it('should render only label when mobileLabel not provided', () => {
      render(
        <Collapsible label="Label Only">
          <div>Content</div>
        </Collapsible>
      );

      expect(screen.getByText('Label Only')).toBeInTheDocument();
    });
  });

  describe('Styling Props', () => {
    it('should apply headerClassName', () => {
      const { container } = render(
        <Collapsible label="Test" headerClassName="custom-header">
          <div>Content</div>
        </Collapsible>
      );

      const button = container.querySelector('button');
      expect(button?.className).toContain('custom-header');
    });

    it('should apply contentClassName', () => {
      const { container } = render(
        <Collapsible label="Test" defaultExpanded={true} contentClassName="custom-content">
          <div>Content</div>
        </Collapsible>
      );

      const contentWrapper = container.querySelector('.custom-content');
      expect(contentWrapper).toBeInTheDocument();
    });

    it('should respect noMargin prop', () => {
      const { container } = render(
        <Collapsible label="Test" noMargin={true}>
          <div>Content</div>
        </Collapsible>
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).not.toContain('mb-');
    });

    it('should apply margin by default', () => {
      const { container } = render(
        <Collapsible label="Test">
          <div>Content</div>
        </Collapsible>
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('mb-');
    });
  });

  describe('Real-World Use Cases', () => {
    it('should replicate CollapsibleSection functionality', () => {
      const { container } = render(
        <Collapsible
          label="Game History"
          icon={<Trophy />}
          defaultExpanded={true}
          useDesktopDetection={true}
          badge={5}
          badgeStyle="badge"
          variant="secondary"
          bordered={true}
        >
          <div>History Content</div>
        </Collapsible>
      );

      expect(screen.getByText('Game History')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(container.querySelector('.border-2.border-neo-black')).toBeInTheDocument();
    });

    it('should replicate CollapsiblePanel functionality', () => {
      const handleToggle = vi.fn();
      render(
        <Collapsible
          label="View All Words"
          mobileLabel="Words"
          icon={Hash}
          isOpen={false}
          onToggle={handleToggle}
          badge={42}
          badgeStyle="count"
          variant="default"
          bordered={false}
        >
          <div>Words List</div>
        </Collapsible>
      );

      expect(screen.getByText('View All Words')).toBeInTheDocument();
      expect(screen.getByText('Words')).toBeInTheDocument();
      expect(screen.getByText('(42)')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button'));
      expect(handleToggle).toHaveBeenCalledWith(true);
    });
  });

  describe('Accessibility', () => {
    it('should update aria-expanded on toggle', () => {
      render(
        <Collapsible label="Test" defaultExpanded={false}>
          <div>Content</div>
        </Collapsible>
      );

      const button = screen.getByRole('button');

      expect(button).toHaveAttribute('aria-expanded', 'false');

      fireEvent.click(button);

      expect(button).toHaveAttribute('aria-expanded', 'true');
    });

    it('should have proper ARIA attributes on content', () => {
      const { container } = render(
        <Collapsible label="Test Section" defaultExpanded={true}>
          <div>Content</div>
        </Collapsible>
      );

      const region = container.querySelector('[role="region"]');
      expect(region).toBeInTheDocument();
      expect(region).toHaveAttribute('aria-labelledby');
    });

    it('should have focus ring-3 on button', () => {
      const { container } = render(
        <Collapsible label="Test">
          <div>Content</div>
        </Collapsible>
      );

      const button = container.querySelector('button');
      expect(button?.className).toContain('focus:ring-2');
      expect(button?.className).toContain('focus:ring-neo-cyan');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty children', () => {
      render(
        <Collapsible label="Empty" defaultExpanded={true}>
          {null}
        </Collapsible>
      );

      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should handle zero as badge value', () => {
      render(
        <Collapsible label="Test" badge={0} badgeStyle="count">
          <div>Content</div>
        </Collapsible>
      );

      expect(screen.getByText('(0)')).toBeInTheDocument();
    });

    it('should handle very long labels', () => {
      const longLabel = 'This is a very long label that might wrap to multiple lines';
      render(
        <Collapsible label={longLabel}>
          <div>Content</div>
        </Collapsible>
      );

      expect(screen.getByText(longLabel)).toBeInTheDocument();
    });

    it('should handle rapid toggling', () => {
      render(
        <Collapsible label="Test" defaultExpanded={false}>
          <div>Content</div>
        </Collapsible>
      );

      const button = screen.getByRole('button');

      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);

      expect(screen.getByText('Content')).toBeInTheDocument();
    });
  });
});
