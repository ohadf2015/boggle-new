import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import toast from 'react-hot-toast';
import { TeacherTrialReminderBanner } from '../TeacherTrialReminderBanner';
import type { TrialStatus } from '@/lib/education/trial';

process.env.NEXT_PUBLIC_POSTHOG_KEY = 'phc_test_key';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, opts?: Record<string, unknown>) => `${k}${opts?.days !== undefined ? `:${opts.days}` : ''}`, language: 'en' }),
}));

const captureMock = vi.fn();
vi.mock('@/lib/analytics/lazyPosthog', () => ({
  default: {
    capture: (...args: unknown[]) => captureMock(...args),
    register: vi.fn(),
    __loaded: true,
  },
}));

const growthMock = vi.fn();
vi.mock('@/utils/growthTracking', () => ({
  trackGrowthEvent: (...args: unknown[]) => growthMock(...args),
}));

const goToPolarCheckout = vi.fn();
const postTeacherProCheckout = vi.fn();
vi.mock('@/lib/education/postTeacherProCheckout', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  postTeacherProCheckout: (...a: unknown[]) => postTeacherProCheckout(...a),
  goToPolarCheckout: (...a: unknown[]) => goToPolarCheckout(...a),
}));

vi.mock('react-hot-toast', () => ({ default: { error: vi.fn(), success: vi.fn() } }));

const DAY = 24 * 60 * 60 * 1000;

function createTrial(daysLeft: number, isExpired = false): TrialStatus {
  return {
    expiresAt: new Date(Date.now() + daysLeft * DAY).toISOString(),
    msLeft: isExpired ? -1000 : daysLeft * DAY,
    daysLeft: isExpired ? 0 : daysLeft,
    hoursLeft: isExpired ? 0 : daysLeft * 24,
    isExpired,
    isUrgent: !isExpired && daysLeft <= 3,
  };
}

describe('TeacherTrialReminderBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    goToPolarCheckout.mockReset();
    postTeacherProCheckout.mockReset();
    captureMock.mockReset();
    growthMock.mockReset();
    vi.mocked(toast.error).mockReset();
  });

  describe('display logic', () => {
    it('renders at 3 days', () => {
      render(<TeacherTrialReminderBanner trial={createTrial(3)} />);
      expect(screen.getByTestId('teacher-trial-reminder-banner')).toBeInTheDocument();
      expect(screen.getByTestId('teacher-trial-reminder-cta')).toBeInTheDocument();
    });

    it('renders at 1 day', () => {
      render(<TeacherTrialReminderBanner trial={createTrial(1)} />);
      expect(screen.getByTestId('teacher-trial-reminder-banner')).toBeInTheDocument();
    });

    it('is hidden at 4 days', () => {
      const { container } = render(<TeacherTrialReminderBanner trial={createTrial(4)} />);
      expect(container.firstChild).toBeNull();
      expect(screen.queryByTestId('teacher-trial-reminder-banner')).not.toBeInTheDocument();
    });

    it('is hidden when trial is null', () => {
      const { container } = render(<TeacherTrialReminderBanner trial={null} />);
      expect(container.firstChild).toBeNull();
    });

    it('is hidden when trial is expired', () => {
      const { container } = render(<TeacherTrialReminderBanner trial={createTrial(0, true)} />);
      expect(container.firstChild).toBeNull();
    });

    it('is hidden after dismiss click', () => {
      const onDismiss = vi.fn();
      render(<TeacherTrialReminderBanner trial={createTrial(3)} onDismiss={onDismiss} />);
      expect(screen.getByTestId('teacher-trial-reminder-banner')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('teacher-trial-reminder-dismiss'));
      expect(onDismiss).toHaveBeenCalledTimes(1);
      expect(screen.queryByTestId('teacher-trial-reminder-banner')).not.toBeInTheDocument();
    });
  });

  describe('CTA checkout flow', () => {
    it('calls postTeacherProCheckout with trial true, locale, placement dashboard_trial_reminder, then goToPolarCheckout with returned url', async () => {
      postTeacherProCheckout.mockResolvedValue({ ok: true, url: 'https://polar.sh/checkout/123' });
      render(<TeacherTrialReminderBanner trial={createTrial(3)} />);

      fireEvent.click(screen.getByTestId('teacher-trial-reminder-cta'));

      await waitFor(() => {
        expect(postTeacherProCheckout).toHaveBeenCalledWith(fetch, {
          trial: true,
          locale: 'en',
          placement: 'dashboard_trial_reminder',
        });
      });
      await waitFor(() => {
        expect(goToPolarCheckout).toHaveBeenCalledWith('https://polar.sh/checkout/123');
      });
    });

    it('toasts checkout failure when checkout service fails', async () => {
      postTeacherProCheckout.mockResolvedValue({ ok: false, status: 503 });
      render(<TeacherTrialReminderBanner trial={createTrial(3)} />);

      fireEvent.click(screen.getByTestId('teacher-trial-reminder-cta'));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('teacher.subscription.checkoutUnavailable');
      });
      expect(goToPolarCheckout).not.toHaveBeenCalled();
    });
  });

  describe('telemetry', () => {
    it('fires edu_trial_reminder_shown once on display, and edu_trial_reminder_cta_click on click and not on render', async () => {
      postTeacherProCheckout.mockResolvedValue({ ok: true, url: 'https://polar.sh/checkout/123' });
      const { rerender } = render(<TeacherTrialReminderBanner trial={createTrial(3)} />);

      const expectedProps = {
        days_remaining: 3,
        product: 'teacher_pro',
        placement: 'dashboard_trial_reminder',
      };

      expect(captureMock).toHaveBeenCalledWith('edu_trial_reminder_shown', expectedProps);
      expect(growthMock).toHaveBeenCalledWith('edu_trial_reminder_shown', expectedProps);

      // Not fired on render
      expect(captureMock).not.toHaveBeenCalledWith('edu_trial_reminder_cta_click', expect.anything());

      // Re-render does not fire shown again (ref guard)
      rerender(<TeacherTrialReminderBanner trial={createTrial(3)} />);
      const shownCalls = captureMock.mock.calls.filter((c) => c[0] === 'edu_trial_reminder_shown');
      expect(shownCalls.length).toBe(1);

      // Fire CTA click
      fireEvent.click(screen.getByTestId('teacher-trial-reminder-cta'));
      expect(captureMock).toHaveBeenCalledWith('edu_trial_reminder_cta_click', expectedProps);
      expect(growthMock).toHaveBeenCalledWith('edu_trial_reminder_cta_click', expectedProps);
    });
  });
});
