import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ProGate } from '../ProGate';

const mockUseTeacherPro = vi.fn();
vi.mock('@/hooks/useTeacherPro', () => ({
  useTeacherPro: () => mockUseTeacherPro(),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en' }),
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

  it('does not fire an impression for a Pro teacher', () => {
    mockUseTeacherPro.mockReturnValue({ hasPro: true, loading: false });
    render(
      <ProGate feature="analytics">
        <div>paid surface</div>
      </ProGate>,
    );
    expect(mockTrackGrowthEvent).not.toHaveBeenCalled();
  });
});
