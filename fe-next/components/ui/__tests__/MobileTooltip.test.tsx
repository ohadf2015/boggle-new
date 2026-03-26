/**
 * Tests for MobileTooltip component
 *
 * Tests the mobile-friendly tooltip wrapper including:
 * - Touch device detection and click-to-toggle behavior
 * - Desktop hover behavior (standard Radix behavior)
 * - Outside click dismissal
 * - Disabled state
 * - Props forwarding (side, sideOffset, contentClassName)
 */

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MobileTooltip } from '../MobileTooltip';

// Store mock handlers in globalThis so vi.mock factory (hoisted) can access them
(globalThis as any).__mobileTooltipMockHandlers = {
  openChange: null as ((open: boolean) => void) | null,
  pointerDownOutside: null as (() => void) | null,
};
const mockHandlers = (globalThis as any).__mobileTooltipMockHandlers;

// Mock Radix UI Tooltip primitives
vi.mock('../tooltip', async () => {
  const React = await import('react');

  const MockTooltipProvider = ({
    children,
    delayDuration,
  }: {
    children: React.ReactNode;
    delayDuration?: number;
  }) => (
    <div data-testid="tooltip-provider" data-delay={delayDuration}>
      {children}
    </div>
  );

  const MockTooltip = ({
    children,
    open,
    onOpenChange,
  }: {
    children: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  }) => {
    React.useEffect(() => {
      (globalThis as any).__mobileTooltipMockHandlers.openChange = onOpenChange || null;
    }, [onOpenChange]);
    return (
      <div data-testid="tooltip" data-open={open}>
        {children}
      </div>
    );
  };

  const MockTooltipTrigger = ({
    children,
    asChild,
    onClick,
    onTouchStart,
  }: {
    children: React.ReactNode;
    asChild?: boolean;
    onClick?: (e: React.MouseEvent) => void;
    onTouchStart?: () => void;
  }) => (
    <div
      data-testid="tooltip-trigger"
      data-aschild={asChild}
      onClick={onClick}
      onTouchStart={onTouchStart}
    >
      {children}
    </div>
  );

  const MockTooltipContent = ({
    children,
    side,
    sideOffset,
    className,
    onPointerDownOutside,
  }: {
    children: React.ReactNode;
    side?: string;
    sideOffset?: number;
    className?: string;
    onPointerDownOutside?: () => void;
  }) => {
    React.useEffect(() => {
      (globalThis as any).__mobileTooltipMockHandlers.pointerDownOutside = onPointerDownOutside || null;
    }, [onPointerDownOutside]);
    return (
      <div
        data-testid="tooltip-content"
        data-side={side}
        data-sideoffset={sideOffset}
        className={className}
      >
        {children}
      </div>
    );
  };

  return {
    Tooltip: MockTooltip,
    TooltipTrigger: MockTooltipTrigger,
    TooltipContent: MockTooltipContent,
    TooltipProvider: MockTooltipProvider,
  };
});

// Export for access inside the mock
export { mockHandlers };

