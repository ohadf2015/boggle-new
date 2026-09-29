import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TeacherProTrialExpiringBanner } from '../TeacherProTrialExpiringBanner';

const captureMock = vi.fn();
vi.mock('@/lib/analytics/lazyPosthog', () => ({
  default: {
    capture: (...args: unknown[]) => captureMock(...args),
    register: vi.fn(),
    __loaded: true,
  },
}));

const toastError = vi.fn();
vi.mock('react-hot-toast', () => ({
  default: {
    error: (...a: unknown[]) => toastError(...a),
    success: vi.fn(),
  },
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, p?: Record<string, string>) =>
      p ? `${k}:${Object.values(p).join(',')}` : k,
    language: 'en',
  }),
}));

describe('TeacherProTrialExpiringBanner', () => {
  beforeEach(() => {
    captureMock.mockReset();
    toastError.mockReset();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('visibility at <= 3 days', () => {
    it('renders when 3 days remain and displays days left + loss description', () => {
      const trialExpires = new Date(Date.now() + 3 * 86400000).toISOString();
      render(<TeacherProTrialExpiringBanner trialExpires={trialExpires} />);

      const banner = screen.getByTestId('teacher-pro-trial-expiring');
      expect(banner).toBeInTheDocument();
      expect(banner).toHaveAttribute('data-days', '3');
      expect(
        screen.getByText(/teacher.subscription.trialLifecycleTitle:3/),
      ).toBeInTheDocument();
      expect(
        screen.getByText('teacher.subscription.trialExpiringLoss'),
      ).toBeInTheDocument();
    });

    it('renders when 1 day remains with singular title', () => {
      const trialExpires = new Date(Date.now() + 1 * 86400000).toISOString();
      render(<TeacherProTrialExpiringBanner trialExpires={trialExpires} />);

      expect(screen.getByTestId('teacher-pro-trial-expiring')).toBeInTheDocument();
      expect(
        screen.getByText('teacher.subscription.trialLifecycleTitleOne'),
      ).toBeInTheDocument();
    });

    it('renders when 0 days remain (today) with today title', () => {
      const trialExpires = new Date(Date.now() - 1000).toISOString();
      render(<TeacherProTrialExpiringBanner trialExpires={trialExpires} />);

      expect(screen.getByTestId('teacher-pro-trial-expiring')).toBeInTheDocument();
      expect(
        screen.getByText('teacher.subscription.trialLifecycleTitleToday'),
      ).toBeInTheDocument();
    });

    it('does NOT render when more than 3 days remain (e.g. 5 days)', () => {
      const trialExpires = new Date(Date.now() + 5 * 86400000).toISOString();
      const { container } = render(
        <TeacherProTrialExpiringBanner trialExpires={trialExpires} />,
      );

      expect(screen.queryByTestId('teacher-pro-trial-expiring')).toBeNull();
      expect(container).toBeEmptyDOMElement();
    });

    it('does NOT render when trialExpires is null', () => {
      const { container } = render(
        <TeacherProTrialExpiringBanner trialExpires={null} />,
      );

      expect(screen.queryByTestId('teacher-pro-trial-expiring')).toBeNull();
      expect(container).toBeEmptyDOMElement();
    });
  });

  describe('dismissal', () => {
    it('clicking dismiss calls onDismiss and unmounts banner', () => {
      const onDismiss = vi.fn();
      const trialExpires = new Date(Date.now() + 2 * 86400000).toISOString();
      render(
        <TeacherProTrialExpiringBanner
          trialExpires={trialExpires}
          onDismiss={onDismiss}
        />,
      );

      expect(screen.getByTestId('teacher-pro-trial-expiring')).toBeInTheDocument();
      fireEvent.click(screen.getByTestId('teacher-pro-trial-expiring-dismiss'));

      expect(onDismiss).toHaveBeenCalledTimes(1);
      expect(screen.queryByTestId('teacher-pro-trial-expiring')).toBeNull();
    });
  });

  describe('paid checkout call without trial flag', () => {
    it('primary CTA calls POST /api/subscription/checkout WITHOUT trial flag and redirects', async () => {
      const checkoutUrl = 'https://polar.sh/checkout/paid-pro';
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ url: checkoutUrl }),
      } as Response);

      const assign = vi.fn();
      const original = window.location;
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: { ...original, href: 'http://localhost/en/teacher', assign },
      });

      const trialExpires = new Date(Date.now() + 2 * 86400000).toISOString();
      render(<TeacherProTrialExpiringBanner trialExpires={trialExpires} />);

      const cta = screen.getByTestId('teacher-pro-trial-expiring-cta');
      expect(cta).toHaveTextContent('teacher.subscription.trialLifecycleCta');
      fireEvent.click(cta);

      await waitFor(() => expect(fetch).toHaveBeenCalled());
      expect(fetch).toHaveBeenCalledWith('/api/subscription/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      // Verify NO trial flag is passed
      const fetchArgs = vi.mocked(fetch).mock.calls[0];
      const requestOptions = fetchArgs[1];
      if (requestOptions?.body) {
        const parsedBody = JSON.parse(requestOptions.body as string);
        expect(parsedBody?.trial).toBeUndefined();
      }

      await waitFor(() => expect(window.location.href).toBe(checkoutUrl));
    });

    it('toasts error on 503 and does not redirect', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => ({}),
      } as Response);

      const trialExpires = new Date(Date.now() + 2 * 86400000).toISOString();
      render(<TeacherProTrialExpiringBanner trialExpires={trialExpires} />);

      fireEvent.click(screen.getByTestId('teacher-pro-trial-expiring-cta'));

      await waitFor(() =>
        expect(toastError).toHaveBeenCalledWith(
          'teacher.subscription.checkoutUnavailable',
        ),
      );
    });
  });

  describe('PostHog telemetry', () => {
    it('fires teacher_trial_expiring_shown once per display with days_remaining', () => {
      const trialExpires = new Date(Date.now() + 3 * 86400000).toISOString();
      const { rerender } = render(
        <TeacherProTrialExpiringBanner trialExpires={trialExpires} />,
      );

      expect(captureMock).toHaveBeenCalledWith('teacher_trial_expiring_shown', {
        days_remaining: 3,
      });
      expect(captureMock).toHaveBeenCalledTimes(1);

      // Re-render does not fire duplicate impression
      rerender(<TeacherProTrialExpiringBanner trialExpires={trialExpires} />);
      expect(captureMock).toHaveBeenCalledTimes(1);
    });

    it('fires teacher_upgrade_clicked with days_remaining on CTA click', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ url: 'https://polar.sh/checkout/123' }),
      } as Response);

      const trialExpires = new Date(Date.now() + 2 * 86400000).toISOString();
      render(<TeacherProTrialExpiringBanner trialExpires={trialExpires} />);

      fireEvent.click(screen.getByTestId('teacher-pro-trial-expiring-cta'));

      expect(captureMock).toHaveBeenCalledWith('teacher_upgrade_clicked', {
        days_remaining: 2,
      });
    });
  });
});
