/**
 * AccessRequestForm tests.
 *
 * The form is only ever rendered for a signed-up, email-verified account, so it
 * NO LONGER asks for name or email (we have them from signup — the server
 * derives them). It collects only role + use case, plus an optional school.
 * Covers: role picker, use-case validation, 2-step progress, error/success.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AccessRequestForm } from '../AccessRequestForm';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: any) => {
      const keys: Record<string, string> = {
        'education.access.greeting': 'Hey {name}!',
        'education.access.greeting_noname': "You're almost there!",
        'education.access.greeting_sub': 'We already have your name and email.',
        'education.access.applying_as': 'Applying as',
        'education.access.role_q': 'Which one are you?',
        'education.access.role_teacher': 'Teacher',
        'education.access.role_tutor': 'Tutor',
        'education.access.role_admin': 'School administrator',
        'education.access.role_parent': 'Parent / homeschool',
        'education.access.role_researcher': 'Researcher',
        'education.access.role_other': 'Other',
        'education.access.use_case_q': 'Now the fun part',
        'education.access.use_case_hint': 'How will you use LexiClash?',
        'education.access.use_case_placeholder': 'e.g. Friday vocab battles',
        'education.access.use_case_spark': 'Need a spark?',
        'education.access.use_case_ex1': 'Weekly vocabulary battles with my class',
        'education.access.use_case_ex2': 'Homework practice my students enjoy',
        'education.access.use_case_ex3': 'Live team games to review spelling',
        'education.access.use_case_ready': "Perfect — that's plenty!",
        'education.access.use_case_remaining': '{count} more characters to go',
        'education.access.school_q': "Where's your classroom? (optional)",
        'education.access.school_placeholder': 'School, tutoring center, or homeschool',
        'education.access.submit': 'Send application',
        'education.access.submitting': 'Sending…',
        'education.access.submit_error': 'Something went wrong. Please try again.',
        'education.access.rate_limited': 'Too many requests. Please try again in 24 hours.',
        'education.access.success_title': 'Application sent!',
        'education.access.success_body': 'We will review and email you within 24 hours.',
        'education.access.success_next': "We'll review and email you within 1-2 business days.",
      };
      const raw = keys[key] || key;
      return params ? raw.replace(/\{(\w+)\}/g, (_m, k) => String(params[k] ?? '')) : raw;
    },
    language: 'en',
  }),
}));

/** Fill the two required inputs: pick a role, then type a valid use case. */
async function fillValid(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('radio', { name: /Teacher/i }));
  await user.type(
    screen.getByRole('textbox', { name: /Now the fun part/i }),
    'This is my use case for the application'
  );
}