describe('MobileTooltip Component', () => {
  const defaultContent = <span>Tooltip content</span>;
  const defaultChildren = <button>Trigger</button>;

  describe('Rendering', () => {
    it('should render children correctly', () => {
      render(
        <MobileTooltip content={defaultContent}>
          {defaultChildren}
        </MobileTooltip>
      );

      expect(screen.getByText('Trigger')).toBeInTheDocument();
    });

    it('should render tooltip content', () => {
      render(
        <MobileTooltip content={defaultContent}>
          {defaultChildren}
        </MobileTooltip>
      );

      expect(screen.getByText('Tooltip content')).toBeInTheDocument();
    });

    it('should start with tooltip closed', () => {
      render(
        <MobileTooltip content={defaultContent}>
          {defaultChildren}
        </MobileTooltip>
      );

      const tooltip = screen.getByTestId('tooltip');
      expect(tooltip).toHaveAttribute('data-open', 'false');
    });
  });

  describe('Props Forwarding', () => {
    it('should forward side prop to TooltipContent', () => {
      render(
        <MobileTooltip content={defaultContent} side="bottom">
          {defaultChildren}
        </MobileTooltip>
      );

      const content = screen.getByTestId('tooltip-content');
      expect(content).toHaveAttribute('data-side', 'bottom');
    });

    it('should forward sideOffset prop to TooltipContent', () => {
      render(
        <MobileTooltip content={defaultContent} sideOffset={16}>
          {defaultChildren}
        </MobileTooltip>
      );

      const content = screen.getByTestId('tooltip-content');
      expect(content).toHaveAttribute('data-sideoffset', '16');
    });

    it('should forward contentClassName to TooltipContent', () => {
      render(
        <MobileTooltip content={defaultContent} contentClassName="custom-class">
          {defaultChildren}
        </MobileTooltip>
      );

      const content = screen.getByTestId('tooltip-content');
      expect(content).toHaveClass('custom-class');
    });

    it('should forward delayDuration to TooltipProvider', () => {
      render(
        <MobileTooltip content={defaultContent} delayDuration={500}>
          {defaultChildren}
        </MobileTooltip>
      );

      const provider = screen.getByTestId('tooltip-provider');
      expect(provider).toHaveAttribute('data-delay', '500');
    });

    it('should use default side of top', () => {
      render(
        <MobileTooltip content={defaultContent}>
          {defaultChildren}
        </MobileTooltip>
      );

      const content = screen.getByTestId('tooltip-content');
      expect(content).toHaveAttribute('data-side', 'top');
    });

    it('should use default sideOffset of 8', () => {
      render(
        <MobileTooltip content={defaultContent}>
          {defaultChildren}
        </MobileTooltip>
      );

      const content = screen.getByTestId('tooltip-content');
      expect(content).toHaveAttribute('data-sideoffset', '8');
    });
  });

  describe('Disabled State', () => {
    it('should render only children when disabled', () => {
      render(
        <MobileTooltip content={defaultContent} disabled>
          {defaultChildren}
        </MobileTooltip>
      );

      expect(screen.getByText('Trigger')).toBeInTheDocument();
      expect(screen.queryByTestId('tooltip-provider')).not.toBeInTheDocument();
      expect(screen.queryByTestId('tooltip')).not.toBeInTheDocument();
    });
  });

  describe('Touch Device Behavior', () => {
    it('should detect touch device on touchStart', () => {
      render(
        <MobileTooltip content={defaultContent}>
          {defaultChildren}
        </MobileTooltip>
      );

      const trigger = screen.getByTestId('tooltip-trigger');
      fireEvent.touchStart(trigger);

      // After touchStart, device is recognized as touch device
      // Now clicking should toggle the tooltip
      fireEvent.click(trigger);

      const tooltip = screen.getByTestId('tooltip');
      expect(tooltip).toHaveAttribute('data-open', 'true');
    });

    it('should toggle tooltip on click for touch devices', () => {
      render(
        <MobileTooltip content={defaultContent}>
          {defaultChildren}
        </MobileTooltip>
      );

      const trigger = screen.getByTestId('tooltip-trigger');

      // First, mark as touch device
      fireEvent.touchStart(trigger);

      // Click to open
      fireEvent.click(trigger);
      expect(screen.getByTestId('tooltip')).toHaveAttribute('data-open', 'true');

      // Click again to close
      fireEvent.click(trigger);
      expect(screen.getByTestId('tooltip')).toHaveAttribute('data-open', 'false');
    });

    it('should prevent default and stop propagation on touch device click', () => {
      render(
        <MobileTooltip content={defaultContent}>
          {defaultChildren}
        </MobileTooltip>
      );

      const trigger = screen.getByTestId('tooltip-trigger');

      // Mark as touch device
      fireEvent.touchStart(trigger);

      // Create a mock event to check preventDefault and stopPropagation
      const clickEvent = new MouseEvent('click', { bubbles: true });
      const preventDefaultSpy = vi.spyOn(clickEvent, 'preventDefault');
      const stopPropagationSpy = vi.spyOn(clickEvent, 'stopPropagation');

      trigger.dispatchEvent(clickEvent);

      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(stopPropagationSpy).toHaveBeenCalled();
    });
  });

  describe('Desktop Behavior', () => {
    it('should not toggle on click for non-touch devices', () => {
      render(
        <MobileTooltip content={defaultContent}>
          {defaultChildren}
        </MobileTooltip>
      );

      const trigger = screen.getByTestId('tooltip-trigger');

      // Without touchStart, it's not a touch device
      // Click should not toggle the tooltip
      fireEvent.click(trigger);

      // Tooltip should still be closed (hover behavior is handled by Radix)
      const tooltip = screen.getByTestId('tooltip');
      expect(tooltip).toHaveAttribute('data-open', 'false');
    });

    it('should allow Radix to control open state for desktop', () => {
      render(
        <MobileTooltip content={defaultContent}>
          {defaultChildren}
        </MobileTooltip>
      );

      // Simulate Radix calling onOpenChange (like on hover)
      // Wrap in act() to ensure React processes state updates
      act(() => {
        if (mockHandlers.openChange) {
          mockHandlers.openChange(true);
        }
      });

      // The tooltip should open
      const tooltip = screen.getByTestId('tooltip');
      expect(tooltip).toHaveAttribute('data-open', 'true');
    });
  });

  describe('Outside Click Dismissal', () => {
    it('should close tooltip on pointer down outside', () => {
      render(
        <MobileTooltip content={defaultContent}>
          {defaultChildren}
        </MobileTooltip>
      );

      const trigger = screen.getByTestId('tooltip-trigger');

      // Open the tooltip (simulate touch device)
      fireEvent.touchStart(trigger);
      fireEvent.click(trigger);
      expect(screen.getByTestId('tooltip')).toHaveAttribute('data-open', 'true');

      // Call the pointerDownOutside handler
      // Wrap in act() to ensure React processes state updates
      act(() => {
        if (mockHandlers.pointerDownOutside) {
          mockHandlers.pointerDownOutside();
        }
      });

      // Tooltip should be closed
      expect(screen.getByTestId('tooltip')).toHaveAttribute('data-open', 'false');
    });
  });

  describe('Touch Device Open Change Ignoring', () => {
    it('should ignore Radix onOpenChange for touch devices', () => {
      render(
        <MobileTooltip content={defaultContent}>
          {defaultChildren}
        </MobileTooltip>
      );

      const trigger = screen.getByTestId('tooltip-trigger');

      // Mark as touch device
      fireEvent.touchStart(trigger);

      // Open via click
      fireEvent.click(trigger);
      expect(screen.getByTestId('tooltip')).toHaveAttribute('data-open', 'true');

      // Simulate Radix trying to close it (like hover leave)
      if (mockHandlers.openChange) {
        mockHandlers.openChange(false);
      }

      // Tooltip should still be open (ignored Radix's close)
      expect(screen.getByTestId('tooltip')).toHaveAttribute('data-open', 'true');
    });
  });

  describe('Accessibility', () => {
    it('should use asChild on TooltipTrigger', () => {
      render(
        <MobileTooltip content={defaultContent}>
          {defaultChildren}
        </MobileTooltip>
      );

      const trigger = screen.getByTestId('tooltip-trigger');
      expect(trigger).toHaveAttribute('data-aschild', 'true');
    });
  });
});
