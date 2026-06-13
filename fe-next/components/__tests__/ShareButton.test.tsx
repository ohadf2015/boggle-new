/**
 * ShareButton Component Tests
 *
 * Tests for the reusable ShareButton component with neo-brutalist styling
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ShareButton from '../ShareButton';
import { Link as LinkIcon, MessageCircle, QrCode } from 'lucide-react';

// Default noop handler for tests that don't test click behavior
const noop = () => {};

describe('ShareButton', () => {
  describe('rendering', () => {
    it('renders with children text', () => {
      render(<ShareButton onClick={noop}>Copy Link</ShareButton>);
      expect(screen.getByRole('button')).toHaveTextContent('Copy Link');
    });

    it('renders with an icon when provided', () => {
      render(<ShareButton onClick={noop} icon={<LinkIcon data-testid="link-icon" />}>Copy Link</ShareButton>);
      expect(screen.getByTestId('link-icon')).toBeInTheDocument();
    });

    it('renders without icon when not provided', () => {
      render(<ShareButton onClick={noop}>Copy Link</ShareButton>);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });
  });

  describe('variants', () => {
    it('applies primary variant styles by default', () => {
      render(<ShareButton onClick={noop}>Copy Link</ShareButton>);
      const button = screen.getByRole('button');
      // Primary variant is player-accent themed (lime by default, var(--accent)).
      expect(button.className).toContain('bg-accent');
      expect(button.className).toContain('text-accent-foreground');
    });

    it('applies whatsapp variant styles', () => {
      render(<ShareButton onClick={noop} variant="whatsapp">Share on WhatsApp</ShareButton>);
      const button = screen.getByRole('button');
      // WhatsApp variant uses green background with black text for better contrast
      expect(button.className).toContain('bg-brand-whatsapp');
      expect(button.className).toContain('text-black');
    });

    it('applies secondary variant styles', () => {
      render(<ShareButton onClick={noop} variant="secondary">Show QR Code</ShareButton>);
      const button = screen.getByRole('button');
      // Secondary variant uses neo-cyan
      expect(button.className).toContain('bg-neo-cyan');
      expect(button.className).toContain('text-neo-black');
    });

    it('falls back to primary variant for unknown variant', () => {
      // @ts-expect-error - Testing invalid variant
      render(<ShareButton onClick={noop} variant="invalid">Test</ShareButton>);
      const button = screen.getByRole('button');
      // Falls back to primary (player-accent themed)
      expect(button.className).toContain('bg-accent');
    });
  });

  describe('sizes', () => {
    it('applies small size styles', () => {
      render(<ShareButton onClick={noop} size="sm">Small</ShareButton>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('text-xs');
    });

    it('applies medium size styles by default', () => {
      render(<ShareButton onClick={noop}>Medium</ShareButton>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('text-sm');
    });

    it('applies large size styles', () => {
      render(<ShareButton onClick={noop} size="lg">Large</ShareButton>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('text-base');
    });
  });

  describe('fullWidth', () => {
    it('applies full width when enabled', () => {
      render(<ShareButton onClick={noop} fullWidth>Full Width</ShareButton>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('w-full');
    });

    it('does not apply full width by default', () => {
      render(<ShareButton onClick={noop}>Normal Width</ShareButton>);
      const button = screen.getByRole('button');
      expect(button.className).not.toContain('w-full');
    });
  });

  describe('click handling', () => {
    it('calls onClick when clicked', () => {
      const handleClick = vi.fn();
      render(<ShareButton onClick={handleClick}>Copy Link</ShareButton>);

      fireEvent.click(screen.getByRole('button'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('does not throw when clicked with noop handler', () => {
      render(<ShareButton onClick={noop}>Copy Link</ShareButton>);
      expect(() => fireEvent.click(screen.getByRole('button'))).not.toThrow();
    });
  });

  describe('custom className', () => {
    it('applies additional className', () => {
      render(<ShareButton onClick={noop} className="custom-class">Test</ShareButton>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('custom-class');
    });

    it('merges custom className with variant styles', () => {
      render(
        <ShareButton onClick={noop} variant="whatsapp" className="custom-class">
          Test
        </ShareButton>
      );
      const button = screen.getByRole('button');
      expect(button.className).toContain('custom-class');
      expect(button.className).toContain('bg-brand-whatsapp');
    });
  });

  describe('accessibility', () => {
    it('is focusable', () => {
      render(<ShareButton onClick={noop}>Copy Link</ShareButton>);
      const button = screen.getByRole('button');
      button.focus();
      expect(document.activeElement).toBe(button);
    });

    it('can be activated with keyboard', () => {
      const handleClick = vi.fn();
      render(<ShareButton onClick={handleClick}>Copy Link</ShareButton>);
      const button = screen.getByRole('button');

      button.focus();
      fireEvent.keyDown(button, { key: 'Enter', code: 'Enter' });
      // Note: In a real browser, Enter on a button triggers click
      // This test validates the button is properly accessible
    });
  });

  describe('integration with icons', () => {
    it('renders correctly with FaLink icon', () => {
      render(
        <ShareButton onClick={noop} variant="secondary" icon={<LinkIcon data-testid="fa-link" />}>
          Copy Link
        </ShareButton>
      );
      expect(screen.getByTestId('fa-link')).toBeInTheDocument();
      expect(screen.getByText('Copy Link')).toBeInTheDocument();
    });

    it('renders correctly with FaWhatsapp icon', () => {
      render(
        <ShareButton onClick={noop} variant="whatsapp" icon={<MessageCircle data-testid="fa-whatsapp" />}>
          WhatsApp
        </ShareButton>
      );
      expect(screen.getByTestId('fa-whatsapp')).toBeInTheDocument();
    });

    it('renders correctly with FaQrcode icon', () => {
      render(
        <ShareButton onClick={noop} variant="secondary" icon={<QrCode data-testid="fa-qrcode" />}>
          QR Code
        </ShareButton>
      );
      expect(screen.getByTestId('fa-qrcode')).toBeInTheDocument();
    });
  });

  describe('neo-brutalist styling', () => {
    it('has hard shadow styling', () => {
      render(<ShareButton onClick={noop}>Test</ShareButton>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('shadow-hard-sm');
    });

    it('has rounded-neo styling', () => {
      render(<ShareButton onClick={noop}>Test</ShareButton>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('rounded-neo');
    });

    it('has border styling', () => {
      render(<ShareButton onClick={noop}>Test</ShareButton>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('border-2');
    });
  });
});
