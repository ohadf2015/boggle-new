import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ProGate } from '../ProGate';

const mockUseTeacherPro = vi.fn();
vi.mock('@/hooks/useTeacherPro', () => ({
  useTeacherPro: () => mockUseTeacherPro(),
}));

const mockStartCheckout = vi.fn();
vi.mock('@/hooks/useTeacherProCheckout', () => ({
  useTeacherProCheckout: () => ({ pending: false, start: mockStartCheckout }),
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
});
