import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ProGate } from '../ProGate';

const mockUseTeacherPro = vi.fn();
vi.mock('@/hooks/useTeacherPro', () => ({
  useTeacherPro: () => mockUseTeacherPro(),
}));

let mockRecap: { games: number; students: number } | null = null;
vi.mock('@/hooks/useTeacherTrialRecap', () => ({ useTeacherTrialRecap: () => mockRecap }));

const mockGateViewed = vi.fn();
const mockPreviewViewed = vi.fn();
const mockPreviewUpgrade = vi.fn();
vi.mock('@/lib/education/proFunnelTelemetry', () => ({
  trackProGateViewed: (...a: unknown[]) => mockGateViewed(...a),
  trackProUpgradeClicked: vi.fn(),
  trackProTrialPreviewViewed: (...a: unknown[]) => mockPreviewViewed(...a),
  trackProTrialPreviewUpgradeClicked: (...a: unknown[]) => mockPreviewUpgrade(...a),
}));

const mockStartCheckout = vi.fn();
vi.mock('@/hooks/useTeacherProCheckout', () => ({
  useTeacherProCheckout: () => ({ pending: false, start: mockStartCheckout }),
}));

const mockStartTrial = vi.fn();
const trialSources: unknown[] = [];
vi.mock('@/hooks/useStartTeacherProTrial', () => ({
  useStartTeacherProTrial: (_t: unknown, _l: unknown, source: unknown) => {
    trialSources.push(source);
    return { pending: false, start: mockStartTrial };
  },
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string, params?: Record<string, string | number>) => {
    // Mock interpolation for the CTA test
    if (key === 'teacher.proGate.cta' && params?.price) {
      return `Unlock this with Pro — {{price}}/month`.replace('{{price}}', String(params.price));
    }
    return key;
  }, language: 'en' }),
}));

const mockTrackGrowthEvent = vi.fn();
vi.mock('@/utils/growthTracking', () => ({
  trackGrowthEvent: (...a: unknown[]) => mockTrackGrowthEvent(...a),
}));

