import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TeacherProTrialOfferBanner } from '../TeacherProTrialOfferBanner';
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
vi.mock('react-hot-toast', () => ({ default: { error: (...a: unknown[]) => toastError(...a), success: vi.fn() } }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, p?: Record<string, string>) => (p ? `${k}:${Object.values(p).join(',')}` : k),
    language: 'en',
  }),
}));

describe('TeacherProTrialOfferBanner', () => {
  beforeEach(() => {
    toastError.mockReset();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('the primary CTA is Start 14-day free trial and POSTs { trial: true }', async () => {
    const href = 'https://polar.sh/checkout/trial';
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ url: href }),
    } as Response);
    const assign = vi.fn();
    const original = window.location;
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...original, href: 'http://localhost/en/teacher', assign },
    });

    render(<TeacherProTrialOfferBanner onDismiss={() => {}} />);
    expect(screen.getByTestId('teacher-pro-trial-offer-cta')).toHaveTextContent(
      'teacher.subscription.startTrial',
    );
    fireEvent.click(screen.getByTestId('teacher-pro-trial-offer-cta'));
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(fetch).toHaveBeenCalledWith('/api/subscription/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trial: true }),
    });
    await waitFor(() => expect(window.location.href).toBe(href));
  });

  it('toasts on 503 and does not navigate', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false, status: 503, json: async () => ({}) } as Response);
    render(<TeacherProTrialOfferBanner />);
    fireEvent.click(screen.getByTestId('teacher-pro-trial-offer-cta'));
    await waitFor(() => expect(toastError).toHaveBeenCalledWith('teacher.subscription.checkoutUnavailable'));
  });

  it('dismiss is wired', () => {
    const onDismiss = vi.fn();
    render(<TeacherProTrialOfferBanner onDismiss={onDismiss} />);
    fireEvent.click(screen.getByTestId('teacher-pro-trial-offer-dismiss'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});

describe('TeacherProTrialExpiringBanner (trial-expiring conversion surface)', () => {
  beforeEach(() => {
    captureMock.mockReset();
    toastError.mockReset();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('is visible when <= 3 days remain, showing days left and loss copy', () => {
    const trialExpires = new Date(Date.now() + 3 * 86400000).toISOString();
    render(<TeacherProTrialExpiringBanner trialExpires={trialExpires} />);

    expect(screen.getByTestId('teacher-pro-trial-expiring')).toBeInTheDocument();
    expect(screen.getByText(/teacher.subscription.trialLifecycleTitle:3/)).toBeInTheDocument();
    expect(screen.getByText('teacher.subscription.trialExpiringLoss')).toBeInTheDocument();
  });

  it('is hidden when more than 3 days remain', () => {
    const trialExpires = new Date(Date.now() + 5 * 86400000).toISOString();
    const { container } = render(<TeacherProTrialExpiringBanner trialExpires={trialExpires} />);

    expect(screen.queryByTestId('teacher-pro-trial-expiring')).toBeNull();
    expect(container).toBeEmptyDOMElement();
  });

  it('dismissal is wired and removes banner from view', () => {
    const onDismiss = vi.fn();
    const trialExpires = new Date(Date.now() + 2 * 86400000).toISOString();
    render(<TeacherProTrialExpiringBanner trialExpires={trialExpires} onDismiss={onDismiss} />);

    fireEvent.click(screen.getByTestId('teacher-pro-trial-expiring-dismiss'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('teacher-pro-trial-expiring')).toBeNull();
  });

  it('primary CTA makes paid-checkout call without trial flag and navigates directly', async () => {
    const checkoutUrl = 'https://polar.sh/checkout/paid';
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

    fireEvent.click(screen.getByTestId('teacher-pro-trial-expiring-cta'));

    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(fetch).toHaveBeenCalledWith('/api/subscription/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    const callArgs = vi.mocked(fetch).mock.calls[0][1];
    expect(callArgs?.body).toBeUndefined();

    await waitFor(() => expect(window.location.href).toBe(checkoutUrl));
  });

  it('fires teacher_trial_expiring_shown once per display with days_remaining', () => {
    const trialExpires = new Date(Date.now() + 3 * 86400000).toISOString();
    const { rerender } = render(<TeacherProTrialExpiringBanner trialExpires={trialExpires} />);

    expect(captureMock).toHaveBeenCalledWith('teacher_trial_expiring_shown', {
      days_remaining: 3,
    });
    expect(captureMock).toHaveBeenCalledTimes(1);

    rerender(<TeacherProTrialExpiringBanner trialExpires={trialExpires} />);
    expect(captureMock).toHaveBeenCalledTimes(1);
  });

  it('fires teacher_upgrade_clicked with days_remaining upon clicking upgrade CTA', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ url: 'https://polar.sh/checkout/paid' }),
    } as Response);

    const trialExpires = new Date(Date.now() + 1 * 86400000).toISOString();
    render(<TeacherProTrialExpiringBanner trialExpires={trialExpires} />);

    fireEvent.click(screen.getByTestId('teacher-pro-trial-expiring-cta'));

    expect(captureMock).toHaveBeenCalledWith('teacher_upgrade_clicked', {
      days_remaining: 1,
    });
  });
});

