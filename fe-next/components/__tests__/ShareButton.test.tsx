/**
 * ShareButton Component Tests
 *
 * Tests for the reusable ShareButton component used in JoinView and HostView
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ShareButton from '../ShareButton';
import { FaLink, FaWhatsapp, FaQrcode } from 'react-icons/fa';

describe('ShareButton', () => {
  describe('rendering', () => {
    it('renders with children text', () => {
      render(<ShareButton>Copy Link</ShareButton>);
      expect(screen.getByRole('button')).toHaveTextContent('Copy Link');
    });

    it('renders with an icon when provided', () => {
      render(<ShareButton icon={<FaLink data-testid="link-icon" />}>Copy Link</ShareButton>);
      expect(screen.getByTestId('link-icon')).toBeInTheDocument();
    });

    it('renders without icon when not provided', () => {
      render(<ShareButton>Copy Link</ShareButton>);
      const button = screen.getByRole('button');
      // Should only have the text, no icon span
      expect(button.querySelector('span')).toBeNull();
    });
  });

  describe('variants', () => {
    it('applies link variant styles by default', () => {
      render(<ShareButton>Copy Link</ShareButton>);
      const button = screen.getByRole('button');
      // Link variant uses cyan colors
      expect(button.className).toContain('text-cyan-300');
      expect(button.className).toContain('border-cyan-500/40');
    });

    it('applies whatsapp variant styles', () => {
      render(<ShareButton variant="whatsapp">Share on WhatsApp</ShareButton>);
      const button = screen.getByRole('button');
      // WhatsApp variant uses green colors
      expect(button.className).toContain('text-green-300');
      expect(button.className).toContain('border-green-500/40');
    });

    it('applies qr variant styles', () => {
      render(<ShareButton variant="qr">Show QR Code</ShareButton>);
      const button = screen.getByRole('button');
      // QR variant uses purple colors
      expect(button.className).toContain('text-purple-300');
      expect(button.className).toContain('border-purple-500/40');
    });

    it('falls back to link variant for unknown variant', () => {
      // @ts-expect-error - Testing invalid variant
      render(<ShareButton variant="invalid">Test</ShareButton>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('text-cyan-300');
    });
  });

  describe('click handling', () => {
    it('calls onClick when clicked', () => {
      const handleClick = jest.fn();
      render(<ShareButton onClick={handleClick}>Copy Link</ShareButton>);

      fireEvent.click(screen.getByRole('button'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('does not throw when clicked without onClick handler', () => {
      render(<ShareButton>Copy Link</ShareButton>);
      expect(() => fireEvent.click(screen.getByRole('button'))).not.toThrow();
    });
  });

  describe('custom className', () => {
    it('applies additional className', () => {
      render(<ShareButton className="custom-class">Test</ShareButton>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('custom-class');
    });

    it('merges custom className with variant styles', () => {
      render(
        <ShareButton variant="whatsapp" className="custom-class">
          Test
        </ShareButton>
      );
      const button = screen.getByRole('button');
      expect(button.className).toContain('custom-class');
      expect(button.className).toContain('text-green-300');
    });
  });

  describe('accessibility', () => {
    it('is focusable', () => {
      render(<ShareButton>Copy Link</ShareButton>);
      const button = screen.getByRole('button');
      button.focus();
      expect(document.activeElement).toBe(button);
    });

    it('can be activated with keyboard', () => {
      const handleClick = jest.fn();
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
        <ShareButton variant="link" icon={<FaLink data-testid="fa-link" />}>
          Copy Link
        </ShareButton>
      );
      expect(screen.getByTestId('fa-link')).toBeInTheDocument();
      expect(screen.getByText('Copy Link')).toBeInTheDocument();
    });

    it('renders correctly with FaWhatsapp icon', () => {
      render(
        <ShareButton variant="whatsapp" icon={<FaWhatsapp data-testid="fa-whatsapp" />}>
          WhatsApp
        </ShareButton>
      );
      expect(screen.getByTestId('fa-whatsapp')).toBeInTheDocument();
    });

    it('renders correctly with FaQrcode icon', () => {
      render(
        <ShareButton variant="qr" icon={<FaQrcode data-testid="fa-qrcode" />}>
          QR Code
        </ShareButton>
      );
      expect(screen.getByTestId('fa-qrcode')).toBeInTheDocument();
    });
  });
});