describe('ProGate', () => {
  beforeEach(() => {
    mockTrackGrowthEvent.mockClear();
    mockStartCheckout.mockClear();
    mockStartTrial.mockClear();
    trialSources.length = 0;
    mockRecap = null;
    mockGateViewed.mockClear();
    mockPreviewViewed.mockClear();
    mockPreviewUpgrade.mockClear();
  });

  it('renders the paid surface for a Pro teacher', () => {
    mockUseTeacherPro.mockReturnValue({ hasPro: true, loading: false });
    render(
      <ProGate feature="analytics">
        <div>paid surface</div>
      </ProGate>,
    );
    expect(screen.getByText('paid surface')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.queryByTestId('pro-gate-upgrade-analytics')).not.toBeInTheDocument();
  });

  describe('during a live access trial', () => {
    const inDays = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString();

    it.each(['analytics', 'reports', 'mastery', 'missedPractice', 'pressureDials'] as const)('lets a free teacher use the real %s surface, with a days-left Pro strip', (feature) => {
      mockUseTeacherPro.mockReturnValue({ hasPro: false, loading: false, accessTrialExpires: inDays(9) });
      render(<ProGate feature={feature}><div>paid surface</div></ProGate>);
      expect(screen.getByText('paid surface')).toBeInTheDocument();
      expect(screen.getByTestId('pro-trial-preview')).toBeInTheDocument();
      expect(screen.queryByTestId(`pro-gate-upgrade-${feature}`)).not.toBeInTheDocument();
    });

    it('shows the teacher their own real numbers in the strip, so the trial reads as value they would lose', () => {
      mockRecap = { games: 4, students: 30 };
      mockUseTeacherPro.mockReturnValue({ hasPro: false, loading: false, accessTrialExpires: inDays(5) });
      render(<ProGate feature="analytics"><div>paid surface</div></ProGate>);
      expect(screen.getByTestId('trial-recap')).toBeInTheDocument();
    });

    it('prints no number for a teacher who has run nothing yet', () => {
      mockRecap = { games: 0, students: 30 };
      mockUseTeacherPro.mockReturnValue({ hasPro: false, loading: false, accessTrialExpires: inDays(5) });
      render(<ProGate feature="analytics"><div>paid surface</div></ProGate>);
      expect(screen.queryByTestId('trial-recap')).not.toBeInTheDocument();
    });

    it('counts a preview as a preview, never as a locked-feature hit, so the funnel stays readable', () => {
      mockUseTeacherPro.mockReturnValue({ hasPro: false, loading: false, accessTrialExpires: inDays(6) });
      render(<ProGate feature="reports"><div>paid surface</div></ProGate>);
      expect(mockPreviewViewed).toHaveBeenCalledWith({ feature: 'reports', days_left: 6 });
      expect(mockGateViewed).not.toHaveBeenCalled();
      expect(mockTrackGrowthEvent).not.toHaveBeenCalledWith('iap_viewed', expect.anything());
    });

    it('tapping upgrade in the strip is recorded against the preview, then starts checkout', () => {
      mockUseTeacherPro.mockReturnValue({ hasPro: false, loading: false, accessTrialExpires: inDays(6) });
      render(<ProGate feature="reports"><div>paid surface</div></ProGate>);
      fireEvent.click(screen.getByTestId('pro-trial-preview-upgrade'));
      expect(mockPreviewUpgrade).toHaveBeenCalledWith({ feature: 'reports', days_left: 6 });
      expect(mockStartCheckout).toHaveBeenCalled();
    });

    it('a locked (non-trial) teacher still fires the original gate event', () => {
      mockUseTeacherPro.mockReturnValue({ hasPro: false, loading: false, accessTrialExpires: null });
      render(<ProGate feature="reports"><div>paid surface</div></ProGate>);
      expect(mockGateViewed).toHaveBeenCalledWith({ feature: 'reports' });
      expect(mockPreviewViewed).not.toHaveBeenCalled();
    });

    it('locks again once the window has passed', () => {
      mockUseTeacherPro.mockReturnValue({ hasPro: false, loading: false, accessTrialExpires: inDays(-1) });
      render(<ProGate feature="analytics"><div>paid surface</div></ProGate>);
      expect(screen.queryByText('paid surface')).not.toBeInTheDocument();
    });

    it('a Pro teacher gets the surface with no trial strip', () => {
      mockUseTeacherPro.mockReturnValue({ hasPro: true, loading: false, accessTrialExpires: inDays(9) });
      render(<ProGate feature="analytics"><div>paid surface</div></ProGate>);
      expect(screen.queryByTestId('pro-trial-preview')).not.toBeInTheDocument();
    });

    it('the strip upgrade button starts checkout', () => {
      mockUseTeacherPro.mockReturnValue({ hasPro: false, loading: false, accessTrialExpires: inDays(3) });
      render(<ProGate feature="analytics"><div>paid surface</div></ProGate>);
      fireEvent.click(screen.getByTestId('pro-trial-preview-upgrade'));
      expect(mockStartCheckout).toHaveBeenCalled();
    });
  });

  it('replaces the surface with an upsell for a free teacher', () => {
    mockUseTeacherPro.mockReturnValue({ hasPro: false, loading: false });
    render(
      <ProGate feature="analytics">
        <div>paid surface</div>
      </ProGate>,
    );
    expect(screen.queryByText('paid surface')).not.toBeInTheDocument();
    expect(screen.getByText('teacher.proGate.analytics.title')).toBeInTheDocument();
    expect(screen.getByTestId('pro-gate-upgrade-analytics')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('shows neither the surface nor the upsell while the entitlement is unresolved', () => {
    // Rendering the paid surface first and yanking it away is the flash this repo keeps
    // shipping; rendering the upsell first tells a paying teacher they are not paying.
    mockUseTeacherPro.mockReturnValue({ hasPro: false, loading: true });
    render(
      <ProGate feature="analytics">
        <div>paid surface</div>
      </ProGate>,
    );
    expect(screen.queryByText('paid surface')).not.toBeInTheDocument();
    expect(screen.queryByText('teacher.proGate.analytics.title')).not.toBeInTheDocument();
  });

  it('tracks the upsell impression so conversion is measurable', () => {
    mockUseTeacherPro.mockReturnValue({ hasPro: false, loading: false });
    render(
      <ProGate feature="analytics">
        <div>paid surface</div>
      </ProGate>,
    );
    expect(mockTrackGrowthEvent).toHaveBeenCalledWith('iap_viewed', {
      source: 'pro_gate_analytics',
    });
  });

  it('Given a gate inside a closed drawer, When it mounts, Then no impression fires until it is shown', () => {
    // A closed <details> still renders its children, so the impression used to
    // fire for teachers who never opened the Tools drawer.
    mockUseTeacherPro.mockReturnValue({ hasPro: false, loading: false });
    const { rerender } = render(
      <ProGate feature="analytics" active={false}>
        <div>paid surface</div>
      </ProGate>,
    );
    expect(mockTrackGrowthEvent).not.toHaveBeenCalled();

    rerender(
      <ProGate feature="analytics" active>
        <div>paid surface</div>
      </ProGate>,
    );
    expect(mockTrackGrowthEvent).toHaveBeenCalledWith('iap_viewed', { source: 'pro_gate_analytics' });
  });

  it('does not fire an impression for a Pro teacher', () => {
    mockUseTeacherPro.mockReturnValue({ hasPro: true, loading: false });
    render(
      <ProGate feature="analytics">
        <div>paid surface</div>
      </ProGate>,
    );
    expect(mockTrackGrowthEvent).not.toHaveBeenCalled();
  });

  it('RED: CTA link renders with dollar sign and price (currently fails due to translation bug)', () => {
    // The ProGate unlock CTA should render "Unlock this with Pro — $9/month"
    // This test will pass once we fix the translation to use {{price}} instead of ${{price}}
    // and update ProGate to pass price with the $ sign included
    mockUseTeacherPro.mockReturnValue({ hasPro: false, loading: false });

    render(
      <ProGate feature="analytics">
        <div>paid surface</div>
      </ProGate>,
    );

    const cta = screen.getByTestId('pro-gate-upgrade-analytics');
    expect(cta).toBeInTheDocument();
    // After the fix, this will pass because price="$9" will be passed to t()
    expect(cta.textContent).toMatch(/\$\d+\/month/);
  });

  it('POSTs Polar checkout via the shared till when a free teacher taps Upgrade', () => {
    mockUseTeacherPro.mockReturnValue({ hasPro: false, loading: false });
    render(
      <ProGate feature="reports">
        <div>paid surface</div>
      </ProGate>,
    );
    fireEvent.click(screen.getByTestId('pro-gate-upgrade-reports'));
    expect(mockStartCheckout).toHaveBeenCalledTimes(1);
    expect(mockTrackGrowthEvent).toHaveBeenCalledWith('landing_cta_clicked', {
      cta: 'pro_gate_reports',
    });
  });

  describe('inside the native app', () => {
    afterEach(() => {
      delete (globalThis as { Capacitor?: unknown }).Capacitor;
    });

    it('shows the locked surface without a purchase button, saying Pro is not sold in the app', async () => {
      (globalThis as { Capacitor?: unknown }).Capacitor = { isNativePlatform: () => true };
      mockUseTeacherPro.mockReturnValue({ hasPro: false, loading: false });
      render(<ProGate feature="analytics"><div>paid surface</div></ProGate>);
      expect(await screen.findByTestId('pro-gate-not-in-app')).toHaveTextContent('teacher.subscription.notInApp');
      expect(screen.queryByTestId('pro-gate-upgrade-analytics')).not.toBeInTheDocument();
    });

    it('drops the trial strip upgrade button too', async () => {
      (globalThis as { Capacitor?: unknown }).Capacitor = { isNativePlatform: () => true };
      mockUseTeacherPro.mockReturnValue({ hasPro: false, loading: false, accessTrialExpires: new Date(Date.now() + 5 * 86_400_000).toISOString() });
      render(<ProGate feature="reports"><div>paid surface</div></ProGate>);
      await screen.findByText('paid surface');
      await Promise.resolve();
      expect(screen.queryByTestId('pro-trial-preview-upgrade')).not.toBeInTheDocument();
    });
  });

  describe('as a whole-page gate', () => {
    const inDays = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString();

    it('labels the lock as Pro, names the page, and uses the page CTA', () => {
      mockUseTeacherPro.mockReturnValue({ hasPro: false, loading: false, accessTrialExpires: null });
      render(
        <ProGate feature="reports" ctaKey="teacher.proGate.reports.cta" lockedTitle={<h1>Reports</h1>}>
          <div>paid surface</div>
        </ProGate>,
      );
      expect(screen.getByTestId('pro-gate-pill')).toHaveTextContent('teacher.subscription.proPlanName');
      expect(screen.getByRole('heading', { level: 1, name: 'Reports' })).toBeInTheDocument();
      expect(screen.getByTestId('pro-gate-upgrade-reports')).toHaveTextContent('teacher.proGate.reports.cta');
      expect(screen.getAllByRole('button')).toHaveLength(1);
      expect(screen.queryByText('paid surface')).not.toBeInTheDocument();
    });

    it('shows no title or lock while the entitlement resolves', () => {
      mockUseTeacherPro.mockReturnValue({ hasPro: false, loading: true });
      render(<ProGate feature="reports" lockedTitle={<h1>Reports</h1>}><div>paid surface</div></ProGate>);
      expect(screen.queryByRole('heading')).not.toBeInTheDocument();
      expect(screen.queryByTestId('pro-gate-preview')).not.toBeInTheDocument();
    });

    const free = { hasPro: false, loading: false, accessTrialExpires: null, known: true, status: 'active', source: 'polar' };
    const lock = (state: Record<string, unknown>, offer = true) => {
      mockUseTeacherPro.mockReturnValue(state);
      render(
        <ProGate feature="reports" ctaKey="teacher.proGate.reports.cta" polarTrialPlacement={offer ? 'reports_teaser' : undefined}>
          <div>paid surface</div>
        </ProGate>,
      );
      expect(screen.getAllByRole('button')).toHaveLength(1);
      expect(screen.getByTestId('pro-gate-pill')).toBeInTheDocument();
      return screen.getByTestId('pro-gate-upgrade-reports');
    };

    it('offers a never-trialed teacher the Polar trial as the one action', () => {
      const cta = lock({ ...free, trialUsed: false });
      expect(cta).toHaveTextContent('eduPlans.reports.trialCta');
      expect(screen.getByText('eduPlans.reports.trialFine')).toBeInTheDocument();
      fireEvent.click(cta);
      expect(mockStartTrial).toHaveBeenCalledTimes(1);
      expect(mockStartCheckout).not.toHaveBeenCalled();
      expect(trialSources).toContain('reports_teaser');
    });

    it('sends a teacher who already used the Polar trial to the paid checkout', () => {
      const cta = lock({ ...free, trialUsed: true });
      expect(cta).toHaveTextContent('teacher.proGate.reports.cta');
      fireEvent.click(cta);
      expect(mockStartCheckout).toHaveBeenCalledTimes(1);
      expect(mockStartTrial).not.toHaveBeenCalled();
    });

    it('sends a teacher whose Polar trial expired to the paid checkout', () => {
      const cta = lock({ ...free, status: 'canceled', trialUsed: true, accessTrialExpires: new Date(Date.now() - 86_400_000).toISOString() });
      expect(cta).toHaveTextContent('teacher.proGate.reports.cta');
      expect(screen.queryByText('eduPlans.reports.trialCta')).not.toBeInTheDocument();
    });

    it('does not guess trial eligibility when the plan read is unknown', () => {
      expect(lock({ ...free, known: false, trialUsed: false })).toHaveTextContent('teacher.proGate.reports.cta');
    });

    it('keeps the paid CTA on a gate that offers no trial', () => {
      expect(lock({ ...free, trialUsed: false }, false)).toHaveTextContent('teacher.proGate.reports.cta');
    });

    it('lets a gate nested inside an open gate pass straight through, so a trial teacher sees one strip', () => {
      mockUseTeacherPro.mockReturnValue({ hasPro: false, loading: false, accessTrialExpires: inDays(9) });
      render(
        <ProGate feature="reports">
          <ProGate feature="reports"><div>inner</div></ProGate>
          <ProGate feature="mastery"><div>inner 2</div></ProGate>
        </ProGate>,
      );
      expect(screen.getAllByTestId('pro-trial-preview')).toHaveLength(1);
      expect(screen.getByText('inner')).toBeInTheDocument();
      expect(screen.getByText('inner 2')).toBeInTheDocument();
    });
  });
});
