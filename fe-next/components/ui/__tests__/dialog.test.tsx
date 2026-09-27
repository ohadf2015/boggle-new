/**
 * Tests for Dialog component
 *
 * Tests the Dialog UI primitive including:
 * - DialogHeader variant support (yellow/pink/cyan/gradient)
 * - Custom background support for gradients
 * - Default variant behavior
 * - Accessibility attributes
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from '../dialog';

// Mock Radix UI Dialog primitives
vi.mock('@radix-ui/react-dialog', () => {
  const React = require('react');

  const MockOverlay = React.forwardRef(
    (
      { className, ...props }: React.HTMLAttributes<HTMLDivElement>,
      ref: React.Ref<HTMLDivElement>
    ) => (
      <div ref={ref} className={className} data-testid="dialog-overlay" {...props} />
    )
  );
  MockOverlay.displayName = 'MockOverlay';

  const MockContent = React.forwardRef(
    (
      { className, children, ...props }: React.HTMLAttributes<HTMLDivElement>,
      ref: React.Ref<HTMLDivElement>
    ) => (
      <div ref={ref} className={className} data-testid="dialog-content" {...props}>
        {children}
      </div>
    )
  );
  MockContent.displayName = 'MockContent';

  const MockTitle = React.forwardRef(
    (
      { className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>,
      ref: React.Ref<HTMLHeadingElement>
    ) => (
      <h2 ref={ref} className={className} data-testid="dialog-title" {...props}>
        {children}
      </h2>
    )
  );
  MockTitle.displayName = 'MockTitle';

  const MockDescription = React.forwardRef(
    (
      { className, children, ...props }: React.HTMLAttributes<HTMLParagraphElement>,
      ref: React.Ref<HTMLParagraphElement>
    ) => (
      <p ref={ref} className={className} data-testid="dialog-description" {...props}>
        {children}
      </p>
    )
  );
  MockDescription.displayName = 'MockDescription';

  return {
    Root: ({ children, open }: { children: React.ReactNode; open?: boolean }) =>
      open ? <div data-testid="dialog-root">{children}</div> : null,
    Trigger: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
    Portal: ({ children }: { children: React.ReactNode }) => <div data-testid="dialog-portal">{children}</div>,
    Overlay: MockOverlay,
    Content: MockContent,
    Title: MockTitle,
    Description: MockDescription,
    Close: ({ children }: { children: React.ReactNode }) => <button data-testid="dialog-close">{children}</button>,
  };
});

describe('Dialog Component', () => {
  describe('DialogHeader Variants', () => {
    it('renders with default yellow variant', () => {
      render(
        <Dialog open={true}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Test Dialog</DialogTitle>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      );

      const header = screen.getByTestId('dialog-title').parentElement;
      expect(header).toHaveClass('bg-neo-yellow');
      expect(header).toHaveClass('border-b-3');
      expect(header).toHaveClass('border-neo-black');
    });

    it('renders with pink variant', () => {
      render(
        <Dialog open={true}>
          <DialogContent>
            <DialogHeader variant="pink">
              <DialogTitle>Test Dialog</DialogTitle>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      );

      const header = screen.getByTestId('dialog-title').parentElement;
      expect(header).toHaveClass('bg-neo-pink');
    });

    it('renders with cyan variant', () => {
      render(
        <Dialog open={true}>
          <DialogContent>
            <DialogHeader variant="cyan">
              <DialogTitle>Test Dialog</DialogTitle>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      );

      const header = screen.getByTestId('dialog-title').parentElement;
      expect(header).toHaveClass('bg-neo-cyan');
    });

    it('renders with gradient variant and custom background', () => {
      render(
        <Dialog open={true}>
          <DialogContent>
            <DialogHeader variant="gradient" customBg="bg-linear-to-r from-amber-700 to-amber-500">
              <DialogTitle>Test Dialog</DialogTitle>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      );

      const header = screen.getByTestId('dialog-title').parentElement;
      expect(header).toHaveClass('bg-linear-to-r');
      expect(header).toHaveClass('from-amber-700');
      expect(header).toHaveClass('to-amber-500');
    });

    it('uses customBg when provided regardless of variant', () => {
      render(
        <Dialog open={true}>
          <DialogContent>
            <DialogHeader variant="yellow" customBg="bg-custom-color">
              <DialogTitle>Test Dialog</DialogTitle>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      );

      const header = screen.getByTestId('dialog-title').parentElement;
      expect(header).toHaveClass('bg-custom-color');
      expect(header).not.toHaveClass('bg-neo-yellow');
    });

    it('renders with responsive padding', () => {
      render(
        <Dialog open={true}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Test Dialog</DialogTitle>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      );

      const header = screen.getByTestId('dialog-title').parentElement;
      // Reduced padding: mobile 12px (p-3), sm 16px (p-4), lg 20px (p-5)
      expect(header).toHaveClass('p-3');
      expect(header).toHaveClass('sm:p-4');
      expect(header).toHaveClass('lg:p-5');
    });

    it('applies custom className alongside variant styles', () => {
      render(
        <Dialog open={true}>
          <DialogContent>
            <DialogHeader variant="pink" className="custom-class">
              <DialogTitle>Test Dialog</DialogTitle>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      );

      const header = screen.getByTestId('dialog-title').parentElement;
      expect(header).toHaveClass('bg-neo-pink');
      expect(header).toHaveClass('custom-class');
    });
  });

  describe('DialogContent', () => {
    it('renders with noDescription prop', () => {
      render(
        <Dialog open={true}>
          <DialogContent noDescription>
            <DialogHeader>
              <DialogTitle>Test Dialog</DialogTitle>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      );

      const content = screen.getByTestId('dialog-content');
      expect(content).toBeInTheDocument();
      // aria-describedby should not be set when noDescription is true
      expect(content.getAttribute('aria-describedby')).toBeNull();
    });

    it('renders close button by default', () => {
      render(
        <Dialog open={true}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Test Dialog</DialogTitle>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      );

      const closeButton = screen.getByTestId('dialog-close');
      expect(closeButton).toBeInTheDocument();
    });

    it('hides close button when hideCloseButton is true', () => {
      render(
        <Dialog open={true}>
          <DialogContent hideCloseButton>
            <DialogHeader>
              <DialogTitle>Test Dialog</DialogTitle>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      );

      const closeButton = screen.queryByTestId('dialog-close');
      expect(closeButton).not.toBeInTheDocument();
    });
  });

  describe('Complete Dialog Structure', () => {
    it('renders full dialog with all components', () => {
      render(
        <Dialog open={true}>
          <DialogContent noDescription>
            <DialogHeader variant="pink">
              <DialogTitle>Test Title</DialogTitle>
            </DialogHeader>
            <DialogBody>
              <p>Test Content</p>
            </DialogBody>
            <DialogFooter>
              <button>Cancel</button>
              <button>Confirm</button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );

      expect(screen.getByTestId('dialog-content')).toBeInTheDocument();
      expect(screen.getByTestId('dialog-title')).toHaveTextContent('Test Title');
      expect(screen.getByText('Test Content')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Confirm')).toBeInTheDocument();
    });
  });
});