describe('AccessRequestForm', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
    vi.clearAllMocks();
  });

  describe('does not re-ask for signup details', () => {
    it('renders no name or email input', () => {
      render(<AccessRequestForm knownName="Jane Doe" knownEmail="jane@school.edu" />);
      expect(screen.queryByRole('textbox', { name: /full name/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('textbox', { name: /email/i })).not.toBeInTheDocument();
    });

    it('greets the applicant by their known first name', () => {
      render(<AccessRequestForm knownName="Jane Doe" knownEmail="jane@school.edu" />);
      expect(screen.getByText('Hey Jane!')).toBeInTheDocument();
    });

    it('shows the account it is applying as', () => {
      render(<AccessRequestForm knownName="Jane Doe" knownEmail="jane@school.edu" />);
      const chip = screen.getByTestId('applying-as');
      expect(chip).toHaveTextContent('Jane Doe');
      expect(chip).toHaveTextContent('jane@school.edu');
    });
  });

  describe('role picker', () => {
    it('renders a role radio for each option, none selected initially', () => {
      render(<AccessRequestForm />);
      const radios = screen.getAllByRole('radio');
      expect(radios).toHaveLength(6);
      radios.forEach((r) => expect(r).toHaveAttribute('aria-checked', 'false'));
    });

    it('selects a role on click', async () => {
      const user = userEvent.setup();
      render(<AccessRequestForm />);
      await user.click(screen.getByRole('radio', { name: /Tutor/i }));
      expect(screen.getByRole('radio', { name: /Tutor/i })).toHaveAttribute('aria-checked', 'true');
    });
  });

  describe('use-case quick-fill', () => {
    it('drops an example sentence into the textarea when a spark chip is clicked', async () => {
      const user = userEvent.setup();
      render(<AccessRequestForm />);
      await user.click(screen.getByRole('button', { name: /Weekly vocabulary battles/i }));
      expect(screen.getByRole('textbox', { name: /Now the fun part/i })).toHaveValue(
        'Weekly vocabulary battles with my class'
      );
    });
  });

  describe('2-step completeness progress', () => {
    it('renders 2 progress tiles, none filled initially', () => {
      render(<AccessRequestForm />);
      const progress = screen.getByTestId('access-form-progress');
      const tiles = progress.querySelectorAll('[data-progress-tile]');
      expect(tiles).toHaveLength(2);
      expect(progress.querySelectorAll('[data-progress-tile][data-filled="true"]')).toHaveLength(0);
    });

    it('fills tiles as role and use case become valid', async () => {
      const user = userEvent.setup();
      render(<AccessRequestForm />);
      const progress = screen.getByTestId('access-form-progress');
      const filled = () => progress.querySelectorAll('[data-progress-tile][data-filled="true"]').length;

      await user.click(screen.getByRole('radio', { name: /Teacher/i }));
      expect(filled()).toBe(1);

      await user.type(screen.getByRole('textbox', { name: /Now the fun part/i }), 'Classroom vocabulary practice');
      expect(filled()).toBe(2);
    });

    it('hides the progress indicator from assistive tech', () => {
      render(<AccessRequestForm />);
      expect(screen.getByTestId('access-form-progress')).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('submit gating', () => {
    it('keeps submit disabled until a role and use case are provided', async () => {
      const user = userEvent.setup();
      render(<AccessRequestForm />);
      const submitBtn = screen.getByRole('button', { name: /Send application/i });
      expect(submitBtn).toBeDisabled();

      await user.click(screen.getByRole('radio', { name: /Teacher/i }));
      expect(submitBtn).toBeDisabled(); // still need a use case

      await user.type(screen.getByRole('textbox', { name: /Now the fun part/i }), 'A full valid use case here');
      expect(submitBtn).toBeEnabled();
    });

    it('sends only role, locale, use_case and school — never name or email', async () => {
      const user = userEvent.setup();
      (global.fetch as any).mockResolvedValueOnce({ ok: true });
      render(<AccessRequestForm knownName="Jane Doe" knownEmail="jane@school.edu" />);
      await fillValid(user);
      await user.click(screen.getByRole('button', { name: /Send application/i }));

      await waitFor(() => expect(global.fetch).toHaveBeenCalled());
      const body = JSON.parse((global.fetch as any).mock.calls[0][1].body);
      expect(body).toMatchObject({ role: 'teacher', locale: 'en' });
      expect(body.use_case).toContain('use case');
      expect(body).not.toHaveProperty('full_name');
      expect(body).not.toHaveProperty('email');
      expect(body).not.toHaveProperty('country');
    });
  });

  describe('error feedback & a11y', () => {
    it('announces API errors via an aria-live alert', async () => {
      const user = userEvent.setup();
      (global.fetch as any).mockResolvedValueOnce({ ok: false, status: 500 });
      render(<AccessRequestForm />);
      await fillValid(user);
      await user.click(screen.getByRole('button', { name: /Send application/i }));

      await waitFor(() => {
        const alert = screen.getByRole('alert');
        expect(alert).toHaveAttribute('aria-live');
        expect(alert).toHaveTextContent('Something went wrong');
      });
    });

    it('shows the rate-limit message on 429', async () => {
      const user = userEvent.setup();
      (global.fetch as any).mockResolvedValueOnce({ ok: false, status: 429 });
      render(<AccessRequestForm />);
      await fillValid(user);
      await user.click(screen.getByRole('button', { name: /Send application/i }));

      await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Too many requests'));
    });
  });

  describe('post-submit guidance', () => {
    it('shows a success status region with next-steps guidance', async () => {
      const user = userEvent.setup();
      (global.fetch as any).mockResolvedValueOnce({ ok: true });
      render(<AccessRequestForm />);
      await fillValid(user);
      await user.click(screen.getByRole('button', { name: /Send application/i }));

      await waitFor(() => {
        const status = screen.getByRole('status');
        expect(status).toHaveTextContent('Application sent!');
        expect(status).toHaveTextContent(/business days/i);
      });
    });
  });
});
