import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TeacherTrialUpgradeStatus } from '../TeacherTrialUpgradeStatus';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, p?: Record<string, string>) => (p ? `${k}:${Object.values(p).join(',')}` : k),
    language: 'en',
  }),
}));

const accessState: {
  trial: { isExpired: boolean; daysLeft: number } | null;
  isLoading: boolean;
} = { trial: { isExpired: false, daysLeft: 11 }, isLoading: false };
vi.mock('@/lib/education/useTeacherAccess', () => ({
  useTeacherAccess: () => ({
    hasAccess: true,
    status: 'approved',
    latestRequest: null,
    trial: accessState.trial,
    isLoading: accessState.isLoading,
  }),
}));

const proState: {
  hasPro: boolean;
  loading: boolean;
  status: string;
  source: string;
  trialUsed: boolean;
  trialExpires: string | null;
  periodEnd: string | null;
} = {
  hasPro: false,
  loading: false,
  status: 'active',
  source: 'polar',
  trialUsed: false,
  trialExpires: null,
  periodEnd: null,
};
vi.mock('@/hooks/useTeacherPro', () => ({
  useTeacherPro: () => ({
    hasPro: proState.hasPro,
    loading: proState.loading,
    status: proState.status,
    source: proState.source,
    trialUsed: proState.trialUsed,
    trialExpires: proState.trialExpires,
    periodEnd: proState.periodEnd,
    grant: null,
    grantExpired: false,
    known: true,
    portalUrl: null,
    refresh: vi.fn(),
  }),
}));

const trackViewed = vi.fn();
const trackClicked = vi.fn();
vi.mock('@/lib/education/proFunnelTelemetry', () => ({
  trackTeacherTrialUpgradeCtaViewed: (...a: unknown[]) => trackViewed(...a),
  trackTeacherTrialUpgradeCtaClicked: (...a: unknown[]) => trackClicked(...a),
}));

const goToPolarCheckout = vi.fn();
const postTeacherProCheckout = vi.fn();
vi.mock('@/lib/education/postTeacherProCheckout', () => ({
  postTeacherProCheckout: (...a: unknown[]) => postTeacherProCheckout(...a),
  goToPolarCheckout: (...a: unknown[]) => goToPolarCheckout(...a),
}));

vi.mock('react-hot-toast', () => ({
  default: { error: vi.fn(), success: vi.fn() },
}));

describe('TeacherTrialUpgradeStatus', () => {
  beforeEach(() => {
    accessState.trial = { isExpired: false, daysLeft: 11 };
    accessState.isLoading = false;
    proState.hasPro = false;
    proState.loading = false;
    proState.status = 'active';
    proState.trialUsed = false;
    proState.trialExpires = null;
    trackViewed.mockReset();
    trackClicked.mockReset();
    goToPolarCheckout.mockReset();
    postTeacherProCheckout.mockReset();
  });

  it('shows days remaining and the Upgrade to Teacher Pro CTA', () => {
    render(<TeacherTrialUpgradeStatus />);
    const bar = screen.getByTestId('teacher-trial-upgrade-status');
    expect(bar).toHaveAttribute('data-days', '11');
    expect(screen.getByTestId('teacher-trial-upgrade-status-days')).toHaveTextContent(
      'teacher.plan.trialDaysLeft:11',
    );
    expect(screen.getByTestId('teacher-trial-upgrade-status-cta')).toHaveTextContent(
      'Upgrade to Teacher Pro',
    );
  });

  it('fires viewed with trial_days_remaining', () => {
    render(<TeacherTrialUpgradeStatus />);
    expect(trackViewed).toHaveBeenCalledWith({ trial_days_remaining: 11 });
  });

  it('POSTs Polar trial checkout and tracks clicked', async () => {
    postTeacherProCheckout.mockResolvedValue({ ok: true, url: 'https://polar.sh/c/hq' });
    render(<TeacherTrialUpgradeStatus />);
    fireEvent.click(screen.getByTestId('teacher-trial-upgrade-status-cta'));
    await waitFor(() => {
      expect(postTeacherProCheckout).toHaveBeenCalledTimes(1);
    });
    expect(postTeacherProCheckout).toHaveBeenCalledWith(fetch, { trial: true });
    expect(trackClicked).toHaveBeenCalledWith({ trial_days_remaining: 11 });
    expect(goToPolarCheckout).toHaveBeenCalledWith('https://polar.sh/c/hq');
  });

  it('POSTs paid Polar checkout while a Polar trial is live', async () => {
    proState.hasPro = true;
    proState.status = 'trialing';
    proState.trialUsed = true;
    proState.trialExpires = new Date(Date.now() + 4 * 86400000).toISOString();
    postTeacherProCheckout.mockResolvedValue({ ok: true, url: 'https://polar.sh/c/paid' });
    render(<TeacherTrialUpgradeStatus />);
    const bar = screen.getByTestId('teacher-trial-upgrade-status');
    expect(bar).toHaveAttribute('data-days', '4');
    fireEvent.click(screen.getByTestId('teacher-trial-upgrade-status-cta'));
    await waitFor(() => {
      expect(postTeacherProCheckout).toHaveBeenCalledTimes(1);
    });
    expect(postTeacherProCheckout).toHaveBeenCalledWith(fetch, {});
    expect(goToPolarCheckout).toHaveBeenCalledWith('https://polar.sh/c/paid');
  });

  it('renders nothing when suppressed or for paid Pro', () => {
    const { unmount } = render(<TeacherTrialUpgradeStatus suppressed />);
    expect(screen.queryByTestId('teacher-trial-upgrade-status')).toBeNull();
    unmount();
    proState.hasPro = true;
    proState.status = 'active';
    render(<TeacherTrialUpgradeStatus />);
    expect(screen.queryByTestId('teacher-trial-upgrade-status')).toBeNull();
  });
});
