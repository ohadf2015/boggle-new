import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ProGate } from '../ProGate';

const mockUseTeacherPro = vi.fn();
vi.mock('@/hooks/useTeacherPro', () => ({
  useTeacherPro: () => mockUseTeacherPro(),
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
    expect(screen.getByRole('link')).toHaveAttribute('href', '/en/teacher/upgrade');
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

    const link = screen.getByRole('link');
    expect(link).toBeInTheDocument();
    // After the fix, this will pass because price="$9" will be passed to t()
    expect(link.textContent).toMatch(/\$\d+\/month/);
  });
});
