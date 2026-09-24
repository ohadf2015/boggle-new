import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import HomePageClient from '@/app/[locale]/PageClient';

let landingProps: { onStartOnboarding?: () => void } = {};
const captureLanding = (props: { onStartOnboarding?: () => void }) => {
  landingProps = props;
  return <div data-testid="landing-view" />;
};

vi.mock('@/components/landing', () => ({
  LandingView: (props: { onStartOnboarding?: () => void }) => captureLanding(props),
}));

vi.mock('next/dynamic', () => ({ default: () => () => <div data-testid="onboarding-flow" /> }));

const mockPathname = vi.fn(() => '/en');
vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

describe('HomePageClient route allowlist guard', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    landingProps = {};
    Object.defineProperty(window, 'location', {
      value: { search: '', pathname: '/en', origin: 'http://localhost' },
      writable: true,
    });
  });

  // INTENT CHANGE (homepage gauntlet SPEC §8, lead override 2026-09-23): the
  // FTUE no longer auto-mounts for a plain new user; the locale homepage instead
  // provides the onStartOnboarding CTA, which mounts it.
  it('mounts OnboardingFlow on locale homepage for a new user via the onStartOnboarding CTA', () => {
    mockPathname.mockReturnValue('/en');
    const { getByTestId, queryByTestId } = render(<HomePageClient />);
    expect(queryByTestId('onboarding-flow')).toBeNull();
    expect(landingProps.onStartOnboarding).toBeDefined();
    act(() => landingProps.onStartOnboarding?.());
    expect(getByTestId('onboarding-flow')).toBeTruthy();
    // LandingView stays mounted beneath the FTUE overlay (CLS fix 2026-07-29).
    expect(getByTestId('landing-view')).toBeTruthy();
  });

  it('hides onStartOnboarding CTA on blog route', () => {
    mockPathname.mockReturnValue('/en/blog/best-boggle-alternatives-2026');
    render(<HomePageClient />);
    expect(landingProps.onStartOnboarding).toBeUndefined();
  });

  it('hides onStartOnboarding CTA on word-of-the-day SEO route', () => {
    mockPathname.mockReturnValue('/en/word-of-the-day');
    render(<HomePageClient />);
    expect(landingProps.onStartOnboarding).toBeUndefined();
  });

  it('hides onStartOnboarding CTA on multiplayer deep link', () => {
    mockPathname.mockReturnValue('/he/multiplayer');
    render(<HomePageClient />);
    expect(landingProps.onStartOnboarding).toBeUndefined();
  });
});
