/**
 * ParentalConsentModal Component Tests
 *
 * Tests for the full consent form modal with parent email,
 * child age, and consent checkbox.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ParentalConsentModal } from '../ParentalConsentModal';

// Mock useLanguage
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'consent.modal.title': 'Parental Consent Form',
        'consent.modal.subtitle': 'For Educational Features',
        'consent.modal.intro': 'Please fill out this form to enable educational features.',
        'consent.parentEmail': 'Parent/Guardian Email',
        'consent.parentEmailHint': "We'll send a confirmation to this email",
        'consent.childAge': "Child's Age",
        'consent.childAgeHint': 'Select your age',
        'consent.agreeTerms': 'I consent to data collection for educational purposes',
        'consent.agreeTermsHint': 'Required to use educational features',
        'consent.submit': 'Submit Consent',
        'consent.submitting': 'Submitting...',
        'consent.privacyLink': 'Read our Privacy Policy',
        'consent.termsLink': 'Read our Terms of Service',
        'consent.modal.error.invalidEmail': 'Please enter a valid email address',
        'consent.modal.error.selectAge': "Please select the child's age",
        'consent.modal.error.acceptTerms': 'You must accept the terms to continue',
        'consent.modal.success.title': 'Consent Submitted!',
        'consent.modal.success.message': 'Educational features are now enabled.',
        'consent.modal.success.action': 'Continue',
        'common.close': 'Close',
      };
      let result = translations[key] || key;
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          result = result.replace(`{{${k}}}`, String(v));
        });
      }
      return result;
    },
    language: 'en',
    dir: 'ltr',
  }),
}));

// Mock useParentalConsent
const mockSubmitConsent = vi.fn();
vi.mock('@/hooks/useParentalConsent', () => ({
  useParentalConsent: () => ({
    submitConsent: mockSubmitConsent,
    loading: false,
    error: null,
  }),
}));

describe('ParentalConsentModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSuccess: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSubmitConsent.mockResolvedValue(true);
  });

  describe('rendering', () => {
    it('renders modal when isOpen is true', () => {
      render(<ParentalConsentModal {...defaultProps} />);

      expect(screen.getByText('Parental Consent Form')).toBeInTheDocument();
    });

    it('renders email input field', () => {
      render(<ParentalConsentModal {...defaultProps} />);

      expect(screen.getByLabelText(/parent.*email/i)).toBeInTheDocument();
    });

    it('renders age select field', () => {
      render(<ParentalConsentModal {...defaultProps} />);

      expect(screen.getByLabelText(/child.*age/i)).toBeInTheDocument();
    });

    it('renders consent checkbox', () => {
      render(<ParentalConsentModal {...defaultProps} />);

      expect(screen.getByRole('checkbox')).toBeInTheDocument();
    });

    it('renders submit button', () => {
      render(<ParentalConsentModal {...defaultProps} />);

      expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
    });

    it('renders privacy policy link', () => {
      render(<ParentalConsentModal {...defaultProps} />);

      expect(screen.getByText(/privacy policy/i)).toBeInTheDocument();
    });
  });

  describe('form validation', () => {
    it('shows error when submitting with empty email', async () => {
      const user = userEvent.setup();
      render(<ParentalConsentModal {...defaultProps} />);

      // Select age and check consent
      const ageSelect = screen.getByLabelText(/child.*age/i);
      await user.selectOptions(ageSelect, '10');

      const checkbox = screen.getByRole('checkbox');
      await user.click(checkbox);

      // Submit without email
      const submitButton = screen.getByRole('button', { name: /submit/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/valid email/i)).toBeInTheDocument();
      });
    });

    it('shows error when submitting without selecting age', async () => {
      const user = userEvent.setup();
      render(<ParentalConsentModal {...defaultProps} />);

      // Fill email and check consent but don't select age
      const emailInput = screen.getByLabelText(/parent.*email/i);
      await user.type(emailInput, 'parent@example.com');

      const checkbox = screen.getByRole('checkbox');
      await user.click(checkbox);

      // Submit without selecting age
      const submitButton = screen.getByRole('button', { name: /submit/i });
      await user.click(submitButton);

      await waitFor(() => {
        // Look for the error message specifically (not the placeholder option)
        const errorElement = screen.getByRole('alert');
        expect(errorElement).toHaveTextContent(/select.*age/i);
      });
    });

    it('shows error when submitting without accepting terms', async () => {
      const user = userEvent.setup();
      render(<ParentalConsentModal {...defaultProps} />);

      // Fill email and select age but don't check consent
      const emailInput = screen.getByLabelText(/parent.*email/i);
      await user.type(emailInput, 'parent@example.com');

      const ageSelect = screen.getByLabelText(/child.*age/i);
      await user.selectOptions(ageSelect, '10');

      // Submit without accepting terms
      const submitButton = screen.getByRole('button', { name: /submit/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/accept.*terms/i)).toBeInTheDocument();
      });
    });
  });

  describe('form submission', () => {
    it('calls submitConsent with correct data on valid submission', async () => {
      const user = userEvent.setup();
      render(<ParentalConsentModal {...defaultProps} />);

      // Fill all fields
      const emailInput = screen.getByLabelText(/parent.*email/i);
      await user.type(emailInput, 'parent@example.com');

      const ageSelect = screen.getByLabelText(/child.*age/i);
      await user.selectOptions(ageSelect, '10');

      const checkbox = screen.getByRole('checkbox');
      await user.click(checkbox);

      // Submit
      const submitButton = screen.getByRole('button', { name: /submit/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockSubmitConsent).toHaveBeenCalledWith({
          parentEmail: 'parent@example.com',
          childBirthYear: expect.any(Number),
        });
      });
    });

    it('calls onSuccess after successful submission', async () => {
      const user = userEvent.setup();
      const onSuccess = vi.fn();
      render(<ParentalConsentModal {...defaultProps} onSuccess={onSuccess} />);

      // Fill all fields
      const emailInput = screen.getByLabelText(/parent.*email/i);
      await user.type(emailInput, 'parent@example.com');

      const ageSelect = screen.getByLabelText(/child.*age/i);
      await user.selectOptions(ageSelect, '10');

      const checkbox = screen.getByRole('checkbox');
      await user.click(checkbox);

      // Submit
      const submitButton = screen.getByRole('button', { name: /submit/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
      });
    });
  });

  describe('accessibility', () => {
    it('has accessible dialog role', () => {
      render(<ParentalConsentModal {...defaultProps} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('has accessible form labels', () => {
      render(<ParentalConsentModal {...defaultProps} />);

      // All form controls should be labeled
      expect(screen.getByLabelText(/parent.*email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/child.*age/i)).toBeInTheDocument();
    });

    it('can be navigated with keyboard', async () => {
      const user = userEvent.setup();
      render(<ParentalConsentModal {...defaultProps} />);

      // Email input should be auto-focused when modal opens (accessible pattern)
      await waitFor(() => {
        expect(screen.getByLabelText(/parent.*email/i)).toHaveFocus();
      });

      // Tab to age select
      await user.tab();
      expect(screen.getByLabelText(/child.*age/i)).toHaveFocus();
    });
  });
});
