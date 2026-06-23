/**
 * WordWheelReplayCta — anti-bounce "play unlimited practice wheels" CTA for the
 * Word Wheel already-played dead-end (experiment wheel-replay-cta-v1).
 *
 * Renders only in the 'practice-cta' variant. Links to the practice wheel
 * (/<locale>/daily/word-wheel?practice=1) and fires exposure + a click event so
 * the nightly job can read practice game_started conversion.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import WordWheelReplayCta from '../WordWheelReplayCta';

const mockVariant = vi.fn<() => string>(() => 'practice-cta');
const mockTrackExposure = vi.fn();

vi.mock('@/hooks/useExperiment', () => ({
  useExperiment: (key: string) => ({ variant: mockVariant(), trackExposure: mockTrackExposure, _key: key }),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en' }),
}));

vi.mock('framer-motion', () => ({
  m: { div: ({ children, ...p }: React.PropsWithChildren<Record<string, unknown>>) => <div {...p}>{children}</div> },
}));

vi.mock('next/link', () => ({
  default: ({ children, href, ...rest }: React.PropsWithChildren<{ href: string }>) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

const mockTrackGrowthEvent = vi.fn();
vi.mock('@/utils/growthTracking', () => ({
  trackGrowthEvent: (...args: unknown[]) => mockTrackGrowthEvent(...args),
}));

describe('WordWheelReplayCta', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVariant.mockReturnValue('practice-cta');
  });

  it('renders nothing in the control variant but STILL fires exposure (control denominator)', () => {
    mockVariant.mockReturnValue('control');
    const { container } = render(<WordWheelReplayCta />);
    expect(container).toBeEmptyDOMElement();
    // Exposure must fire in control too, else PostHog has no baseline to compare.
    expect(mockTrackExposure).toHaveBeenCalled();
  });

  it('renders the practice CTA and fires exposure in the practice-cta variant', () => {
    render(<WordWheelReplayCta />);
    const link = screen.getByTestId('wheel-replay-cta');
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/en/daily/word-wheel?practice=1');
    expect(mockTrackExposure).toHaveBeenCalled();
  });

  it('uses calm secondary styling — no saturated full-fill or heavy shadow', () => {
    render(<WordWheelReplayCta />);
    const cls = screen.getByTestId('wheel-replay-cta').className;
    expect(cls).toContain('bg-neo-navy-light');
    expect(cls).not.toMatch(/bg-neo-purple\b/);
    expect(cls).not.toContain('shadow-hard-lg');
  });

  it('fires wheel_practice_cta_clicked when tapped', () => {
    render(<WordWheelReplayCta />);
    fireEvent.click(screen.getByTestId('wheel-replay-cta'));
    expect(mockTrackGrowthEvent).toHaveBeenCalledWith(
      'wheel_practice_cta_clicked',
      expect.objectContaining({ variant: 'practice-cta' }),
    );
  });
});
