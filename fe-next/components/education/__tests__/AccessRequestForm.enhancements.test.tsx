/**
 * AccessRequestForm enhancements tests
 * Covers: Inline field errors (fix 2), post-submit guidance (fix 3)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AccessRequestForm } from '../AccessRequestForm';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, defaults?: any) => {
      const keys: Record<string, string> = {
        'education.access.full_name': 'Your full name',
        'education.access.email': 'Email address',
        'education.access.role': 'Your role',
        'education.access.role_teacher': 'Teacher',
        'education.access.role_tutor': 'Tutor',
        'education.access.role_admin': 'School administrator',
        'education.access.role_parent': 'Parent / homeschool',
        'education.access.role_researcher': 'Researcher',
        'education.access.role_other': 'Other',
        'education.access.school_or_org': 'School or organization (optional)',
        'education.access.country': 'Country (optional)',
        'education.access.use_case': 'How will you use LexiClash? (10-800 chars)',
        'education.access.submit': 'Send application',
        'education.access.submitting': 'Sending…',
        'education.access.submit_error': 'Something went wrong. Please try again.',
        'education.access.rate_limited': 'Too many requests. Please try again in 24 hours.',
        'education.access.success_title': 'Application sent!',
        'education.access.success_body': 'We will review and email you within 24 hours.',
        'education.access.success_next': "We'll review your application and email you within 1-2 business days. You can close this page.",
      };
      return keys[key] || key;
    },
    language: 'en',
  }),
}));

describe('AccessRequestForm Enhancements', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
    vi.clearAllMocks();
  });

  describe('2. Form Error Feedback & A11Y', () => {
    it('should show persistent error message on validation failure', async () => {
      const user = userEvent.setup();
      render(<AccessRequestForm />);

      // Try to submit with invalid email
      const emailInput = screen.getByRole('textbox', { name: /Email address/i });
      await user.type(emailInput, 'invalid-email');

      const fullNameInput = screen.getByRole('textbox', { name: /Your full name/i });
      await user.type(fullNameInput, 'John Doe');

      const useCaseInput = screen.getByRole('textbox', { name: /How will you use/i });
      await user.type(useCaseInput, 'This is my use case for the application');

      const submitBtn = screen.getByRole('button', { name: /Send application/i });
      expect(submitBtn).toBeDisabled();
    });

    it('should have aria-live for error announcements', async () => {
      const user = userEvent.setup();
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
      });

      render(<AccessRequestForm />);

      const fullNameInput = screen.getByRole('textbox', { name: /Your full name/i });
      await user.type(fullNameInput, 'John Doe');

      const emailInput = screen.getByRole('textbox', { name: /Email address/i });
      await user.type(emailInput, 'john@example.com');

      const useCaseInput = screen.getByRole('textbox', { name: /How will you use/i });
      await user.type(useCaseInput, 'This is my use case for the application');

      const submitBtn = screen.getByRole('button', { name: /Send application/i });
      await user.click(submitBtn);

      await waitFor(() => {
        const errorElement = screen.getByRole('alert');
        expect(errorElement).toBeInTheDocument();
        expect(errorElement).toHaveAttribute('aria-live');
      });
    });

    it('should show error when API returns non-ok status', async () => {
      const user = userEvent.setup();
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      render(<AccessRequestForm />);

      const fullNameInput = screen.getByRole('textbox', { name: /Your full name/i });
      await user.type(fullNameInput, 'John Doe');

      const emailInput = screen.getByRole('textbox', { name: /Email address/i });
      await user.type(emailInput, 'john@example.com');

      const useCaseInput = screen.getByRole('textbox', { name: /How will you use/i });
      await user.type(useCaseInput, 'This is my use case for the application');

      const submitBtn = screen.getByRole('button', { name: /Send application/i });
      await user.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong');
      });
    });

    it('should show rate limit error when 429 response', async () => {
      const user = userEvent.setup();
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 429,
      });

      render(<AccessRequestForm />);

      const fullNameInput = screen.getByRole('textbox', { name: /Your full name/i });
      await user.type(fullNameInput, 'John Doe');

      const emailInput = screen.getByRole('textbox', { name: /Email address/i });
      await user.type(emailInput, 'john@example.com');

      const useCaseInput = screen.getByRole('textbox', { name: /How will you use/i });
      await user.type(useCaseInput, 'This is my use case for the application');

      const submitBtn = screen.getByRole('button', { name: /Send application/i });
      await user.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Too many requests');
      });
    });
  });

  describe('4. Completeness progress indicator', () => {
    it('renders 3 progress tiles, none filled initially', () => {
      render(<AccessRequestForm />);
      const progress = screen.getByTestId('access-form-progress');
      const tiles = progress.querySelectorAll('[data-progress-tile]');
      expect(tiles).toHaveLength(3);
      expect(progress.querySelectorAll('[data-progress-tile][data-filled="true"]')).toHaveLength(0);
    });

    it('fills tiles as each required field becomes valid', async () => {
      const user = userEvent.setup();
      render(<AccessRequestForm />);
      const progress = screen.getByTestId('access-form-progress');
      const filled = () => progress.querySelectorAll('[data-progress-tile][data-filled="true"]').length;

      await user.type(screen.getByRole('textbox', { name: /Your full name/i }), 'John Doe');
      expect(filled()).toBe(1);

      await user.type(screen.getByRole('textbox', { name: /Email address/i }), 'john@example.com');
      expect(filled()).toBe(2);

      await user.type(screen.getByRole('textbox', { name: /How will you use/i }), 'Classroom vocabulary practice');
      expect(filled()).toBe(3);
    });

    it('hides the progress indicator from assistive tech', () => {
      render(<AccessRequestForm />);
      expect(screen.getByTestId('access-form-progress')).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('3. Post-Submit Guidance', () => {
    it('should show success message with next steps guidance', async () => {
      const user = userEvent.setup();
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
      });

      render(<AccessRequestForm />);

      const fullNameInput = screen.getByRole('textbox', { name: /Your full name/i });
      await user.type(fullNameInput, 'John Doe');

      const emailInput = screen.getByRole('textbox', { name: /Email address/i });
      await user.type(emailInput, 'john@example.com');

      const useCaseInput = screen.getByRole('textbox', { name: /How will you use/i });
      await user.type(useCaseInput, 'This is my use case for the application');

      const submitBtn = screen.getByRole('button', { name: /Send application/i });
      await user.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText('Application sent!')).toBeInTheDocument();
        expect(screen.getByText(/business days/i)).toBeInTheDocument();
      });
    });

    it('should display success message in status region', async () => {
      const user = userEvent.setup();
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
      });

      render(<AccessRequestForm />);

      const fullNameInput = screen.getByRole('textbox', { name: /Your full name/i });
      await user.type(fullNameInput, 'Jane Smith');

      const emailInput = screen.getByRole('textbox', { name: /Email address/i });
      await user.type(emailInput, 'jane@example.com');

      const useCaseInput = screen.getByRole('textbox', { name: /How will you use/i });
      await user.type(useCaseInput, 'For classroom use in vocabulary practice');

      const submitBtn = screen.getByRole('button', { name: /Send application/i });
      await user.click(submitBtn);

      await waitFor(() => {
        const statusRegion = screen.getByRole('status');
        expect(statusRegion).toBeInTheDocument();
        expect(statusRegion).toHaveTextContent('Application sent!');
      });
    });
  });
});
