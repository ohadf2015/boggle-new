import { render, screen, fireEvent } from '@testing-library/react';
import { LandingBottomCTA } from '../LandingBottomCTA';
import { LanguageProvider } from '@/contexts/LanguageContext';

const success = vi.fn();
vi.mock('@/utils/haptics', () => ({
  haptics: { success: () => success() },
}));

const trackLandingCtaClick = vi.fn();
vi.mock('@/utils/growthTracking', () => ({
  trackLandingCtaClick: (...args: unknown[]) => trackLandingCtaClick(...args),
}));

vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...p }: any) => <div {...p}>{children}</div>,
    button: ({ children, ...p }: any) => <button {...p}>{children}</button>,
  },
}));

describe('LandingBottomCTA haptics', () => {
  beforeEach(() => {
    success.mockClear();
    trackLandingCtaClick.mockClear();
  });

  it('fires haptics.success on Play CTA click', () => {
    const onPlay = vi.fn();
    render(
      <LanguageProvider>
        <LandingBottomCTA onPlayClick={onPlay} />
      </LanguageProvider>
    );
    fireEvent.click(screen.getByRole('button'));
    expect(success).toHaveBeenCalledTimes(1);
    expect(onPlay).toHaveBeenCalledTimes(1);
  });

  // The bottom CTA leads into onboarding, so it must be instrumented to diagnose
  // the visitor → onboarding_started funnel leak (88/95 visitors drop pre-onboarding).
  it('tracks the landing CTA click with a stable surface id', () => {
    render(
      <LanguageProvider>
        <LandingBottomCTA onPlayClick={vi.fn()} />
      </LanguageProvider>
    );
    fireEvent.click(screen.getByRole('button'));
    expect(trackLandingCtaClick).toHaveBeenCalledWith('bottom_cta');
  });
});
