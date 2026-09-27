import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const replaceMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock, push: vi.fn() }),
}));

import { useFTUEGate } from '../useFTUEGate';

function Probe({ locale, next }: { locale: string; next: string }) {
  useFTUEGate(locale, next);
  return <div data-testid="probe" />;
}

describe('useFTUEGate', () => {
  beforeEach(() => {
    replaceMock.mockClear();
    window.localStorage.clear();
  });
  afterEach(() => {
    window.localStorage.clear();
  });

  it('does not redirect when onboarding completed', () => {
    window.localStorage.setItem('lexiclash_onboarding_completed', 'true');
    render(<Probe locale="en" next="/en/practice" />);
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it('does not redirect when onboarding skipped', () => {
    window.localStorage.setItem('lexiclash_onboarding_completed', 'skipped');
    render(<Probe locale="en" next="/en/practice" />);
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it('redirects to /{locale}?next=<encoded path> when no FTUE/session', () => {
    render(<Probe locale="he" next="/he/practice/classic" />);
    expect(replaceMock).toHaveBeenCalledWith('/he?next=%2Fhe%2Fpractice%2Fclassic');
  });

  it('does not redirect when a live supabase auth-token is present', () => {
    window.localStorage.setItem(
      'sb-test-auth-token',
      JSON.stringify({ access_token: 'tok', refresh_token: 'r' }),
    );
    render(<Probe locale="en" next="/en/practice" />);
    expect(replaceMock).not.toHaveBeenCalled();
  });
});
