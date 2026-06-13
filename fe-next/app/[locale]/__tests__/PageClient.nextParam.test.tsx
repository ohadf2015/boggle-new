/**
 * HomePageClient — `?next=` round-trip from a gated play surface.
 *
 * Flow under test: a first-time user lands on /practice, useFTUEGate
 * redirects to /{locale}?next=%2Fpractice, HomePageClient must:
 *   1. Auto-open OnboardingFlow (no "Start Playing" CTA tap required).
 *   2. On FTUE completion, router.push back to the original `next` path.
 */
import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import HomePageClient from '@/app/[locale]/PageClient';

const pushMock = vi.fn();
const replaceMock = vi.fn();

// LandingView stub — exposes a flag we can assert against.
vi.mock('@/components/landing', () => ({
  LandingView: () => <div data-testid="landing-view" />,
}));

// OnboardingFlow stub that exposes onComplete via a button so the test can
// simulate FTUE completion without booting the full flow.
vi.mock('next/dynamic', () => ({
  default: () => {
    const Stub = ({ onComplete }: { onComplete: () => void }) => (
      <div data-testid="onboarding-flow">
        <button data-testid="onboarding-complete" onClick={onComplete}>
          done
        </button>
      </div>
    );
    return Stub;
  },
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/en',
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
}));

vi.mock('@/components/CrazyGamesSDK', () => ({
  detectCrazyGamesSync: () => false,
}));

describe('HomePageClient ?next= round-trip', () => {
  beforeEach(() => {
    pushMock.mockClear();
    replaceMock.mockClear();
    localStorage.clear();
    sessionStorage.clear();
    Object.defineProperty(window, 'location', {
      value: { search: '?next=%2Fen%2Fpractice', pathname: '/en', origin: 'http://localhost' },
      writable: true,
    });
  });

  it('auto-opens FTUE when ?next= is present and onboarding is not completed', () => {
    render(<HomePageClient />);
    expect(screen.getByTestId('onboarding-flow')).toBeInTheDocument();
    expect(screen.queryByTestId('landing-view')).not.toBeInTheDocument();
  });

  it('navigates to the decoded next path when FTUE completes', () => {
    render(<HomePageClient />);
    fireEvent.click(screen.getByTestId('onboarding-complete'));
    expect(pushMock).toHaveBeenCalledWith('/en/practice');
  });

  it('rejects protocol-relative `next=//evil.com` (no open redirect on FTUE complete)', () => {
    Object.defineProperty(window, 'location', {
      value: { search: '?next=%2F%2Fevil.com', pathname: '/en', origin: 'http://localhost' },
      writable: true,
    });
    localStorage.clear();
    render(<HomePageClient />);
    // New user still auto-opens the FTUE — but the malicious next is dropped, so
    // finishing onboarding routes to the safe default, never to //evil.com.
    expect(screen.getByTestId('onboarding-flow')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('onboarding-complete'));
    // The malicious next was dropped → no redirect uses it.
    expect(pushMock).not.toHaveBeenCalledWith(expect.stringContaining('evil.com'));
  });
});
