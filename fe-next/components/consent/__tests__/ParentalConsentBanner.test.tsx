/**
 * ParentalConsentBanner Component Tests
 *
 * Tests for the dismissible consent banner that prompts users
 * to provide parental consent for educational features.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ParentalConsentBanner } from '../ParentalConsentBanner';

// Mock useLanguage
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'consent.banner.title': 'Consent Required',
        'consent.banner.message': 'To access educational features, we need parental consent.',
        'consent.banner.action': 'Provide Consent',
        'consent.banner.dismiss': 'Maybe Later',
      };
      return translations[key] || key;
    },
    language: 'en',
  }),
}));

describe('ParentalConsentBanner', () => {
  const defaultProps = {
    onRequestConsent: vi.fn(),
    onDismiss: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders when isVisible is true', () => {
      render(<ParentalConsentBanner {...defaultProps} isVisible={true} />);

      expect(screen.getByText('Consent Required')).toBeInTheDocument();
      expect(screen.getByText('To access educational features, we need parental consent.')).toBeInTheDocument();
    });

    it('does not render when isVisible is false', () => {
      render(<ParentalConsentBanner {...defaultProps} isVisible={false} />);

      expect(screen.queryByText('Consent Required')).not.toBeInTheDocument();
    });

    it('renders action button', () => {
      render(<ParentalConsentBanner {...defaultProps} isVisible={true} />);

      expect(screen.getByRole('button', { name: 'Provide Consent' })).toBeInTheDocument();
    });

    it('renders dismiss button', () => {
      render(<ParentalConsentBanner {...defaultProps} isVisible={true} />);

      expect(screen.getByRole('button', { name: /maybe later|dismiss/i })).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('calls onRequestConsent when action button is clicked', () => {
      const onRequestConsent = vi.fn();
      render(
        <ParentalConsentBanner
          {...defaultProps}
          isVisible={true}
          onRequestConsent={onRequestConsent}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: 'Provide Consent' }));

      expect(onRequestConsent).toHaveBeenCalledTimes(1);
    });

    it('calls onDismiss when dismiss button is clicked', () => {
      const onDismiss = vi.fn();
      render(
        <ParentalConsentBanner
          {...defaultProps}
          isVisible={true}
          onDismiss={onDismiss}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /maybe later|dismiss/i }));

      expect(onDismiss).toHaveBeenCalledTimes(1);
    });
  });

  describe('accessibility', () => {
    it('has role="alert" for screen reader announcement', () => {
      render(<ParentalConsentBanner {...defaultProps} isVisible={true} />);

      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('has aria-live for dynamic updates', () => {
      render(<ParentalConsentBanner {...defaultProps} isVisible={true} />);

      const alert = screen.getByRole('alert');
      expect(alert).toHaveAttribute('aria-live', 'polite');
    });

    it('action button meets minimum touch target size', () => {
      render(<ParentalConsentBanner {...defaultProps} isVisible={true} />);

      const actionButton = screen.getByRole('button', { name: 'Provide Consent' });
      // Check for min-h-[44px] or min-h-[48px] class
      expect(actionButton.className).toMatch(/min-h-\[4[48]px\]/);
    });

    it('dismiss button meets minimum touch target size', () => {
      render(<ParentalConsentBanner {...defaultProps} isVisible={true} />);

      const dismissButton = screen.getByRole('button', { name: /maybe later|dismiss/i });
      expect(dismissButton.className).toMatch(/min-h-\[4[48]px\]/);
    });
  });

  describe('styling', () => {
    it('has neo-brutalist styling', () => {
      render(<ParentalConsentBanner {...defaultProps} isVisible={true} />);

      const alert = screen.getByRole('alert');
      // Check for border and shadow classes
      expect(alert.className).toContain('border');
    });
  });
});
